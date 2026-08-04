import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface RateWindow {
  windowMs: number;
  windows: Map<string, number[]>;
}

const allWindows = new Map<symbol, RateWindow>();
const CLEANUP_INTERVAL = 60_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [, entry] of allWindows) {
      for (const [key, timestamps] of entry.windows) {
        const valid = timestamps.filter((t) => now - t < entry.windowMs);
        if (valid.length === 0) entry.windows.delete(key);
        else entry.windows.set(key, valid);
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
  allWindows.set(id, { windowMs, windows });

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
