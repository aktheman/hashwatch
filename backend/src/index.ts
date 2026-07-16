import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { initSentry } from './services/sentry';
import { authRouter } from './routes/auth';
import { minersRouter } from './routes/miners';
import { statsRouter } from './routes/stats';
import { proxyRouter } from './routes/proxy';
import { pushRouter } from './routes/push';
import { settingsRouter } from './routes/settings';
import { receiptRouter } from './routes/receipt';
import { notificationPrefsRouter } from './routes/notificationPrefs';
import { poolChangesRouter } from './routes/poolChanges';
import { alertHistoryRouter } from './routes/alertHistory';
import { alertRulesRouter } from './routes/alertRules';
import { notificationHistoryRouter } from './routes/notificationHistory';
import { createWebSocketServer } from './ws';
import { query } from './db';
import { startMinerPoller, stopMinerPoller } from './services/minerPoller';
import { cacheMiddleware, invalidateCache } from './middleware/cache';
import { Request, Response, NextFunction } from 'express';
import { webhooksRouter } from './routes/webhooks';
import { poolAnalyticsRouter } from './routes/poolAnalytics';
import { groupSharesRouter } from './routes/groupShares';
import { customThemesRouter } from './routes/customThemes';
import { darkPoolRouter } from './routes/darkPool';

const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

const app = express();
const server = createServer(app);
createWebSocketServer(server, '/ws');

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : undefined;

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many requests' },
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many auth attempts' },
});
app.use('/api/auth', authLimiter);

app.use('/api/', cacheMiddleware());

app.use('/api/auth', authRouter);
app.use('/api/miners', minersRouter);
app.use('/api/stats', statsRouter);
app.use('/api/proxy', proxyRouter);
app.use('/api/push', pushRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/receipt', receiptRouter);
app.use('/api/notification-prefs', notificationPrefsRouter);
app.use('/api/pool-changes', poolChangesRouter);
app.use('/api/alert-history', alertHistoryRouter);
app.use('/api/miner-alert-rules', alertRulesRouter);
app.use('/api/notification-history', notificationHistoryRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/pool-analytics', poolAnalyticsRouter);
app.use('/api/groups', groupSharesRouter);
app.use('/api/custom-themes', customThemesRouter);
app.use('/api/darkpool', darkPoolRouter);

app.get('/api/health', async (_req, res) => {
  const commitSha = process.env.COMMIT_SHA || null;
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', timestamp: Date.now(), db: 'connected', commitSha });
  } catch {
    res
      .status(503)
      .json({ status: 'degraded', timestamp: Date.now(), db: 'disconnected', commitSha });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'internal server error' });
});

async function initSchema() {
  try {
    const schemaPath = join(__dirname, 'models', 'schema.sql');
    const sql = readFileSync(schemaPath, 'utf-8');
    await query(sql);
    log.info('DB schema initialized');
  } catch (e) {
    log.error('Schema init error:', e);
  }
}

const PORT = process.env.PORT || 4000;

function validateEnv() {
  if (process.env.NODE_ENV === 'test') return;
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  for (const key of required) {
    if (!process.env[key] || process.env[key].trim() === '') {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
  if (!process.env.RAILWAY_API_TOKEN || process.env.RAILWAY_API_TOKEN.trim() === '') {
    log.warn(
      'Optional env var RAILWAY_API_TOKEN is missing; Railway-specific features are disabled',
    );
  }
}
validateEnv();

initSentry();
initSchema().then(() => {
  invalidateCache();
  server.listen(PORT, () => {
    log.info(`HashWatch API running on :${PORT}`);
    startMinerPoller();
  });
});

function gracefulShutdown(signal: string) {
  log.info(`Received ${signal}, shutting down gracefully...`);
  stopMinerPoller();
  invalidateCache();
  server.close(() => {
    log.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    log.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
