import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';

export const activityRouter = Router();
activityRouter.use(authMiddleware);

const MAX_LIMIT = 200;

function clampNonNegative(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

activityRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const rawLimit = parseInt(req.query.limit as string, 10);
    const rawOffset = parseInt(req.query.offset as string, 10);
    const limit = Math.min(clampNonNegative(rawLimit, 50), MAX_LIMIT);
    const offset = clampNonNegative(rawOffset, 0);

    const result = await query(
      `SELECT id, minerId, type, title, description, severity, timestamp, read, metadata
       FROM activity_events
       WHERE userId = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [req.userId as string, limit, offset],
    );

    const events = result.rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      type: r.type,
      title: r.title,
      description: r.description,
      severity: r.severity,
      timestamp: Number(r.timestamp),
      read: r.read,
      minerId: r.minerid ?? undefined,
      metadata: r.metadata ?? {},
    }));

    res.json({ events });
  } catch (err: unknown) {
    log.error('Error fetching activity events:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

activityRouter.put('/read', async (req: AuthRequest, res) => {
  try {
    await query('UPDATE activity_events SET read = true WHERE userId = $1', [req.userId as string]);
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error marking all activity events read:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

activityRouter.put('/:id/read', async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const result = await query(
      'UPDATE activity_events SET read = true WHERE id = $1 AND userId = $2 RETURNING id',
      [id, req.userId as string],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'event not found' });
    }
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error marking activity event read:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
