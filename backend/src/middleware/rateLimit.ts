import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

const allWindows = new Map<string, Map<string, number[]>>();
const CLEANUP_INTERVAL = 60_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [, windows] of allWindows) {
      for (const [key, timestamps] of windows) {
        const valid = timestamps.filter((t) => now - t < CLEANUP_INTERVAL);
        if (valid.length === 0) windows.delete(key);
        else windows.set(key, valid);
      }
    }
  }, CLEANUP_INTERVAL);
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

startCleanup();

export function rateLimit({ windowMs, max }: RateLimitOptions) {
  const windows = new Map<string, number[]>();
  const id = Symbol();
  allWindows.set(id as unknown as string, windows);

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = req.userId || req.ip || 'unknown';
    const now = Date.now();
    const timestamps = windows.get(key) || [];
    const valid = timestamps.filter((t) => now - t < windowMs);

    if (valid.length >= max) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    valid.push(now);
    windows.set(key, valid);
    next();
  };
}
