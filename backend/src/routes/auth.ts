import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { generateToken } from '../middleware/auth';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authRouter.post('/register', async (req, res) => {
  try {
    const { email } = registerSchema.parse(req.body);
    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'email already registered' });
    }
    const result = await query(
      'INSERT INTO users (email) VALUES ($1) RETURNING id',
      [email]
    );
    const userId = result.rows[0].id;
    const token = generateToken(userId);
    res.status(201).json({ token, userId });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    res.status(500).json({ error: e.message });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email } = registerSchema.parse(req.body);
    const result = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    const userId = result.rows[0].id;
    const token = generateToken(userId);
    res.json({ token, userId });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors });
    }
    res.status(500).json({ error: e.message });
  }
});
