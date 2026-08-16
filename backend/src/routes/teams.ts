import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';
import { query } from '../db';
import { recordActivity } from '../services/activityFeed';
import {
  notifyTeamInvite,
  notifyTeamJoin,
  notifyTeamLeave,
  notifyTeamMinerShared,
  notifyTeamMinerUnshared,
  notifyOwnerMinerShared,
  notifyOwnerMinerUnshared,
} from '../services/teamNotifications';

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

export async function getMembership(
  teamId: string,
  userId: string,
): Promise<MembershipRow | undefined> {
  const result = await query(
    'SELECT teamId, userId, role, joinedAt FROM team_members WHERE teamId = $1 AND userId = $2',
    [teamId, userId],
  );
  return result.rows[0] as MembershipRow | undefined;
}

async function getTeamName(teamId: string): Promise<string> {
  const result = await query('SELECT name FROM teams WHERE id = $1', [teamId]);
  return (result.rows[0] as { name?: string } | undefined)?.name ?? 'Team';
}

async function getMinerName(minerId: string): Promise<string> {
  const result = await query('SELECT name FROM miners WHERE id = $1', [minerId]);
  return (result.rows[0] as { name?: string } | undefined)?.name ?? 'a miner';
}

async function getTeamAdmins(teamId: string, excludeUserId?: string): Promise<string[]> {
  const result = await query(
    `SELECT userId FROM team_members
     WHERE teamId = $1 AND role IN ('owner', 'admin') AND userId <> $2`,
    [teamId, excludeUserId ?? ''],
  );
  return (result.rows as Array<{ userid: string }>).map((r) => r.userid);
}

async function getTeamMemberIds(teamId: string, excludeUserId?: string): Promise<string[]> {
  const result = await query('SELECT userId FROM team_members WHERE teamId = $1 AND userId <> $2', [
    teamId,
    excludeUserId ?? '',
  ]);
  return (result.rows as Array<{ userid: string }>).map((r) => r.userid);
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

    const teamName = await getTeamName(teamId);
    const invitee = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (invitee.rows.length > 0) {
      const inviteeId = (invitee.rows[0] as { id: string }).id;
      await notifyTeamInvite(teamId, inviteeId, teamName, req.userEmail as string);
      recordActivity(inviteeId, {
        type: 'team_invite',
        title: `You were invited to join ${teamName}`,
        severity: 'info',
        metadata: { teamId },
      });
    }

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
    recordActivity(userId, {
      type: 'team_member_joined',
      title: `You joined team ${team?.name ?? teamId}`,
      severity: 'success',
      metadata: { teamId },
    });
    if (team?.name) {
      const adminIds = await getTeamAdmins(teamId, userId);
      await notifyTeamJoin(teamId, adminIds, team.name, req.userEmail as string);
      for (const adminId of adminIds) {
        recordActivity(adminId, {
          type: 'team_member_joined',
          title: `${req.userEmail} joined your team ${team.name}`,
          severity: 'info',
          metadata: { teamId },
        });
      }
    }
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

    const minerResult = await query(
      `SELECT m.id, m.name, m.ip, m.userId AS "ownerId"
       FROM team_miners tm
       JOIN miners m ON m.id = tm.minerId
       WHERE tm.teamId = $1
       ORDER BY tm.addedAt DESC`,
      [teamId],
    );
    const miners = minerResult.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      ip: r.ip,
      ownerId: r.ownerId,
    }));

    res.json({ miners, memberIds });
  } catch (err: unknown) {
    log.error('Error listing team miners:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamRouter.post('/:id/miners', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.id as string;
    const userId = req.userId as string;
    const membership = await getMembership(teamId, userId);

    if (!membership) {
      return res.status(404).json({ error: 'Team not found or not a member' });
    }
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can share miners' });
    }

    const { minerId } = req.body;
    if (!minerId || typeof minerId !== 'string') {
      return res.status(400).json({ error: 'minerId is required' });
    }

    const owned = await query('SELECT id FROM miners WHERE id = $1 AND userId = $2', [
      minerId,
      userId,
    ]);
    if (owned.rows.length === 0) {
      return res.status(404).json({ error: 'Miner not found or not owned by you' });
    }

    await query(
      `INSERT INTO team_miners (teamId, minerId, sharedBy)
       VALUES ($1, $2, $3)
       ON CONFLICT (teamId, minerId) DO NOTHING`,
      [teamId, minerId, userId],
    );

    log.info('Miner shared with team:', minerId, 'team:', teamId);
    recordActivity(userId, {
      type: 'miner_shared',
      title: `Shared miner with team`,
      description: `Team ${teamId}`,
      severity: 'info',
      minerId,
      metadata: { teamId },
    });

    const teamName = await getTeamName(teamId);
    const minerName = await getMinerName(minerId);
    const memberIds = await getTeamMemberIds(teamId, userId);
    await notifyTeamMinerShared(teamId, memberIds, teamName, minerName);
    for (const memberId of memberIds) {
      recordActivity(memberId, {
        type: 'miner_shared',
        title: `${minerName} was shared with ${teamName}`,
        severity: 'info',
        minerId,
        metadata: { teamId },
      });
    }
    await notifyOwnerMinerShared(teamId, userId, teamName, minerName);
    res.status(201).json({ ok: true });
  } catch (err: unknown) {
    log.error('Error sharing miner with team:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

teamRouter.delete('/:id/miners/:minerId', async (req: AuthRequest, res) => {
  try {
    const teamId = req.params.id as string;
    const userId = req.userId as string;
    const minerId = req.params.minerId as string;
    const membership = await getMembership(teamId, userId);

    if (!membership) {
      return res.status(404).json({ error: 'Team not found or not a member' });
    }
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can unshare miners' });
    }

    await query('DELETE FROM team_miners WHERE teamId = $1 AND minerId = $2', [teamId, minerId]);

    log.info('Miner removed from team:', minerId, 'team:', teamId);
    recordActivity(userId, {
      type: 'miner_unshared',
      title: `Unshared miner from team`,
      description: `Team ${teamId}`,
      severity: 'info',
      minerId,
      metadata: { teamId },
    });

    const teamName = await getTeamName(teamId);
    const minerName = await getMinerName(minerId);
    const ownerResult = await query('SELECT userId AS "ownerId" FROM miners WHERE id = $1', [
      minerId,
    ]);
    const ownerId = (ownerResult.rows[0] as { ownerId?: string } | undefined)?.ownerId;

    const memberResult = await query(
      `SELECT userId FROM team_members
       WHERE teamId = $1 AND userId <> $2 AND userId <> $3`,
      [teamId, userId, ownerId ?? ''],
    );
    const memberIds = (memberResult.rows as Array<{ userid: string }>).map((r) => r.userid);
    await notifyTeamMinerUnshared(teamId, memberIds, teamName, minerName);
    for (const memberId of memberIds) {
      recordActivity(memberId, {
        type: 'miner_unshared',
        title: `${minerName} was removed from ${teamName}`,
        severity: 'info',
        minerId,
        metadata: { teamId },
      });
    }
    if (ownerId) {
      await notifyOwnerMinerUnshared(teamId, ownerId, teamName, minerName);
      recordActivity(ownerId, {
        type: 'miner_unshared',
        title: `Your miner ${minerName} was removed from ${teamName}`,
        severity: 'info',
        minerId,
        metadata: { teamId },
      });
    }
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error removing miner from team:', err instanceof Error ? err.message : err);
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

    const teamName = await getTeamName(teamId);
    const leaverEmail = req.userEmail as string;
    const adminIds = await getTeamAdmins(teamId);
    await notifyTeamLeave(teamId, adminIds, teamName, leaverEmail);
    for (const adminId of adminIds) {
      recordActivity(adminId, {
        type: 'team_member_left',
        title: `${leaverEmail} left ${teamName}`,
        severity: 'info',
        metadata: { teamId },
      });
    }
    recordActivity(userId, {
      type: 'team_member_left',
      title: `You left ${teamName}`,
      severity: 'info',
      metadata: { teamId },
    });

    log.info('User', userId, 'left team:', teamId);
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error leaving team:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
