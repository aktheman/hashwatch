import { Miner, MinerSnapshot, Wallet } from '../types';
import * as SQLite from 'expo-sqlite';

interface MinerRow {
  id: string;
  name: string;
  ip: string;
  port: number;
  addedAt: number;
  lastSeen: number;
  walletId?: string;
  remoteId?: string;
  apiPath?: string;
  statusPath?: string;
  info?: string;
  status?: string;
}

let db: any = null;
let dbInit: Promise<void> | null = null;

async function getDb() {
  if (db) return db;
  if (!dbInit) {
    dbInit = (async () => {
      try {
        db = await SQLite.openDatabaseAsync('hashwatch.db');
        await initTables(db);
      } catch (e) {
        dbInit = null;
        throw e;
      }
    })();
  }
  await dbInit;
  return db;
}

async function initTables(d: any): Promise<void> {
  await d.execAsync(`
    CREATE TABLE IF NOT EXISTS miners (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      ip TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 80,
      addedAt INTEGER NOT NULL,
      lastSeen INTEGER NOT NULL DEFAULT 0,
      apiPath TEXT DEFAULT NULL,
      statusPath TEXT DEFAULT NULL,
      info TEXT DEFAULT NULL,
      status TEXT DEFAULT NULL
    );
    CREATE TABLE IF NOT EXISTS miner_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      minerId TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      hashRate REAL NOT NULL,
      hashRateUnit TEXT DEFAULT 'GH/s',
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
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6C63FF',
      createdAt INTEGER NOT NULL
    );
  `);
  const cols = ['apiPath', 'statusPath', 'info', 'status', 'remoteId', 'walletId'];
  for (const col of cols) {
    try {
      await d.execAsync(`ALTER TABLE miners ADD COLUMN ${col} TEXT DEFAULT NULL`);
    } catch {}
  }
  try {
    await d.execAsync(`ALTER TABLE miner_snapshots ADD COLUMN hashRateUnit TEXT DEFAULT 'GH/s'`);
  } catch {}
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  await d.runAsync('DELETE FROM miner_snapshots WHERE timestamp < ?', [cutoff]);
}

export async function getSetting(key: string): Promise<string | null> {
  const d = await getDb();
  const row: any = await d.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const d = await getDb();
  await d.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export async function loadMiners(): Promise<Miner[]> {
  const d = await getDb();
  const rows: MinerRow[] = await d.getAllAsync('SELECT * FROM miners');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    ip: r.ip,
    port: r.port,
    addedAt: r.addedAt,
    lastSeen: r.lastSeen,
    walletId: r.walletId || undefined,
    remoteId: r.remoteId || undefined,
    apiPath: r.apiPath || undefined,
    statusPath: r.statusPath || undefined,
    info: r.info && r.info !== 'null' && r.info !== '' ? JSON.parse(r.info) : null,
    status: r.status && r.status !== 'null' && r.status !== '' ? JSON.parse(r.status) : null,
    isOnline: false,
  }));
}

export async function saveMiner(m: Miner): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    `INSERT OR REPLACE INTO miners (id, name, ip, port, addedAt, lastSeen, remoteId, apiPath, statusPath, info, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      m.id,
      m.name,
      m.ip,
      m.port,
      m.addedAt,
      m.lastSeen,
      m.remoteId || null,
      m.apiPath || null,
      m.statusPath || null,
      m.info ? JSON.stringify(m.info) : null,
      m.status ? JSON.stringify(m.status) : null,
    ],
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
     (minerId, timestamp, hashRate, hashRateUnit, temperature, voltage, current, power,
      sharesAccepted, sharesRejected, uptimeSeconds, frequency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.minerId,
      s.timestamp,
      s.hashRate,
      s.hashRateUnit || 'GH/s',
      s.temperature,
      s.voltage,
      s.current,
      s.power,
      s.sharesAccepted,
      s.sharesRejected,
      s.uptimeSeconds,
      s.frequency,
    ],
  );
}

export async function getSnapshots(minerId: string, limit: number = 100): Promise<MinerSnapshot[]> {
  const d = await getDb();
  const snapshots: MinerSnapshot[] = await d.getAllAsync(
    `SELECT * FROM miner_snapshots
     WHERE minerId = ?
     ORDER BY timestamp DESC
     LIMIT ?`,
    [minerId, limit],
  );
  return snapshots;
}

export async function loadWallets(): Promise<Wallet[]> {
  const d = await getDb();
  const rows: Wallet[] = await d.getAllAsync('SELECT * FROM wallets ORDER BY createdAt DESC');
  return rows;
}

export async function saveWallet(w: Wallet): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    `INSERT OR REPLACE INTO wallets (id, name, address, color, createdAt) VALUES (?, ?, ?, ?, ?)`,
    [w.id, w.name, w.address, w.color, w.createdAt],
  );
}

export async function deleteWallet(id: string): Promise<void> {
  const d = await getDb();
  await d.runAsync('DELETE FROM wallets WHERE id = ?', [id]);
}

export async function cleanupOldSnapshots(
  olderThan: number = 7 * 24 * 60 * 60 * 1000,
): Promise<void> {
  const d = await getDb();
  const cutoff = Date.now() - olderThan;
  await d.runAsync('DELETE FROM miner_snapshots WHERE timestamp < ?', [cutoff]);
}
