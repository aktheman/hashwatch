import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const webhooksRouter = Router();
webhooksRouter.use(authMiddleware);

webhooksRouter.get('/logs', async (req: AuthRequest, res) => {
  const result = await query(
    `SELECT id, event, url, status, "responseCode", "sentAt"
     FROM webhook_logs
     WHERE userId = $1
     ORDER BY "sentAt" DESC
     LIMIT 50`,
    [req.userId],
  );
  const logs = result.rows.map((row: Record<string, unknown>) => ({
    id: row.id,
    event: row.event,
    url: row.url,
    status: row.status,
    responseCode: row.responseCode,
    sentAt: row.sentAt,
  }));
  res.json(logs);
});

webhooksRouter.delete('/logs', async (req: AuthRequest, res) => {
  await query('DELETE FROM webhook_logs WHERE userId = $1', [req.userId]);
  res.json({ deleted: true });
});
