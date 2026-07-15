import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { captureException } from '../services/sentry';
import { listPoolStats } from '../services/minerState';

const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

export const minersRouter = Router();
minersRouter.use(authMiddleware);

const minerSchema = z.object({
  name: z.string().min(1).max(50),
  ip: z.string().ip(),
  port: z.number().int().default(80),
});

const getUserId = (req: AuthRequest) => req.userId as string;

minersRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM miners WHERE userId = $1 ORDER BY addedAt DESC', [
      getUserId(req),
    ]);
    res.json(result.rows);
  } catch (err: unknown) {
    log.error('Error fetching miners:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

minersRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const data = minerSchema.parse(req.body);
    const result = await query(
      `INSERT INTO miners (userId, name, ip, port)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [getUserId(req), data.name, data.ip, data.port],
    );
    res.status(201).json(result.rows[0]);
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    captureException(e);
    res.status(500).json({ error: 'internal server error' });
  }
});

minersRouter.put('/:id', async (req: AuthRequest, res) => {
  try {
    const data = minerSchema.partial().parse(req.body);
    const id = req.params.id;
    const fields: string[] = [];
    const values: unknown[] = [];
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

    values.push(id, getUserId(req));
    const result = await query(
      `UPDATE miners SET ${fields.join(', ')} WHERE id = $${idx++} AND userId = $${idx}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'miner not found' });
    }
    res.json(result.rows[0]);
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    captureException(e);
    res.status(500).json({ error: 'internal server error' });
  }
});

minersRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    const result = await query('DELETE FROM miners WHERE id = $1 AND userId = $2 RETURNING id', [
      id,
      getUserId(req),
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'miner not found' });
    }
    res.json({ deleted: true });
  } catch (err: unknown) {
    log.error('Error deleting miner:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

minersRouter.get('/pools', async (_req: AuthRequest, res) => {
  try {
    const data = listPoolStats().map((p, idx) => ({ id: String(idx), ...p }));
    res.json(data);
  } catch (e: unknown) {
    captureException(e);
    res.status(500).json({ error: 'internal server error' });
  }
});

minersRouter.get('/:minerId/notes', async (req: AuthRequest, res) => {
  try {
    const { minerId } = req.params;
    const result = await query(
      `SELECT id, minerId, userId, text, createdAt
       FROM miner_notes
       WHERE minerId = $1 AND userId = $2
       ORDER BY createdAt DESC`,
      [minerId, getUserId(req)],
    );
    res.json(result.rows);
  } catch (e: unknown) {
    captureException(e);
    res.status(500).json({ error: 'internal server error' });
  }
});

const noteSchema = z.object({
  text: z.string().min(1).max(500),
});

minersRouter.post('/:minerId/notes', async (req: AuthRequest, res) => {
  try {
    const { minerId } = req.params;
    const data = noteSchema.parse(req.body);
    const result = await query(
      `INSERT INTO miner_notes (minerId, userId, text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [minerId, getUserId(req), data.text],
    );
    res.status(201).json(result.rows[0]);
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    captureException(e);
    res.status(500).json({ error: 'internal server error' });
  }
});

const noteSchemaUpdate = z.object({
  text: z.string().min(1).max(500),
});

minersRouter.put('/:minerId/notes/:noteId', async (req: AuthRequest, res) => {
  try {
    const { minerId, noteId } = req.params;
    const data = noteSchemaUpdate.parse(req.body);
    const result = await query(
      `UPDATE miner_notes SET text = $1 WHERE id = $2 AND minerId = $3 AND userId = $4 RETURNING *`,
      [data.text, noteId, minerId, getUserId(req)],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'note not found' });
    }
    res.json(result.rows[0]);
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    captureException(e);
    res.status(500).json({ error: 'internal server error' });
  }
});

minersRouter.delete('/:minerId/notes/:noteId', async (req: AuthRequest, res) => {
  try {
    const { minerId, noteId } = req.params;
    const result = await query(
      `DELETE FROM miner_notes WHERE id = $1 AND minerId = $2 AND userId = $3 RETURNING id`,
      [noteId, minerId, getUserId(req)],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'note not found' });
    }
    res.json({ deleted: true });
  } catch (e: unknown) {
    captureException(e);
    res.status(500).json({ error: 'internal server error' });
  }
});
