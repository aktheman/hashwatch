import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const notificationPrefsRouter = Router();
notificationPrefsRouter.use(authMiddleware);

const ALERT_TYPES = [
  'offline',
  'online',
  'hot',
  'hashrate_drop',
  'pool_lost',
  'long_uptime',
] as const;

notificationPrefsRouter.get('/:minerId', async (req: AuthRequest, res) => {
  const result = await query(
    'SELECT alertType, enabled FROM notification_prefs WHERE userId = $1 AND minerId = $2',
    [req.userId as string, req.params.minerId as string],
  );
  const prefs: Record<string, boolean> = {};
  for (const t of ALERT_TYPES) prefs[t] = true;
  for (const row of result.rows) {
    prefs[row.alerttype] = row.enabled;
  }
  res.json(prefs);
});

notificationPrefsRouter.put('/:minerId', async (req: AuthRequest, res) => {
  const { alertType, enabled } = req.body;
  if (!ALERT_TYPES.includes(alertType)) {
    return res.status(400).json({ error: 'invalid alert type' });
  }
  const minerId = req.params.minerId as string;
  await query(
    `INSERT INTO notification_prefs (userId, minerId, alertType, enabled)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (userId, minerId, alertType) DO UPDATE SET enabled = $4`,
    [req.userId as string, minerId, alertType, enabled],
  );
  res.json({ ok: true });
});
