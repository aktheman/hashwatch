import { Router } from 'express';
import { z } from 'zod';
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

const snapshotSchema = z.object({
  hashRate: z.number(),
  temperature: z.number(),
  voltage: z.number(),
  current: z.number(),
  power: z.number(),
  sharesAccepted: z.number().int(),
  sharesRejected: z.number().int(),
  uptimeSeconds: z.number().int(),
  frequency: z.number(),
});

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

  const parsed = snapshotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid snapshot data', details: parsed.error.errors });
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
  } = parsed.data;

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

  checkMinerStatus(req.userId as string, minerId, miner.name, miner.ip, true, temperature);

  broadcast(req.userId as string, { type: 'snapshot', snapshot: result.rows[0] });
  res.status(201).json(result.rows[0]);
});
