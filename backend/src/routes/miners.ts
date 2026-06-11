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
  const result = await query('SELECT * FROM miners WHERE userId = $1 ORDER BY addedAt DESC', [
    req.userId as string,
  ]);
  res.json(result.rows);
});

minersRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const data = minerSchema.parse(req.body);
    const result = await query(
      `INSERT INTO miners (userId, name, ip, port)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.userId as string, data.name, data.ip, data.port],
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    res.status(500).json({ error: e.message });
  }
});

minersRouter.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = minerSchema.partial().parse(req.body);
    const id = req.params.id as string;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.ip !== undefined) {
      fields.push(`ip = $${idx++}`);
      values.push(data.ip);
    }
    if (data.port !== undefined) {
      fields.push(`port = $${idx++}`);
      values.push(data.port);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'no fields to update' });
    }

    values.push(id, req.userId);
    const result = await query(
      `UPDATE miners SET ${fields.join(', ')} WHERE id = $${idx++} AND userId = $${idx}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'miner not found' });
    }
    res.json(result.rows[0]);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    res.status(500).json({ error: e.message });
  }
});

minersRouter.delete('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  await query('DELETE FROM miners WHERE id = $1 AND userId = $2', [id, req.userId]);
  res.json({ deleted: true });
});
