import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const groupsRouter = Router();
groupsRouter.use(authMiddleware);

groupsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM miner_groups WHERE user_id = $1 ORDER BY sort_order ASC, created_at ASC',
      [req.userId],
    );
    res.json({ groups: result.rows });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

groupsRouter.post('/sync', async (req: AuthRequest, res) => {
  try {
    const { groups } = req.body;
    if (!Array.isArray(groups)) {
      return res.status(400).json({ error: 'groups must be an array' });
    }
    for (const group of groups) {
      const { name, minerIds, order } = group;
      if (!name) continue;
      const existing = await query('SELECT id FROM miner_groups WHERE user_id = $1 AND name = $2', [
        req.userId,
        name,
      ]);
      if (existing.rows.length > 0) {
        await query(
          `UPDATE miner_groups SET miner_ids = $1, sort_order = $2, updated_at = NOW() WHERE id = $3`,
          [minerIds || [], order ?? 0, existing.rows[0].id],
        );
      } else {
        await query(
          `INSERT INTO miner_groups (user_id, name, miner_ids, sort_order) VALUES ($1, $2, $3, $4)`,
          [req.userId, name, minerIds || [], order ?? 0],
        );
      }
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});
