import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const minersRouter = Router();
minersRouter.use(authMiddleware);

const minerSchema = z.object({
  name: z.string().min(1).max(50),
  ip: z.string().ip(),
  port: z.number().int().default(80),
});

minersRouter.get('/', async (req: AuthRequest, res) => {
  const result = await query(
    'SELECT * FROM miners WHERE userId = $1 ORDER BY addedAt DESC',
    [req.userId]
  );
  res.json(result.rows);
});

minersRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const data = minerSchema.parse(req.body);
    const result = await query(
      `INSERT INTO miners (userId, name, ip, port)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.userId, data.name, data.ip, data.port]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    res.status(500).json({ error: e.message });
  }
});

minersRouter.delete('/:id', async (req: AuthRequest, res) => {
  await query(
    'DELETE FROM miners WHERE id = $1 AND userId = $2',
    [req.params.id, req.userId]
  );
  res.json({ deleted: true });
});
