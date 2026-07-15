import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { fetchBraiinsStats, fetchLuxorStats } from '../services/poolAnalytics';

const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

export const poolAnalyticsRouter = Router();
poolAnalyticsRouter.use(authMiddleware);

function maskApiKey(key: string): string {
  if (!key || key.length <= 4) return '****';
  return '****' + key.slice(-4);
}

poolAnalyticsRouter.get('/config', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, provider, apiKey, poolUser, enabled FROM pool_configs WHERE userId = $1 ORDER BY createdAt',
      [req.userId],
    );
    const masked = result.rows.map((row: Record<string, unknown>) => ({
      ...row,
      apiKey: maskApiKey(row.apiKey as string),
    }));
    res.json(masked);
  } catch (err: unknown) {
    log.error('Error fetching pool config:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

poolAnalyticsRouter.post('/config', async (req: AuthRequest, res) => {
  try {
    const { provider, apiKey, poolUser } = req.body;
    if (!provider || (provider !== 'braiins' && provider !== 'luxor')) {
      return res.status(400).json({ error: 'provider must be braiins or luxor' });
    }
    const result = await query(
      `INSERT INTO pool_configs (userId, provider, apiKey, poolUser)
       VALUES ($1, $2, $3, $4)
       RETURNING id, provider, apiKey, poolUser, enabled`,
      [req.userId, provider, apiKey || '', poolUser || ''],
    );
    const row = result.rows[0] as Record<string, unknown>;
    res.json({ ...row, apiKey: maskApiKey(row.apiKey as string) });
  } catch (err: unknown) {
    log.error('Error saving pool config:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

poolAnalyticsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, provider, apiKey, poolUser, enabled FROM pool_configs WHERE userId = $1 AND enabled = true',
      [req.userId],
    );
    const configs = result.rows as {
      id: number;
      provider: string;
      apikey: string;
      pooluser: string;
      enabled: boolean;
    }[];

    if (configs.length === 0) {
      return res.json({ stats: [], configs: [] });
    }

    const stats = await Promise.all(
      configs.map(async (cfg) => {
        if (cfg.provider === 'braiins') {
          return fetchBraiinsStats(cfg.apikey);
        }
        return fetchLuxorStats(cfg.apikey, cfg.pooluser);
      }),
    );

    const maskedConfigs = configs.map((c) => ({ ...c, apiKey: maskApiKey(c.apikey) }));
    res.json({ stats: stats.filter(Boolean), configs: maskedConfigs });
  } catch (err: unknown) {
    log.error('Error fetching pool analytics:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
