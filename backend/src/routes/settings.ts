import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const settingsRouter = Router();
settingsRouter.use(authMiddleware);

settingsRouter.get('/', async (req: AuthRequest, res) => {
  const result = await query('SELECT key, value FROM user_settings WHERE userId = $1', [
    req.userId,
  ]);
  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[(row as any).key] = (row as any).value;
  }
  res.json(settings);
});

settingsRouter.put('/', async (req: AuthRequest, res) => {
  const { key, value } = req.body;
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'key is required' });
  }
  await query(
    `INSERT INTO user_settings (userId, key, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (userId, key) DO UPDATE SET value = EXCLUDED.value`,
    [req.userId, key, String(value ?? '')],
  );
  res.json({ ok: true });
});

settingsRouter.delete('/:key', async (req: AuthRequest, res) => {
  await query('DELETE FROM user_settings WHERE userId = $1 AND key = $2', [
    req.userId,
    req.params.key,
  ]);
  res.json({ deleted: true });
});
