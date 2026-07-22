import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';

export const settingsRouter = Router();
settingsRouter.use(authMiddleware);

settingsRouter.get('/', async (req: AuthRequest, res) => {
  const result = await query('SELECT key, value FROM user_settings WHERE userId = $1', [
    req.userId,
  ]);
  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[(row as { key: string }).key] = (row as { value: string }).value;
  }
  res.json(settings);
});

settingsRouter.put('/', async (req: AuthRequest, res) => {
  try {
    const { key, value } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'key is required' });
    }
    if (key.length > 100) {
      return res.status(400).json({ error: 'key must be 100 characters or fewer' });
    }
    const strValue = String(value ?? '');
    if (strValue.length > 10000) {
      return res.status(400).json({ error: 'value must be 10000 characters or fewer' });
    }
    await query(
      `INSERT INTO user_settings (userId, key, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (userId, key) DO UPDATE SET value = EXCLUDED.value`,
      [req.userId, key, strValue],
    );
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error updating setting:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

settingsRouter.delete('/:key', async (req: AuthRequest, res) => {
  await query('DELETE FROM user_settings WHERE userId = $1 AND key = $2', [
    req.userId,
    req.params.key,
  ]);
  res.json({ deleted: true });
});
