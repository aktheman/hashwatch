import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';
import { query } from '../db';

export const teamRouter = Router();

const MAX_TEAMS = 200;
const MAX_MEMBERSHIPS = 2000;
const MAX_INVITATIONS = 500;
const MAX_TEAMS_PER_USER = 20;

interface TeamRow {
  id: string;
  name: string;
  ownerid: string;
  createdat: Date;
}

interface MembershipRow {
  teamid: string;
  userid: string;
  role: string;
  joinedat: Date;
}

interface InvitationRow {
  id: string;
  teamid: string;
  email: string;
  role: string;
  invitedby: string;
  status: string;
  createdat: Date;
}

function toEpochMs(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime();
}

function mapMembership(row: MembershipRow) {
  return {
    id: `${row.teamid}:${row.userid}`,
    teamId: row.teamid,
    userId: row.userid,
    role: row.role,
    joinedAt: toEpochMs(row.joinedat),
  };
}

function mapInvitation(row: InvitationRow) {
  return {
    id: row.id,
    teamId: row.teamid,
    email: row.email,
    role: row.role,
    invitedBy: row.invitedby,
    status: row.status,
    createdAt: toEpochMs(row.createdat),
  };
}

async function getMembership(teamId: string, userId: string): Promise<MembershipRow | undefined> {
  const result = await query(
    'SELECT teamId, userId, role, joinedAt FROM team_members WHERE teamId = $1 AND userId = $2',
    [teamId, userId],
  );
  return result.rows[0] as MembershipRow | undefined;
}

teamRouter.use(authMiddleware);

teamRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const countResult = await query('SELECT COUNT(*)::int AS count FROM teams');
    if ((countResult.rows[0] as { count: number }).count >= MAX_TEAMS) {
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
    const userTeamCount = await query(
      `SELECT COUNT(*)::int AS count
       FROM team_members tm
       JOIN teams t ON t.id = tm.teamId
       WHERE tm.userId = $1`,
      [userId],
    );
    if ((userTeamCount.rows[0] as { count: number }).count >= MAX_TEAMS_PER_USER) {
      return res.status(400).json({ error: 'You have reached the maximum number of teams' });
    }

    const teamResult = await query(
      'INSERT INTO teams (name, ownerId) VALUES ($1, $2) RETURNING id, name, ownerId, createdAt',
      [name.trim(), userId],
    );
    const teamRow = teamResult.rows[0] as TeamRow;
    const team = {
      id: teamRow.id,
      name: teamRow.name,
      ownerId: teamRow.ownerid,
      createdAt: toEpochMs(teamRow.createdat),
    };

    const membershipResult = await query(
      `INSERT INTO team_members (teamId, userId, role)
       VALUES ($1, $2, 'owner')
       RETURNING teamId, userId, role, joinedAt`,
      [team.id, userId],
    );
    const membership = mapMembership(membershipResult.rows[0] as MembershipRow);

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
    const teamResult = await query(
      `SELECT t.id, t.name, t.ownerId, t.createdAt,
              (SELECT COUNT(*)::int FROM team_members mc WHERE mc.teamId = t.id) AS memberCount
       FROM team_members tm
       JOIN teams t ON t.id = tm.teamId
       WHERE tm.userId = $1
       ORDER BY t.createdAt DESC`,
      [userId],
    );
    const membershipMap = await query(
      'SELECT teamId, userId, role FROM team_members WHERE userId = $1',
      [userId],
    );
    const roleByTeam = new Map<string, string>();
    for (const row of membershipMap.rows as MembershipRow[]) {
      roleByTeam.set(row.teamid, row.role);
    }

    const teams = (teamResult.rows as Array<TeamRow & { membercount: number }>).map((t) => ({
      id: t.id,
      name: t.name,
      ownerId: t.ownerid,
      memberCount: t.membercount,
      role: roleByTeam.get(t.id) ?? 'viewer',
      createdAt: toEpochMs(t.createdat),
    }));

    const inviteResult = await query(
      `SELECT id, teamId, email, role, invitedBy, status, createdAt
       FROM team_invitations
       WHERE email = $1 AND status = 'pending'`,
      [req.userEmail],
    );
    const invitations = (inviteResult.rows as InvitationRow[]).map(mapInvitation);

    res.json({ teams, invitations });
  } catch (err: unknown) {
    log.error('Error listing teams:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamRouter.post('/:id/invite', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.id as string;
    const userId = req.userId as string;
    const membership = await getMembership(teamId, userId);

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

    const acceptedMember = await query(
      `SELECT u.id
       FROM team_members tm
       JOIN users u ON u.id = tm.userId
       WHERE tm.teamId = $1 AND u.email = $2
       LIMIT 1`,
      [teamId, email],
    );
    if (acceptedMember.rows.length > 0) {
      return res.status(409).json({ error: 'User is already a member of this team' });
    }

    const pendingInvite = await query(
      `SELECT id FROM team_invitations
       WHERE teamId = $1 AND email = $2 AND status = 'pending'
       LIMIT 1`,
      [teamId, email],
    );
    if (pendingInvite.rows.length > 0) {
      return res.status(409).json({ error: 'Invitation already pending for this email' });
    }

    const inviteCount = await query('SELECT COUNT(*)::int AS count FROM team_invitations');
    if ((inviteCount.rows[0] as { count: number }).count >= MAX_INVITATIONS) {
      return res.status(400).json({ error: 'Invitation limit reached' });
    }

    const result = await query(
      `INSERT INTO team_invitations (teamId, email, role, invitedBy)
       VALUES ($1, $2, $3, $4)
       RETURNING id, teamId, email, role, invitedBy, status, createdAt`,
      [teamId, email, role, userId],
    );
    const invitation = mapInvitation(result.rows[0] as InvitationRow);

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

    const pendingInvite = await query(
      `SELECT id, teamId, role, email FROM team_invitations
       WHERE teamId = $1 AND email = $2 AND status = 'pending'
       LIMIT 1`,
      [teamId, req.userEmail],
    );
    if (pendingInvite.rows.length === 0) {
      return res.status(404).json({ error: 'No pending invitation found' });
    }

    const memberCount = await query('SELECT COUNT(*)::int AS count FROM team_members');
    if ((memberCount.rows[0] as { count: number }).count >= MAX_MEMBERSHIPS) {
      return res.status(400).json({ error: 'Membership limit reached' });
    }

    const role = (pendingInvite.rows[0] as { role: string }).role;
    await query(
      `INSERT INTO team_members (teamId, userId, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (teamId, userId) DO UPDATE SET role = EXCLUDED.role`,
      [teamId, userId, role],
    );
    await query(`UPDATE team_invitations SET status = 'accepted' WHERE id = $1`, [
      (pendingInvite.rows[0] as { id: string }).id,
    ]);

    const membership = mapMembership({
      teamid: teamId,
      userid: userId,
      role,
      joinedat: new Date(),
    });

    const teamResult = await query('SELECT id, name, ownerId, createdAt FROM teams WHERE id = $1', [
      teamId,
    ]);
    const teamRow = teamResult.rows[0] as TeamRow | undefined;
    const team = teamRow
      ? {
          id: teamRow.id,
          name: teamRow.name,
          ownerId: teamRow.ownerid,
          createdAt: toEpochMs(teamRow.createdat),
        }
      : undefined;

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
    const membership = await getMembership(teamId, userId);

    if (!membership) {
      return res.status(404).json({ error: 'Team not found or not a member' });
    }

    const memberResult = await query('SELECT userId FROM team_members WHERE teamId = $1', [teamId]);
    const memberIds = (memberResult.rows as Array<{ userid: string }>).map((r) => r.userid);

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
    const membership = await getMembership(teamId, userId);

    if (!membership) {
      return res.status(404).json({ error: 'Team not found or not a member' });
    }
    if (membership.role === 'owner') {
      return res
        .status(400)
        .json({ error: 'Owners cannot leave their team. Transfer ownership or delete the team.' });
    }

    await query('DELETE FROM team_members WHERE teamId = $1 AND userId = $2', [teamId, userId]);

    log.info('User', userId, 'left team:', teamId);
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error leaving team:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
