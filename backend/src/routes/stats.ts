import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const statsRouter = Router();
statsRouter.use(authMiddleware);

statsRouter.get('/:minerId', async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
  const result = await query(
    `SELECT * FROM miner_snapshots
     WHERE minerId = $1 AND minerId IN (
       SELECT id FROM miners WHERE userId = $2
     )
     ORDER BY timestamp DESC
     LIMIT $3`,
    [req.params.minerId, req.userId, limit]
  );
  res.json(result.rows);
});

statsRouter.post('/:minerId', async (req: AuthRequest, res) => {
  const { hashRate, temperature, voltage, current, power, sharesAccepted, sharesRejected, uptimeSeconds, frequency } = req.body;
  const result = await query(
    `INSERT INTO miner_snapshots
     (minerId, timestamp, hashRate, temperature, voltage, current, power,
      sharesAccepted, sharesRejected, uptimeSeconds, frequency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [req.params.minerId, Date.now(), hashRate, temperature, voltage, current, power, sharesAccepted, sharesRejected, uptimeSeconds, frequency]
  );
  res.status(201).json(result.rows[0]);
});
