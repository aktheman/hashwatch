import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

export const teamRouter = Router();

interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
}

interface Membership {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'viewer';
  joinedAt: number;
}

interface Invitation {
  id: string;
  teamId: string;
  email: string;
  role: 'admin' | 'viewer';
  invitedBy: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'declined';
}

const teams: Team[] = [];
const memberships: Membership[] = [];
const invitations: Invitation[] = [];

const MAX_TEAMS = 200;
const MAX_MEMBERSHIPS = 2000;
const MAX_INVITATIONS = 500;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getUserMembership(teamId: string, userId: string): Membership | undefined {
  return memberships.find((m) => m.teamId === teamId && m.userId === userId);
}

function getTeamMemberCount(teamId: string): number {
  return memberships.filter((m) => m.teamId === teamId).length;
}

teamRouter.use(authMiddleware);

teamRouter.post('/', async (req: AuthRequest, res) => {
  try {
    if (teams.length >= MAX_TEAMS) {
      return res.status(400).json({ error: 'Team limit reached' });
    }
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    if (name.length > 50) {
      return res.status(400).json({ error: 'Team name must be 50 characters or less' });
    }

    const userId = req.userId as string;
    const userTeamCount = teams.filter((t) =>
      memberships.some((m) => m.teamId === t.id && m.userId === userId),
    ).length;
    if (userTeamCount >= 20) {
      return res.status(400).json({ error: 'You have reached the maximum number of teams' });
    }

    const team: Team = {
      id: generateId(),
      name: name.trim(),
      ownerId: userId,
      createdAt: Date.now(),
    };
    teams.push(team);

    const membership: Membership = {
      id: generateId(),
      teamId: team.id,
      userId,
      role: 'owner',
      joinedAt: Date.now(),
    };
    memberships.push(membership);

    log.info('Team created:', team.id, 'by user:', userId);
    res.status(201).json({ team, membership });
  } catch (err: unknown) {
    log.error('Error creating team:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as string;
    const userMemberships = memberships.filter((m) => m.userId === userId);
    const teamIds = new Set(userMemberships.map((m) => m.teamId));
    const userTeams = teams
      .filter((t) => teamIds.has(t.id))
      .map((t) => ({
        ...t,
        memberCount: getTeamMemberCount(t.id),
        role: userMemberships.find((m) => m.teamId === t.id)?.role,
      }));

    const pendingInvites = invitations.filter(
      (inv) => inv.email === req.userId && inv.status === 'pending',
    );

    res.json({ teams: userTeams, invitations: pendingInvites });
  } catch (err: unknown) {
    log.error('Error listing teams:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamRouter.post('/:id/invite', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.id as string;
    const userId = req.userId as string;
    const membership = getUserMembership(teamId, userId);

    if (!membership) {
      return res.status(404).json({ error: 'Team not found' });
    }
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can invite members' });
    }

    const { email, role } = req.body;
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (role !== 'viewer' && role !== 'admin') {
      return res.status(400).json({ error: 'Role must be "viewer" or "admin"' });
    }

    const existingMember = memberships.find((m) => m.teamId === teamId && m.userId === email);
    if (existingMember) {
      return res.status(409).json({ error: 'User is already a member of this team' });
    }

    const pendingInvite = invitations.find(
      (inv) => inv.teamId === teamId && inv.email === email && inv.status === 'pending',
    );
    if (pendingInvite) {
      return res.status(409).json({ error: 'Invitation already pending for this email' });
    }

    if (invitations.length >= MAX_INVITATIONS) {
      return res.status(400).json({ error: 'Invitation limit reached' });
    }

    const invitation: Invitation = {
      id: generateId(),
      teamId,
      email,
      role,
      invitedBy: userId,
      createdAt: Date.now(),
      status: 'pending',
    };
    invitations.push(invitation);

    log.info('Invitation sent to:', email, 'for team:', teamId);
    res.status(201).json({ invitation });
  } catch (err: unknown) {
    log.error('Error inviting to team:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamRouter.post('/:id/accept', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.id as string;
    const userId = req.userId as string;

    const pendingInvite = invitations.find(
      (inv) => inv.teamId === teamId && inv.status === 'pending' && inv.email === userId,
    );
    if (!pendingInvite) {
      return res.status(404).json({ error: 'No pending invitation found' });
    }

    if (memberships.length >= MAX_MEMBERSHIPS) {
      return res.status(400).json({ error: 'Membership limit reached' });
    }

    pendingInvite.status = 'accepted';

    const membership: Membership = {
      id: generateId(),
      teamId,
      userId,
      role: pendingInvite.role,
      joinedAt: Date.now(),
    };
    memberships.push(membership);

    const team = teams.find((t) => t.id === teamId);
    log.info('User', userId, 'accepted invitation to team:', teamId);
    res.json({ membership, team });
  } catch (err: unknown) {
    log.error('Error accepting invitation:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamRouter.get('/:id/miners', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.id as string;
    const userId = req.userId as string;
    const membership = getUserMembership(teamId, userId);

    if (!membership) {
      return res.status(404).json({ error: 'Team not found or not a member' });
    }

    const memberIds = memberships.filter((m) => m.teamId === teamId).map((m) => m.userId);

    res.json({ miners: [], memberIds });
  } catch (err: unknown) {
    log.error('Error listing team miners:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamRouter.delete('/:id/leave', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.id as string;
    const userId = req.userId as string;
    const membership = getUserMembership(teamId, userId);

    if (!membership) {
      return res.status(404).json({ error: 'Team not found or not a member' });
    }
    if (membership.role === 'owner') {
      return res
        .status(400)
        .json({ error: 'Owners cannot leave their team. Transfer ownership or delete the team.' });
    }

    const idx = memberships.findIndex((m) => m.teamId === teamId && m.userId === userId);
    if (idx !== -1) {
      memberships.splice(idx, 1);
    }

    log.info('User', userId, 'left team:', teamId);
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error leaving team:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
