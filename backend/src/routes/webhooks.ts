import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';
import { generateWebhookSecret } from '../utils/webhookSigning';

export const webhooksRouter = Router();
webhooksRouter.use(authMiddleware);

webhooksRouter.get('/settings', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT key, value FROM user_settings WHERE userId = $1 AND key IN ($2, $3)',
      [req.userId, 'webhook_url', 'webhook_secret'],
    );
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[(row as { key: string }).key] = (row as { value: string }).value;
    }
    res.json({ url: settings.webhook_url ?? '', secret: settings.webhook_secret ?? '' });
  } catch (err: unknown) {
    log.error('Error fetching webhook settings:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

webhooksRouter.post('/rotate-secret', async (req: AuthRequest, res) => {
  try {
    const secret = generateWebhookSecret();
    await query(
      `INSERT INTO user_settings (userId, key, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (userId, key) DO UPDATE SET value = EXCLUDED.value`,
      [req.userId, 'webhook_secret', secret],
    );
    res.json({ secret });
  } catch (err: unknown) {
    log.error('Error rotating webhook secret:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

webhooksRouter.get('/logs', async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

    const countResult = await query(
      'SELECT COUNT(*)::int AS total FROM webhook_logs WHERE userId = $1',
      [req.userId],
    );
    const total = countResult.rows[0].total;

    const result = await query(
      `SELECT id, event, url, status, "responseCode", "sentAt"
       FROM webhook_logs
       WHERE userId = $1
       ORDER BY "sentAt" DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, limit, offset],
    );
    const logs = result.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      event: row.event,
      url: row.url,
      status: row.status,
      responseCode: row.responseCode,
      sentAt: row.sentAt,
    }));
    res.json({ logs, total, limit, offset });
  } catch (err: unknown) {
    log.error('Error fetching webhook logs:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

webhooksRouter.delete('/logs', async (req: AuthRequest, res) => {
  try {
    await query('DELETE FROM webhook_logs WHERE userId = $1', [req.userId]);
    res.json({ deleted: true });
  } catch (err: unknown) {
    log.error('Error deleting webhook logs:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
