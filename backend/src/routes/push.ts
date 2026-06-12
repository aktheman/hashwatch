import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const pushRouter = Router();
pushRouter.use(authMiddleware);

pushRouter.post('/register', async (req: AuthRequest, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'token is required' });
    return;
  }
  await query(
    `INSERT INTO push_tokens (userId, token) VALUES ($1, $2)
     ON CONFLICT (token) DO UPDATE SET userId = EXCLUDED.userId`,
    [req.userId, token],
  );
  res.json({ ok: true });
});

pushRouter.delete('/unregister', async (req: AuthRequest, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'token is required' });
    return;
  }
  const result = await query(
    'DELETE FROM push_tokens WHERE token = $1 AND userId = $2 RETURNING token',
    [token, req.userId],
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'token not found' });
  }
  res.json({ ok: true });
});
