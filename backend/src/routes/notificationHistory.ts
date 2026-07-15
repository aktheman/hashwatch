import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

export const notificationHistoryRouter = Router();
notificationHistoryRouter.use(authMiddleware);

notificationHistoryRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await query(
      `SELECT id, token, title, body, data, sentAt, status
       FROM notification_history
       WHERE userId = $1
       ORDER BY sentAt DESC
       LIMIT $2 OFFSET $3`,
      [req.userId as string, limit, offset],
    );
    res.json(result.rows);
  } catch (err: unknown) {
    log.error('Error fetching notification history:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

notificationHistoryRouter.post('/sync', async (req: AuthRequest, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries array is required' });
  }
  let inserted = 0;
  for (const e of entries) {
    if (!e.title || !e.sentAt) continue;
    const exists = await query(
      'SELECT id FROM notification_history WHERE userId = $1 AND title = $2 AND sentAt = $3',
      [req.userId as string, e.title, e.sentAt],
    );
    if (exists.rows.length > 0) continue;
    await query(
      `INSERT INTO notification_history (userId, token, title, body, data, sentAt, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.userId as string,
        e.token || '',
        e.title,
        e.body || '',
        JSON.stringify(e.data || {}),
        e.sentAt,
        e.status || 'sent',
      ],
    );
    inserted++;
  }
  res.json({ ok: true, inserted });
});

notificationHistoryRouter.delete('/', async (req: AuthRequest, res) => {
  try {
    await query('DELETE FROM notification_history WHERE userId = $1', [req.userId as string]);
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error clearing notification history:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
