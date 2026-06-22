import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { authRouter } from './routes/auth';
import { minersRouter } from './routes/miners';
import { statsRouter } from './routes/stats';
import { proxyRouter } from './routes/proxy';
import { pushRouter } from './routes/push';
import { settingsRouter } from './routes/settings';
import { receiptRouter } from './routes/receipt';
import { notificationPrefsRouter } from './routes/notificationPrefs';
import { createWebSocketServer } from './ws';
import { query } from './db';
import { startMinerPoller, stopMinerPoller } from './services/minerPoller';

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

app.use('/api/auth', authRouter);
app.use('/api/miners', minersRouter);
app.use('/api/stats', statsRouter);
app.use('/api/proxy', proxyRouter);
app.use('/api/push', pushRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/receipt', receiptRouter);
app.use('/api/notification-prefs', notificationPrefsRouter);

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', timestamp: Date.now(), db: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', timestamp: Date.now(), db: 'disconnected' });
  }
});

async function initSchema() {
  try {
    const schemaPath = join(__dirname, 'models', 'schema.sql');
    const sql = readFileSync(schemaPath, 'utf-8');
    await query(sql);
    console.log('DB schema initialized');
  } catch (e) {
    console.error('Schema init error:', e);
  }
}

const PORT = process.env.PORT || 4000;
initSchema().then(() => {
  server.listen(PORT, () => {
    console.log(`HashWatch API running on :${PORT}`);
    startMinerPoller();
  });
});

function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  stopMinerPoller();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
