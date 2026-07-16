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
  token_type TEXT NOT NULL DEFAULT 'expo',
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

CREATE TABLE IF NOT EXISTS notification_history (
  id BIGSERIAL PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}',
  sentAt BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent'
);

CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(userId, sentAt DESC);

CREATE TABLE IF NOT EXISTS miner_alert_rules (
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  minerId UUID NOT NULL REFERENCES miners(id) ON DELETE CASCADE,
  tempThreshold REAL NOT NULL DEFAULT 70,
  hashrateDropPercent REAL NOT NULL DEFAULT 50,
  offlineReminderMinutes INTEGER NOT NULL DEFAULT 5,
  uptimeThresholdHours INTEGER NOT NULL DEFAULT 24,
  shareRejectionPercent REAL NOT NULL DEFAULT 10,
  enabled BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (userId, minerId)
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  responseCode INTEGER NOT NULL DEFAULT 0,
  sentAt BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_user ON webhook_logs(userId, sentAt DESC);

CREATE TABLE IF NOT EXISTS pool_configs (
  id BIGSERIAL PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'braiins',
  apiKey TEXT NOT NULL DEFAULT '',
  poolUser TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pool_configs_user ON pool_configs(userId);

CREATE TABLE IF NOT EXISTS group_shares (
  id BIGSERIAL PRIMARY KEY,
  ownerId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  groupId TEXT NOT NULL,
  sharedWithUserId UUID REFERENCES users(id) ON DELETE CASCADE,
  sharedWithEmail TEXT NOT NULL DEFAULT '',
  accessLevel TEXT NOT NULL DEFAULT 'view',
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(ownerId, groupId, sharedWithUserId)
);

CREATE INDEX IF NOT EXISTS idx_group_shares_owner ON group_shares(ownerId);
CREATE INDEX IF NOT EXISTS idx_group_shares_shared ON group_shares(sharedWithUserId);

CREATE TABLE IF NOT EXISTS custom_themes (
  id BIGSERIAL PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled',
  colors JSONB NOT NULL DEFAULT '{}',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_themes_user ON custom_themes(userId);

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

CREATE INDEX IF NOT EXISTS idx_darkpool_contributions_user ON darkpool_contributions("userId", "contributedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_darkpool_contributions_time ON darkpool_contributions("contributedAt");

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

CREATE INDEX IF NOT EXISTS idx_darkpool_aggregates_time ON darkpool_aggregates("periodEnd", "computedAt" DESC);
