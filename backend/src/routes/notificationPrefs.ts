import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';

export const notificationPrefsRouter = Router();
notificationPrefsRouter.use(authMiddleware);

const ALERT_TYPES = [
  'offline',
  'online',
  'hot',
  'hashrate_drop',
  'pool_lost',
  'long_uptime',
  'share_rejection',
] as const;

async function verifyMinerOwnership(minerId: string, userId: string): Promise<boolean> {
  const result = await query('SELECT id FROM miners WHERE id = $1 AND userId = $2', [
    minerId,
    userId,
  ]);
  return result.rows.length > 0;
}

notificationPrefsRouter.get('/:minerId', async (req: AuthRequest, res) => {
  try {
    const minerId = req.params.minerId as string;
    if (!(await verifyMinerOwnership(minerId, req.userId as string))) {
      return res.status(404).json({ error: 'miner not found' });
    }
    const result = await query(
      'SELECT alertType, enabled FROM notification_prefs WHERE userId = $1 AND minerId = $2',
      [req.userId as string, minerId],
    );
    const prefs: Record<string, boolean> = {};
    for (const t of ALERT_TYPES) prefs[t] = true;
    for (const row of result.rows) {
      prefs[row.alerttype] = row.enabled;
    }
    res.json(prefs);
  } catch (err: unknown) {
    log.error('Error fetching notification prefs:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

notificationPrefsRouter.put('/:minerId', async (req: AuthRequest, res) => {
  try {
    const { alertType, enabled } = req.body;
    if (!ALERT_TYPES.includes(alertType)) {
      return res.status(400).json({ error: 'invalid alert type' });
    }
    const minerId = req.params.minerId as string;
    if (!(await verifyMinerOwnership(minerId, req.userId as string))) {
      return res.status(404).json({ error: 'miner not found' });
    }
    await query(
      `INSERT INTO notification_prefs (userId, minerId, alertType, enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (userId, minerId, alertType) DO UPDATE SET enabled = $4`,
      [req.userId as string, minerId, alertType, enabled],
    );
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error updating notification prefs:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
