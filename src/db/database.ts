import { Platform } from 'react-native';
import { Miner, MinerSnapshot } from '../types';
import type { SQLiteDatabase } from 'expo-sqlite';

const isWeb = Platform.OS === 'web';

interface MinerRow {
  id: string; name: string; ip: string; port: number;
  addedAt: number; lastSeen: number;
}

let db: SQLiteDatabase | null = null;

async function getDb(): Promise<SQLiteDatabase | WebDb> {
  if (db) return db;
  if (isWeb) {
    return createWebDb();
  }
  const SQLite = await import('expo-sqlite');
  db = await SQLite.openDatabaseAsync('hashwatch.db');
  if (db) await initTables(db);
  return db;
}

type WebDb = ReturnType<typeof createWebDb>;

async function initTables(d: any): Promise<void> {
  if (isWeb) return;
  await d.execAsync(`
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

function createWebDb() {
  const _miners: Miner[] = [];
  const _snapshots: MinerSnapshot[] = [];
  const _settings: { key: string; value: string }[] = [];
  return {
    _miners,
    _snapshots,
    _settings,
    getFirstAsync: async (_sql: string, _params: any[]) => null,
    getAllAsync: async (_sql: string, _params?: any[]) => [],
    runAsync: async (_sql: string, _params: any[]) => {},
    execAsync: async () => {},
  };
}

function parseTable(sql: string): string {
  const m = sql.match(/(?:FROM|INTO|TABLE)\s+(\w+)/i);
  return m ? m[1] : '';
}

function extractColumns(sql: string): string[] {
  const m = sql.match(/\(([^)]+)\)/);
  if (!m) return [];
  return m[1].split(',').map((s: string) => s.trim().split(/\s+/)[0]);
}

function extractCol(sql: string, index: number): string {
  const cols = extractColumns(sql);
  return cols[index] || 'id';
}

export async function getSetting(key: string): Promise<string | null> {
  const d = await getDb();
  if (isWeb) {
    const w = d as WebDb;
    const settings = w._settings || [];
    return settings.find((s: any) => s.key === key)?.value || null;
  }
  const row = await (d as SQLiteDatabase).getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?', [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const d = await getDb();
  if (isWeb) {
    const w = d as WebDb;
    if (!w._settings) w._settings = [];
    const settings = w._settings;
    const idx = settings.findIndex((s: any) => s.key === key);
    if (idx >= 0) settings[idx] = { key, value };
    else settings.push({ key, value });
    return;
  }
  await (d as SQLiteDatabase).runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function loadMiners(): Promise<Miner[]> {
  const d = await getDb();
  if (isWeb) {
    const w = d as WebDb;
    return w._miners || [];
  }
  const rows = await (d as SQLiteDatabase).getAllAsync<MinerRow>('SELECT * FROM miners');
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
  if (isWeb) {
    const w = d as WebDb;
    if (!w._miners) w._miners = [];
    const miners = w._miners;
    const idx = miners.findIndex((x: Miner) => x.id === m.id);
    if (idx >= 0) miners[idx] = m;
    else miners.push(m);
    return;
  }
  await (d as SQLiteDatabase).runAsync(
    `INSERT OR REPLACE INTO miners (id, name, ip, port, addedAt, lastSeen)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [m.id, m.name, m.ip, m.port, m.addedAt, m.lastSeen]
  );
}

export async function deleteMiner(id: string): Promise<void> {
  const d = await getDb();
  if (isWeb) {
    const w = d as WebDb;
    if (w._miners) {
      w._miners = w._miners.filter((m: Miner) => m.id !== id);
    }
    return;
  }
  await (d as SQLiteDatabase).runAsync('DELETE FROM miners WHERE id = ?', [id]);
  await (d as SQLiteDatabase).runAsync('DELETE FROM miner_snapshots WHERE minerId = ?', [id]);
}

export async function saveSnapshot(s: MinerSnapshot): Promise<void> {
  const d = await getDb();
  if (isWeb) {
    const w = d as WebDb;
    if (!w._snapshots) w._snapshots = [];
    w._snapshots.push(s);
    return;
  }
  await (d as SQLiteDatabase).runAsync(
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
  if (isWeb) {
    const w = d as WebDb;
    return (w._snapshots || [])
      .filter((s: MinerSnapshot) => s.minerId === minerId)
      .sort((a: MinerSnapshot, b: MinerSnapshot) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  return await (d as SQLiteDatabase).getAllAsync<MinerSnapshot>(
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
  if (isWeb) {
    const w = d as WebDb;
    const cutoff = Date.now() - olderThan;
    if (w._snapshots) {
      w._snapshots = w._snapshots.filter(
        (s: MinerSnapshot) => s.timestamp >= cutoff
      );
    }
    return;
  }
  const cutoff = Date.now() - olderThan;
  await (d as SQLiteDatabase).runAsync('DELETE FROM miner_snapshots WHERE timestamp < ?', [cutoff]);
}
