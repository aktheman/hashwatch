import { Miner, MinerSnapshot } from '../types';
import type { SQLiteDatabase } from 'expo-sqlite';

interface MinerRow {
  id: string; name: string; ip: string; port: number;
  addedAt: number; lastSeen: number;
  apiPath?: string; statusPath?: string;
}

let db: SQLiteDatabase | null = null;

async function getDb(): Promise<SQLiteDatabase> {
  if (db) return db;
  const SQLite = await import('expo-sqlite');
  db = await SQLite.openDatabaseAsync('hashwatch.db');
  if (db) await initTables(db);
  return db;
}

async function initTables(d: SQLiteDatabase): Promise<void> {
  await d.execAsync(`
    CREATE TABLE IF NOT EXISTS miners (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      ip TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 80,
      addedAt INTEGER NOT NULL,
      lastSeen INTEGER NOT NULL DEFAULT 0,
      apiPath TEXT DEFAULT NULL,
      statusPath TEXT DEFAULT NULL
    );
    CREATE TABLE IF NOT EXISTS miner_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      minerId TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      hashRate REAL NOT NULL,
      temperature REAL NOT NULL,
      voltage REAL NOT NULL,
      current REAL NOT NULL,
      power REAL NOT NULL,
      sharesAccepted INTEGER NOT NULL,
      sharesRejected INTEGER NOT NULL,
      uptimeSeconds INTEGER NOT NULL,
      frequency REAL NOT NULL,
      FOREIGN KEY (minerId) REFERENCES miners(id)
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_minerid
      ON miner_snapshots(minerId, timestamp);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  try {
    await d.execAsync(`ALTER TABLE miners ADD COLUMN apiPath TEXT DEFAULT NULL`);
  } catch { }
  try {
    await d.execAsync(`ALTER TABLE miners ADD COLUMN statusPath TEXT DEFAULT NULL`);
  } catch { }
}

export async function getSetting(key: string): Promise<string | null> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?', [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function loadMiners(): Promise<Miner[]> {
  const d = await getDb();
  const rows = await d.getAllAsync<MinerRow>('SELECT * FROM miners');
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    ip: r.ip,
    port: r.port,
    addedAt: r.addedAt,
    lastSeen: r.lastSeen,
    apiPath: r.apiPath || undefined,
    statusPath: r.statusPath || undefined,
    info: null,
    status: null,
    isOnline: false,
  }));
}

export async function saveMiner(m: Miner): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    `INSERT OR REPLACE INTO miners (id, name, ip, port, addedAt, lastSeen, apiPath, statusPath)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [m.id, m.name, m.ip, m.port, m.addedAt, m.lastSeen, m.apiPath || null, m.statusPath || null]
  );
}

export async function deleteMiner(id: string): Promise<void> {
  const d = await getDb();
  await d.runAsync('DELETE FROM miners WHERE id = ?', [id]);
  await d.runAsync('DELETE FROM miner_snapshots WHERE minerId = ?', [id]);
}

export async function saveSnapshot(s: MinerSnapshot): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    `INSERT INTO miner_snapshots
     (minerId, timestamp, hashRate, temperature, voltage, current, power,
      sharesAccepted, sharesRejected, uptimeSeconds, frequency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [s.minerId, s.timestamp, s.hashRate, s.temperature, s.voltage, s.current,
     s.power, s.sharesAccepted, s.sharesRejected, s.uptimeSeconds, s.frequency]
  );
}

export async function getSnapshots(
  minerId: string,
  limit: number = 100
): Promise<MinerSnapshot[]> {
  const d = await getDb();
  return await d.getAllAsync<MinerSnapshot>(
    `SELECT * FROM miner_snapshots
     WHERE minerId = ?
     ORDER BY timestamp DESC
     LIMIT ?`,
    [minerId, limit]
  );
}

export async function cleanupOldSnapshots(
  olderThan: number = 7 * 24 * 60 * 60 * 1000
): Promise<void> {
  const d = await getDb();
  const cutoff = Date.now() - olderThan;
  await d.runAsync('DELETE FROM miner_snapshots WHERE timestamp < ?', [cutoff]);
}
