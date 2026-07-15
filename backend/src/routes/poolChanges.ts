import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

export const poolChangesRouter = Router();
poolChangesRouter.use(authMiddleware);

poolChangesRouter.get('/:minerId', async (req: AuthRequest, res) => {
  try {
    const minerId = req.params.minerId as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const result = await query(
      `SELECT previousPool, newPool, changedAt
       FROM pool_changes
       WHERE userId = $1 AND minerId = $2
       ORDER BY changedAt DESC
       LIMIT $3`,
      [req.userId as string, minerId, limit],
    );
    res.json(result.rows);
  } catch (err: unknown) {
    log.error('Error fetching pool changes:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

poolChangesRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { minerId, previousPool, newPool, changedAt } = req.body;
    if (!minerId || !newPool) {
      return res.status(400).json({ error: 'minerId and newPool are required' });
    }
    if (changedAt !== undefined && (typeof changedAt !== 'number' || changedAt < 0)) {
      return res.status(400).json({ error: 'changedAt must be a valid number' });
    }
    const ownership = await query('SELECT id FROM miners WHERE id = $1 AND userId = $2', [
      minerId,
      req.userId as string,
    ]);
    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: 'miner not found' });
    }
    await query(
      `INSERT INTO pool_changes (userId, minerId, previousPool, newPool, changedAt)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.userId as string, minerId, previousPool || '', newPool, changedAt || Date.now()],
    );
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error creating pool change:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
