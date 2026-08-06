import { query } from '../db';
import { log } from '../logger';

export type ActivitySeverity = 'info' | 'warning' | 'error' | 'success';

export type ActivityType =
  | 'miner_online'
  | 'miner_offline'
  | 'alert_fired'
  | 'firmware_updated'
  | 'team_member_joined'
  | 'team_member_left'
  | 'team_invite'
  | 'pool_switched'
  | 'miner_shared'
  | 'miner_unshared';

export interface ActivityInput {
  type: ActivityType;
  title: string;
  description?: string;
  severity?: ActivitySeverity;
  minerId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordActivity(userId: string, input: ActivityInput): Promise<void> {
  try {
    await query(
      `INSERT INTO activity_events (userId, minerId, type, title, description, severity, timestamp, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        input.minerId ?? null,
        input.type,
        input.title,
        input.description || '',
        input.severity || 'info',
        Date.now(),
        JSON.stringify(input.metadata || {}),
      ],
    );
  } catch (err: unknown) {
    log.error('Error recording activity event:', err instanceof Error ? err.message : err);
  }
}
