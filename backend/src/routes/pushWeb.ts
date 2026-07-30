import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const pushWebRouter = Router();
pushWebRouter.use(authMiddleware);

pushWebRouter.post('/web-subscribe', async (req: AuthRequest, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) {
      return res.status(400).json({ error: 'subscription is required' });
    }
    await query('DELETE FROM web_push_subscriptions WHERE user_id = $1', [req.userId]);
    await query(`INSERT INTO web_push_subscriptions (user_id, subscription) VALUES ($1, $2)`, [
      req.userId,
      JSON.stringify(subscription),
    ]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

pushWebRouter.post('/web-unsubscribe', async (req: AuthRequest, res) => {
  try {
    await query('DELETE FROM web_push_subscriptions WHERE user_id = $1', [req.userId]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});
