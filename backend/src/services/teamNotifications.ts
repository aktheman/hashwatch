import { query } from '../db';
import { log } from '../logger';
import { sendPushNotification } from './pushNotifications';

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
  inviteeId: string,
  teamName: string,
  inviterEmail: string,
): Promise<void> {
  return sendTeamNotification(
    inviteeId,
    'team_invite',
    'Team Invitation',
    `${inviterEmail} invited you to join ${teamName}`,
  );
}

export function notifyTeamJoin(
  adminIds: string[],
  teamName: string,
  joinedEmail: string,
): Promise<void> {
  return notifyList(adminIds, 'team_join', 'New Team Member', `${joinedEmail} joined ${teamName}`);
}

export function notifyTeamLeave(
  adminIds: string[],
  teamName: string,
  leaverEmail: string,
): Promise<void> {
  return notifyList(adminIds, 'team_leave', 'Team Member Left', `${leaverEmail} left ${teamName}`);
}

export function notifyTeamMinerShared(
  memberIds: string[],
  teamName: string,
  minerName: string,
): Promise<void> {
  return notifyList(
    memberIds,
    'miner_shared',
    'Miner Shared',
    `${minerName} was shared with ${teamName}`,
    { minerName, teamName },
  );
}

export function notifyTeamMinerUnshared(
  memberIds: string[],
  teamName: string,
  minerName: string,
): Promise<void> {
  return notifyList(
    memberIds,
    'miner_unshared',
    'Miner Removed',
    `${minerName} was removed from ${teamName}`,
    { minerName, teamName },
  );
}

export function notifyOwnerMinerShared(
  ownerId: string,
  teamName: string,
  minerName: string,
): Promise<void> {
  return sendTeamNotification(
    ownerId,
    'miner_shared',
    'Miner Shared with Team',
    `Your miner ${minerName} was shared with ${teamName}`,
    { minerName, teamName },
  );
}

export function notifyOwnerMinerUnshared(
  ownerId: string,
  teamName: string,
  minerName: string,
): Promise<void> {
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
      `SELECT DISTINCT me.userId AS userId
       FROM team_miners tm
       JOIN team_members me ON me.teamId = tm.teamId
       WHERE tm.minerId = $1 AND me.userId <> $2`,
      [minerId, ownerUserId],
    );
    const memberIds = (result.rows as Array<{ userid: string }>).map((r) => r.userid);
    await notifyList(memberIds, type as TeamNotificationType, title, body, metadata);
  } catch (err: unknown) {
    log.error(
      'Error notifying team members for shared miner:',
      err instanceof Error ? err.message : err,
    );
  }
}
