/*
 * Dark Pool hashrate sharing tables (reference — actual DDL lives in schema.sql):

CREATE TABLE IF NOT EXISTS darkpool_contributions (
  id BIGSERIAL PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  minerHashrate BIGINT NOT NULL,
  minerPower REAL NOT NULL,
  minerTemp REAL,
  poolName TEXT,
  region TEXT,
  contributedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS darkpool_aggregates (
  id BIGSERIAL PRIMARY KEY,
  periodStart TIMESTAMP NOT NULL,
  periodEnd TIMESTAMP NOT NULL,
  totalHashrate BIGINT NOT NULL,
  avgPower REAL NOT NULL,
  avgTemp REAL,
  contributorCount INTEGER NOT NULL,
  poolBreakdown JSONB DEFAULT '{}',
  regionBreakdown JSONB DEFAULT '{}',
  computedAt TIMESTAMP DEFAULT NOW()
);
*/

import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

const CONTRIBUTION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const PERIOD_INTERVALS: Record<string, string> = {
  '1h': '1 hour',
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

export const darkPoolRouter = Router();
darkPoolRouter.use(authMiddleware);

// ── POST /api/darkpool/contribute ────────────────────────────────────────────
darkPoolRouter.post('/contribute', async (req: AuthRequest, res) => {
  try {
    const { hashrate, power, temp, poolName, region } = req.body;

    if (typeof hashrate !== 'number' || hashrate <= 0 || !Number.isFinite(hashrate)) {
      return res.status(400).json({ error: 'hashrate must be a positive number' });
    }
    if (typeof power !== 'number' || power <= 0 || !Number.isFinite(power)) {
      return res.status(400).json({ error: 'power must be a positive number' });
    }
    if (temp !== undefined && temp !== null) {
      if (typeof temp !== 'number' || temp < 0 || temp > 200 || !Number.isFinite(temp)) {
        return res.status(400).json({ error: 'temp must be between 0 and 200' });
      }
    }
    if (poolName !== undefined && poolName !== null && typeof poolName !== 'string') {
      return res.status(400).json({ error: 'poolName must be a string' });
    }
    if (region !== undefined && region !== null && typeof region !== 'string') {
      return res.status(400).json({ error: 'region must be a string' });
    }

    // Rate limit: max 1 contribution per user per 5 minutes
    const recent = await query(
      `SELECT id FROM darkpool_contributions
       WHERE "userId" = $1 AND "contributedAt" > NOW() - INTERVAL '5 minutes'
       LIMIT 1`,
      [req.userId],
    );
    if (recent.rows.length > 0) {
      return res
        .status(429)
        .json({ error: 'Contribution cooldown active. Try again in 5 minutes.' });
    }

    const result = await query(
      `INSERT INTO darkpool_contributions ("userId", "minerHashrate", "minerPower", "minerTemp", "poolName", "region")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [req.userId, Math.round(hashrate), power, temp ?? null, poolName ?? null, region ?? null],
    );

    log.info('Dark pool contribution recorded', { userId: req.userId, id: result.rows[0].id });
    res.status(201).json({ ok: true, id: result.rows[0].id });
  } catch (err: unknown) {
    log.error('Error recording dark pool contribution:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/darkpool/aggregate ──────────────────────────────────────────────
darkPoolRouter.get('/aggregate', async (req: AuthRequest, res) => {
  try {
    const period = typeof req.query.period === 'string' ? req.query.period : '24h';
    const interval = PERIOD_INTERVALS[period];
    if (!interval) {
      return res.status(400).json({ error: 'period must be one of: 1h, 24h, 7d, 30d' });
    }

    // Try pre-computed aggregates first
    const cached = await query(
      `SELECT "totalHashrate", "avgPower", "avgTemp", "contributorCount",
              "poolBreakdown", "regionBreakdown"
       FROM darkpool_aggregates
       WHERE "periodEnd" > NOW() AND "periodEnd" - "periodStart" = INTERVAL '${interval}'
       ORDER BY "computedAt" DESC
       LIMIT 1`,
    );

    if (cached.rows.length > 0) {
      const row = cached.rows[0];
      return res.json({
        totalHashrate: row.totalHashrate,
        avgPower: row.avgPower,
        avgTemp: row.avgTemp,
        contributorCount: row.contributorCount,
        poolBreakdown: row.poolBreakdown,
        regionBreakdown: row.regionBreakdown,
        period,
      });
    }

    // Compute on-the-fly from contributions
    const stats = await query(
      `SELECT
         COALESCE(SUM("minerHashrate"), 0) AS "totalHashrate",
         COALESCE(AVG("minerPower"), 0) AS "avgPower",
         COALESCE(AVG("minerTemp"), 0) AS "avgTemp",
         COUNT(DISTINCT "userId") AS "contributorCount"
       FROM darkpool_contributions
       WHERE "contributedAt" > NOW() - INTERVAL '${interval}'`,
    );

    const poolRows = await query(
      `SELECT
         COALESCE("poolName", 'other') AS "poolName",
         SUM("minerHashrate") AS "total"
       FROM darkpool_contributions
       WHERE "contributedAt" > NOW() - INTERVAL '${interval}'
       GROUP BY "poolName"`,
    );

    const regionRows = await query(
      `SELECT
         COALESCE("region", 'unknown') AS "region",
         SUM("minerHashrate") AS "total"
       FROM darkpool_contributions
       WHERE "contributedAt" > NOW() - INTERVAL '${interval}'
       GROUP BY "region"`,
    );

    const poolBreakdown: Record<string, number> = {};
    for (const row of poolRows.rows) {
      poolBreakdown[row.poolName] = Number(row.total);
    }

    const regionBreakdown: Record<string, number> = {};
    for (const row of regionRows.rows) {
      regionBreakdown[row.region] = Number(row.total);
    }

    const s = stats.rows[0];
    const result = {
      totalHashrate: Number(s.totalHashrate),
      avgPower: Number(s.avgPower),
      avgTemp: Number(s.avgTemp),
      contributorCount: Number(s.contributorCount),
      poolBreakdown,
      regionBreakdown,
      period,
    };

    res.json(result);
  } catch (err: unknown) {
    log.error('Error fetching dark pool aggregate:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/darkpool/my-contributions ───────────────────────────────────────
darkPoolRouter.get('/my-contributions', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT id, "minerHashrate", "minerPower", "minerTemp", "poolName", "region", "contributedAt"
       FROM darkpool_contributions
       WHERE "userId" = $1
       ORDER BY "contributedAt" DESC
       LIMIT 100`,
      [req.userId],
    );

    res.json(result.rows);
  } catch (err: unknown) {
    log.error('Error fetching dark pool contributions:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/darkpool/my-contributions ────────────────────────────────────
darkPoolRouter.delete('/my-contributions', async (req: AuthRequest, res) => {
  try {
    const result = await query(`DELETE FROM darkpool_contributions WHERE "userId" = $1`, [
      req.userId,
    ]);

    log.info('Dark pool contributions deleted', { userId: req.userId, count: result.rowCount });
    res.json({ ok: true, deleted: result.rowCount });
  } catch (err: unknown) {
    log.error('Error deleting dark pool contributions:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
