import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const webhooksRouter = Router();
webhooksRouter.use(authMiddleware);

webhooksRouter.get('/logs', async (req: AuthRequest, res) => {
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
});

webhooksRouter.delete('/logs', async (req: AuthRequest, res) => {
  await query('DELETE FROM webhook_logs WHERE userId = $1', [req.userId]);
  res.json({ deleted: true });
});
