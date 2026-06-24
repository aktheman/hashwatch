CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  alert_types TEXT,
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

CREATE TABLE IF NOT EXISTS notification_prefs (
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  minerId UUID NOT NULL REFERENCES miners(id) ON DELETE CASCADE,
  alertType TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (userId, minerId, alertType)
);

CREATE INDEX IF NOT EXISTS idx_miners_userId ON miners(userId);
CREATE INDEX IF NOT EXISTS idx_snapshots_minerId ON miner_snapshots(minerId, timestamp);
