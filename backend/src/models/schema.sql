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

CREATE TABLE IF NOT EXISTS pool_changes (
  id BIGSERIAL PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  minerId UUID NOT NULL REFERENCES miners(id) ON DELETE CASCADE,
  previousPool TEXT NOT NULL DEFAULT '',
  newPool TEXT NOT NULL DEFAULT '',
  changedAt BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pool_changes_miner ON pool_changes(minerId, changedAt);

CREATE TABLE IF NOT EXISTS alert_history (
  id BIGSERIAL PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  minerId UUID NOT NULL REFERENCES miners(id) ON DELETE CASCADE,
  eventType TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  timestamp BIGINT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_alert_history_user ON alert_history(userId, timestamp DESC);

CREATE TABLE IF NOT EXISTS miner_notes (
  id BIGSERIAL PRIMARY KEY,
  minerId UUID NOT NULL REFERENCES miners(id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_miner_notes_miner ON miner_notes(minerId, createdAt DESC);

CREATE TABLE IF NOT EXISTS miner_alert_rules (
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  minerId UUID NOT NULL REFERENCES miners(id) ON DELETE CASCADE,
  tempThreshold REAL NOT NULL DEFAULT 70,
  hashrateDropPercent REAL NOT NULL DEFAULT 50,
  offlineReminderMinutes INTEGER NOT NULL DEFAULT 5,
  uptimeThresholdHours INTEGER NOT NULL DEFAULT 24,
  enabled BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (userId, minerId)
);
