import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';

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

const MAX_SYNC_BATCH = 500;

function clampNonNegative(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

alertHistoryRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const rawLimit = parseInt(req.query.limit as string, 10);
    const rawOffset = parseInt(req.query.offset as string, 10);
    const limit = Math.min(clampNonNegative(rawLimit, 50), 200);
    const offset = clampNonNegative(rawOffset, 0);
    const result = await query(
      `SELECT id, minerId, eventType, title, timestamp, read
       FROM alert_history
       WHERE userId = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [req.userId as string, limit, offset],
    );
    res.json(result.rows);
  } catch (err: unknown) {
    log.error('Error fetching alert history:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

alertHistoryRouter.post('/sync', async (req: AuthRequest, res) => {
  try {
    const { alerts } = req.body;
    if (!Array.isArray(alerts) || alerts.length === 0) {
      return res.status(400).json({ error: 'alerts array is required' });
    }
    if (alerts.length > MAX_SYNC_BATCH) {
      return res.status(400).json({ error: `alerts batch exceeds ${MAX_SYNC_BATCH} items` });
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
  } catch (err: unknown) {
    log.error('Error syncing alert history:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

alertHistoryRouter.put('/:id/read', async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const result = await query(
      `UPDATE alert_history SET read = true WHERE id = $1 AND userId = $2 RETURNING id`,
      [id, req.userId as string],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'alert not found' });
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error marking alert read:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
