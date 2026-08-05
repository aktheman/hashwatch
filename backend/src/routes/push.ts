import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendPushNotification } from '../services/pushNotifications';
import { log } from '../logger';

export const pushRouter = Router();
pushRouter.use(authMiddleware);

pushRouter.post('/test', async (req: AuthRequest, res) => {
  try {
    const tokenResult = await query(
      'SELECT COUNT(*)::int AS count FROM push_tokens WHERE userId = $1',
      [req.userId as string],
    );
    const count = (tokenResult.rows[0] as { count: number }).count;
    if (count === 0) {
      return res.status(400).json({ error: 'No push tokens registered' });
    }

    await sendPushNotification(
      req.userId as string,
      'test',
      'HashWatch Test',
      'This is a test notification from HashWatch.',
    );
    await query(
      `INSERT INTO notification_history (userId, token, title, body, data, sentAt, status)
       VALUES ($1, '', $2, $3, $4, $5, 'sent')`,
      [
        req.userId as string,
        'HashWatch Test',
        'This is a test notification from HashWatch.',
        JSON.stringify({ type: 'test' }),
        Date.now(),
      ],
    );

    log.info('Test notification sent to user:', req.userId);
    res.json({ ok: true, sentTo: count });
  } catch (err: unknown) {
    log.error('Error sending test notification:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

pushRouter.post('/register', async (req: AuthRequest, res) => {
  try {
    const { token, alertTypes, tokenType } = req.body;
    if (!token) {
      res.status(400).json({ error: 'token is required' });
      return;
    }
    const alertTypesStr = Array.isArray(alertTypes) ? alertTypes.join(',') : null;
    const type = tokenType === 'web' ? 'web' : 'expo';

    const existing = await query('SELECT userId FROM push_tokens WHERE token = $1', [token]);
    if (existing.rows.length > 0 && existing.rows[0].userId !== req.userId) {
      return res.status(409).json({ error: 'Token is already registered to another user' });
    }

    await query(
      `INSERT INTO push_tokens (userId, token, alert_types, token_type) VALUES ($1, $2, $3, $4)
       ON CONFLICT (token) DO UPDATE SET userId = EXCLUDED.userId, alert_types = EXCLUDED.alert_types, token_type = EXCLUDED.token_type`,
      [req.userId, token, alertTypesStr, type],
    );
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error registering push token:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

pushRouter.delete('/unregister', async (req: AuthRequest, res) => {
  try {
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
  } catch (err: unknown) {
    log.error('Error unregistering push token:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
