import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { fetchBraiinsStats, fetchLuxorStats } from '../services/poolAnalytics';

export const poolAnalyticsRouter = Router();
poolAnalyticsRouter.use(authMiddleware);

poolAnalyticsRouter.get('/config', async (req: AuthRequest, res) => {
  const result = await query(
    'SELECT id, provider, apiKey, poolUser, enabled FROM pool_configs WHERE userId = $1 ORDER BY createdAt',
    [req.userId],
  );
  res.json(result.rows);
});

poolAnalyticsRouter.post('/config', async (req: AuthRequest, res) => {
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
  res.json(result.rows[0]);
});

poolAnalyticsRouter.get('/', async (req: AuthRequest, res) => {
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

  res.json({ stats: stats.filter(Boolean), configs });
});
