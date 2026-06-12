import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { broadcast } from '../ws';
import { checkMinerStatus } from '../services/minerMonitor';

export const statsRouter = Router();
statsRouter.use(authMiddleware);

async function verifyMinerOwnership(minerId: string, userId: string) {
  const result = await query('SELECT id, name, ip FROM miners WHERE id = $1 AND userId = $2', [
    minerId,
    userId,
  ]);
  return result.rows[0] ?? null;
}

statsRouter.get('/:minerId', async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
  const minerId = req.params.minerId as string;
  const result = await query(
    `SELECT * FROM miner_snapshots
     WHERE minerId = $1 AND minerId IN (
       SELECT id FROM miners WHERE userId = $2
     )
     ORDER BY timestamp DESC
     LIMIT $3`,
    [minerId, req.userId, limit],
  );
  res.json(result.rows);
});

statsRouter.post('/:minerId', async (req: AuthRequest, res) => {
  const minerId = req.params.minerId as string;
  const miner = await verifyMinerOwnership(minerId, req.userId as string);
  if (!miner) {
    return res.status(404).json({ error: 'miner not found' });
  }

  const {
    hashRate,
    temperature,
    voltage,
    current,
    power,
    sharesAccepted,
    sharesRejected,
    uptimeSeconds,
    frequency,
  } = req.body;

  const result = await query(
    `INSERT INTO miner_snapshots
     (minerId, timestamp, hashRate, temperature, voltage, current, power,
      sharesAccepted, sharesRejected, uptimeSeconds, frequency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      minerId,
      Date.now(),
      hashRate,
      temperature,
      voltage,
      current,
      power,
      sharesAccepted,
      sharesRejected,
      uptimeSeconds,
      frequency,
    ],
  );

  checkMinerStatus(req.userId as string, minerId, miner.name, miner.ip, true, temperature || 0);

  broadcast(req.userId as string, { type: 'snapshot', snapshot: result.rows[0] });
  res.status(201).json(result.rows[0]);
});
