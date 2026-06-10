import * as SQLite from 'expo-sqlite';
import { Miner, MinerSnapshot } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

interface MinerRow {
  id: string; name: string; ip: string; port: number;
  addedAt: number; lastSeen: number;
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('hashwatch.db');
    await initTables();
  }
  return db;
}

async function initTables(): Promise<void> {
  if (!db) return;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS miners (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      ip TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 80,
      addedAt INTEGER NOT NULL,
      lastSeen INTEGER NOT NULL DEFAULT 0
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
  const rows = await d.getAllAsync<MinerRow>(
    'SELECT * FROM miners'
  );
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    ip: r.ip,
    port: r.port,
    addedAt: r.addedAt,
    lastSeen: r.lastSeen,
    info: null,
    status: null,
    isOnline: false,
  }));
}

export async function saveMiner(m: Miner): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    `INSERT OR REPLACE INTO miners (id, name, ip, port, addedAt, lastSeen)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [m.id, m.name, m.ip, m.port, m.addedAt, m.lastSeen]
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
