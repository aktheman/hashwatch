import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 30_000; // 30s
const MAX_CACHE_SIZE = 1_000;
const CLEANUP_INTERVAL = 60_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now >= entry.expiresAt) cache.delete(key);
    }
  }, CLEANUP_INTERVAL);
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

startCleanup();

export function cacheMiddleware(ttl = DEFAULT_TTL) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      next();
      return;
    }
    const key = `${req.originalUrl}|${req.headers.authorization || ''}`;
    const now = Date.now();
    const entry = cache.get(key);
    if (entry && now < entry.expiresAt) {
      res.json(entry.data);
      return;
    }
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
      }
      cache.set(key, { data: body, expiresAt: now + ttl });
      return originalJson(body);
    };
    next();
  };
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
