import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const raw = process.env.JWT_SECRET;
if (!raw) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = raw;

export interface AuthRequest extends Request {
  userId?: string;
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing token' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as unknown as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}
