import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { authRouter } from './routes/auth';
import { minersRouter } from './routes/miners';
import { statsRouter } from './routes/stats';
import { proxyRouter } from './routes/proxy';
import { pushRouter } from './routes/push';
import { settingsRouter } from './routes/settings';
import { receiptRouter } from './routes/receipt';
import { createWebSocketServer } from './ws';
import { query } from './db';

const app = express();
const server = createServer(app);
createWebSocketServer(server, '/ws');

app.use(cors());
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

async function initSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS miners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        ip TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 80,
        addedAt TIMESTAMP DEFAULT NOW(),
        lastSeen TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS miner_snapshots (
        id BIGSERIAL PRIMARY KEY,
        minerId UUID NOT NULL REFERENCES miners(id) ON DELETE CASCADE,
        timestamp BIGINT NOT NULL,
        hashRate REAL NOT NULL,
        temperature REAL NOT NULL,
        voltage REAL NOT NULL,
        current REAL NOT NULL,
        power REAL NOT NULL,
        sharesAccepted INTEGER NOT NULL,
        sharesRejected INTEGER NOT NULL,
        uptimeSeconds INTEGER NOT NULL,
        frequency REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS push_tokens (
        token TEXT PRIMARY KEY NOT NULL,
        userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        createdAt TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_settings (
        userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (userId, key)
      );
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        userId UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        productId TEXT NOT NULL,
        expiresAt TIMESTAMP NOT NULL,
        createdAt TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_miners_userId ON miners(userId);
      CREATE INDEX IF NOT EXISTS idx_snapshots_minerId ON miner_snapshots(minerId, timestamp);
    `);
    console.log('DB schema initialized');
  } catch {
    console.log('Schema init skipped (tables may already exist)');
  }
}

const PORT = process.env.PORT || 4000;
initSchema().then(() => {
  server.listen(PORT, () => {
    console.log(`HashWatch API running on :${PORT}`);
  });
});
