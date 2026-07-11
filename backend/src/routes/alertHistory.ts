import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const alertHistoryRouter = Router();
alertHistoryRouter.use(authMiddleware);

const VALID_EVENTS = [
  'offline',
  'online',
  'hot',
  'hashrate_drop',
  'pool_lost',
  'long_uptime',
  'share_rejection',
];

alertHistoryRouter.get('/', async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const result = await query(
    `SELECT id, minerId, eventType, title, timestamp, read
     FROM alert_history
     WHERE userId = $1
     ORDER BY timestamp DESC
     LIMIT $2 OFFSET $3`,
    [req.userId as string, limit, offset],
  );
  res.json(result.rows);
});

alertHistoryRouter.post('/sync', async (req: AuthRequest, res) => {
  const { alerts } = req.body;
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return res.status(400).json({ error: 'alerts array is required' });
  }
  let inserted = 0;
  for (const a of alerts) {
    if (!VALID_EVENTS.includes(a.eventType) || !a.minerId || !a.timestamp) continue;
    const exists = await query(
      'SELECT id FROM alert_history WHERE userId = $1 AND minerId = $2 AND eventType = $3 AND timestamp = $4',
      [req.userId as string, a.minerId, a.eventType, a.timestamp],
    );
    if (exists.rows.length > 0) continue;
    await query(
      `INSERT INTO alert_history (userId, minerId, eventType, title, timestamp, read)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId as string, a.minerId, a.eventType, a.title || '', a.timestamp, a.read || false],
    );
    inserted++;
  }
  res.json({ ok: true, inserted });
});

alertHistoryRouter.put('/:id/read', async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  const result = await query(
    `UPDATE alert_history SET read = true WHERE id = $1 AND userId = $2 RETURNING id`,
    [id, req.userId as string],
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'alert not found' });
  res.json({ ok: true });
});
