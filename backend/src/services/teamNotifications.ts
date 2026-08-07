import { query } from '../db';
import { log } from '../logger';
import { sendPushNotification } from './pushNotifications';
import { sendTeamWebhooks } from './teamWebhooks';

export type TeamNotificationType =
  | 'team_invite'
  | 'team_join'
  | 'team_leave'
  | 'miner_shared'
  | 'miner_unshared';

export async function sendTeamNotification(
  userId: string,
  type: TeamNotificationType,
  title: string,
  body: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await sendPushNotification(userId, type, title, body);
    await query(
      `INSERT INTO notification_history (userId, token, title, body, data, sentAt, status)
       VALUES ($1, '', $2, $3, $4, $5, 'sent')`,
      [userId, title, body, JSON.stringify({ type, ...metadata }), Date.now()],
    );
  } catch (err: unknown) {
    log.error('Error sending team notification:', err instanceof Error ? err.message : err);
  }
}

function dispatchTeamWebhook(
  teamId: string,
  eventType: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): void {
  if (!teamId) return;
  void sendTeamWebhooks(teamId, eventType, {
    event: eventType,
    title,
    body,
    severity: 'info',
    data,
    timestamp: Date.now(),
  });
}

async function notifyList(
  userIds: string[],
  type: TeamNotificationType,
  title: string,
  body: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  for (const id of userIds) {
    if (!id) continue;
    await sendTeamNotification(id, type, title, body, metadata);
  }
}

export function notifyTeamInvite(
  teamId: string,
  inviteeId: string,
  teamName: string,
  inviterEmail: string,
): Promise<void> {
  dispatchTeamWebhook(
    teamId,
    'team_invite',
    'Team Invitation',
    `${inviterEmail} invited you to join ${teamName}`,
    {
      teamName,
    },
  );
  return sendTeamNotification(
    inviteeId,
    'team_invite',
    'Team Invitation',
    `${inviterEmail} invited you to join ${teamName}`,
  );
}

export function notifyTeamJoin(
  teamId: string,
  adminIds: string[],
  teamName: string,
  joinedEmail: string,
): Promise<void> {
  dispatchTeamWebhook(teamId, 'team_join', 'New Team Member', `${joinedEmail} joined ${teamName}`, {
    teamName,
  });
  return notifyList(adminIds, 'team_join', 'New Team Member', `${joinedEmail} joined ${teamName}`);
}

export function notifyTeamLeave(
  teamId: string,
  adminIds: string[],
  teamName: string,
  leaverEmail: string,
): Promise<void> {
  dispatchTeamWebhook(teamId, 'team_leave', 'Team Member Left', `${leaverEmail} left ${teamName}`, {
    teamName,
  });
  return notifyList(adminIds, 'team_leave', 'Team Member Left', `${leaverEmail} left ${teamName}`);
}

export function notifyTeamMinerShared(
  teamId: string,
  memberIds: string[],
  teamName: string,
  minerName: string,
): Promise<void> {
  dispatchTeamWebhook(
    teamId,
    'miner_shared',
    'Miner Shared',
    `${minerName} was shared with ${teamName}`,
    {
      teamName,
      minerName,
    },
  );
  return notifyList(
    memberIds,
    'miner_shared',
    'Miner Shared',
    `${minerName} was shared with ${teamName}`,
    { minerName, teamName },
  );
}

export function notifyTeamMinerUnshared(
  teamId: string,
  memberIds: string[],
  teamName: string,
  minerName: string,
): Promise<void> {
  dispatchTeamWebhook(
    teamId,
    'miner_unshared',
    'Miner Removed',
    `${minerName} was removed from ${teamName}`,
    {
      teamName,
      minerName,
    },
  );
  return notifyList(
    memberIds,
    'miner_unshared',
    'Miner Removed',
    `${minerName} was removed from ${teamName}`,
    { minerName, teamName },
  );
}

export function notifyOwnerMinerShared(
  teamId: string,
  ownerId: string,
  teamName: string,
  minerName: string,
): Promise<void> {
  dispatchTeamWebhook(
    teamId,
    'miner_shared',
    'Miner Shared with Team',
    `Your miner ${minerName} was shared with ${teamName}`,
    {
      teamName,
      minerName,
    },
  );
  return sendTeamNotification(
    ownerId,
    'miner_shared',
    'Miner Shared with Team',
    `Your miner ${minerName} was shared with ${teamName}`,
    { minerName, teamName },
  );
}

export function notifyOwnerMinerUnshared(
  teamId: string,
  ownerId: string,
  teamName: string,
  minerName: string,
): Promise<void> {
  dispatchTeamWebhook(
    teamId,
    'miner_unshared',
    'Miner Removed from Team',
    `Your miner ${minerName} was removed from ${teamName}`,
    {
      teamName,
      minerName,
    },
  );
  return sendTeamNotification(
    ownerId,
    'miner_unshared',
    'Miner Removed from Team',
    `Your miner ${minerName} was removed from ${teamName}`,
    { minerName, teamName },
  );
}

export async function notifySharedMinerMembers(
  ownerUserId: string,
  minerId: string,
  type: string,
  title: string,
  body: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const result = await query(
      `SELECT DISTINCT tm.teamId AS teamId, me.userId AS userId
       FROM team_miners tm
       JOIN team_members me ON me.teamId = tm.teamId
       WHERE tm.minerId = $1 AND me.userId <> $2`,
      [minerId, ownerUserId],
    );
    const teamIdByMember = new Map<string, string>();
    for (const row of result.rows as Array<{ teamid: string; userid: string }>) {
      teamIdByMember.set(row.userid, row.teamid);
    }
    const memberIds = Array.from(teamIdByMember.keys());
    await notifyList(memberIds, type as TeamNotificationType, title, body, metadata);

    const teamIds = Array.from(new Set(Array.from(teamIdByMember.values()).filter(Boolean)));
    for (const teamId of teamIds) {
      dispatchTeamWebhook(teamId, type, title, body, { minerId, ...metadata });
    }
  } catch (err: unknown) {
    log.error(
      'Error notifying team members for shared miner:',
      err instanceof Error ? err.message : err,
    );
  }
}
