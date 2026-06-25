import { Miner, MinerSnapshot, Wallet } from '../types';

const STORAGE_KEY_MINERS = 'hashwatch_miners';
const STORAGE_KEY_SNAPSHOTS = 'hashwatch_snapshots';
const STORAGE_KEY_SETTINGS = 'hashwatch_settings';
const STORAGE_KEY_WALLETS = 'hashwatch_wallets';
const STORAGE_KEY_SCHEMA = 'hashwatch_schema_version';
const STORAGE_KEY_ALERT_HISTORY = 'hashwatch_alert_history';
const STORAGE_KEY_NOTIFICATION_HISTORY = 'hashwatch_notification_history';
const CURRENT_SCHEMA_VERSION = 3;

let _writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite(fn: () => void): void {
  _writeQueue = _writeQueue.then(fn, fn);
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

function getSchemaVersion(): number {
  return parseInt(localStorage.getItem(STORAGE_KEY_SCHEMA) || '0', 10);
}

function setSchemaVersion(v: number): void {
  localStorage.setItem(STORAGE_KEY_SCHEMA, String(v));
}

async function migrate(): Promise<void> {
  const version = getSchemaVersion();
  if (version >= CURRENT_SCHEMA_VERSION) return;

  if (version < 1) {
    const miners = loadJSON<Record<string, unknown>[]>(STORAGE_KEY_MINERS, []);
    const migrated = miners.map((m: Record<string, unknown>) => ({
      ...m,
      remoteId: (m.remoteId as string) || undefined,
      apiPath: (m.apiPath as string) || undefined,
      statusPath: (m.statusPath as string) || undefined,
      walletId: (m.walletId as string) || undefined,
    }));
    saveJSON(STORAGE_KEY_MINERS, migrated);
    setSchemaVersion(1);
  }

  if (version < 2) {
    const snapshots = loadJSON<Record<string, unknown>[]>(STORAGE_KEY_SNAPSHOTS, []);
    const migrated = snapshots.map((s: Record<string, unknown>) => ({
      ...s,
      hashRateUnit: (s.hashRateUnit as string) || 'GH/s',
    }));
    saveJSON(STORAGE_KEY_SNAPSHOTS, migrated);
    setSchemaVersion(2);
  }

  if (version < 3) {
    const miners = loadJSON<Record<string, unknown>[]>(STORAGE_KEY_MINERS, []);
    const migrated = miners.map((m: Record<string, unknown>) => ({
      ...m,
      notes: (m.notes as string) || undefined,
    }));
    saveJSON(STORAGE_KEY_MINERS, migrated);
    setSchemaVersion(3);
  }
}

// Run migration at module load
migrate();

export async function getSetting(key: string): Promise<string | null> {
  const settings = loadJSON<Record<string, string>>(STORAGE_KEY_SETTINGS, {});
  return settings[key] || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const settings = loadJSON<Record<string, string>>(STORAGE_KEY_SETTINGS, {});
  settings[key] = value;
  saveJSON(STORAGE_KEY_SETTINGS, settings);
}

export async function loadMiners(): Promise<Miner[]> {
  return loadJSON<Miner[]>(STORAGE_KEY_MINERS, []);
}

export async function saveMiner(m: Miner): Promise<void> {
  return new Promise<void>((resolve) => {
    enqueueWrite(() => {
      const miners = loadJSON<Miner[]>(STORAGE_KEY_MINERS, []);
      const idx = miners.findIndex((x) => x.id === m.id);
      if (idx >= 0) miners[idx] = m;
      else miners.push(m);
      saveJSON(STORAGE_KEY_MINERS, miners);
      resolve();
    });
  });
}

export async function deleteMiner(id: string): Promise<void> {
  return new Promise<void>((resolve) => {
    enqueueWrite(() => {
      let miners = loadJSON<Miner[]>(STORAGE_KEY_MINERS, []);
      miners = miners.filter((m) => m.id !== id);
      saveJSON(STORAGE_KEY_MINERS, miners);
      const snapshots = loadJSON<MinerSnapshot[]>(STORAGE_KEY_SNAPSHOTS, []);
      saveJSON(
        STORAGE_KEY_SNAPSHOTS,
        snapshots.filter((s) => s.minerId !== id),
      );
      resolve();
    });
  });
}

export async function saveSnapshot(s: MinerSnapshot): Promise<void> {
  return new Promise<void>((resolve) => {
    enqueueWrite(() => {
      const snapshots = loadJSON<MinerSnapshot[]>(STORAGE_KEY_SNAPSHOTS, []);
      snapshots.push(s);
      saveJSON(STORAGE_KEY_SNAPSHOTS, snapshots);
      resolve();
    });
  });
}

export async function getSnapshots(minerId: string, limit: number = 100): Promise<MinerSnapshot[]> {
  const snapshots = loadJSON<MinerSnapshot[]>(STORAGE_KEY_SNAPSHOTS, []);
  return snapshots
    .filter((s) => s.minerId === minerId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export async function loadWallets(): Promise<Wallet[]> {
  return loadJSON<Wallet[]>(STORAGE_KEY_WALLETS, []);
}

export async function saveWallet(w: Wallet): Promise<void> {
  const wallets = loadJSON<Wallet[]>(STORAGE_KEY_WALLETS, []);
  const idx = wallets.findIndex((x) => x.id === w.id);
  if (idx >= 0) wallets[idx] = w;
  else wallets.push(w);
  saveJSON(STORAGE_KEY_WALLETS, wallets);
}

export async function deleteWallet(id: string): Promise<void> {
  let wallets = loadJSON<Wallet[]>(STORAGE_KEY_WALLETS, []);
  wallets = wallets.filter((w) => w.id !== id);
  saveJSON(STORAGE_KEY_WALLETS, wallets);
}

export async function cleanupOldSnapshots(
  olderThan: number = 7 * 24 * 60 * 60 * 1000,
): Promise<void> {
  const cutoff = Date.now() - olderThan;
  const snapshots = loadJSON<MinerSnapshot[]>(STORAGE_KEY_SNAPSHOTS, []);
  const filtered = snapshots.filter((s) => s.timestamp >= cutoff);
  saveJSON(STORAGE_KEY_SNAPSHOTS, filtered);
}

export interface FullExport {
  miners: Miner[];
  snapshots: MinerSnapshot[];
  wallets: Wallet[];
  settings: Record<string, string>;
  alertHistory: unknown[];
  notificationHistory: unknown[];
}

export async function exportAllData(): Promise<FullExport> {
  const miners = loadJSON<Miner[]>(STORAGE_KEY_MINERS, []);
  const allSnapshots = loadJSON<MinerSnapshot[]>(STORAGE_KEY_SNAPSHOTS, []);
  const wallets = loadJSON<Wallet[]>(STORAGE_KEY_WALLETS, []);
  const settings = loadJSON<Record<string, string>>(STORAGE_KEY_SETTINGS, {});
  let alertHistory: unknown[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERT_HISTORY);
    if (raw) alertHistory = JSON.parse(raw);
  } catch {}
  let notificationHistory: unknown[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATION_HISTORY);
    if (raw) notificationHistory = JSON.parse(raw);
  } catch {}
  return { miners, snapshots: allSnapshots, wallets, settings, alertHistory, notificationHistory };
}

export interface ImportPayload {
  miners?: Miner[];
  snapshots?: MinerSnapshot[];
  wallets?: Wallet[];
  settings?: Record<string, string>;
  alertHistory?: unknown[];
  notificationHistory?: unknown[];
}

export async function importAllData(data: ImportPayload): Promise<void> {
  if (Array.isArray(data.miners)) {
    saveJSON(STORAGE_KEY_MINERS, data.miners);
  }
  if (Array.isArray(data.snapshots)) {
    saveJSON(STORAGE_KEY_SNAPSHOTS, data.snapshots);
  }
  if (Array.isArray(data.wallets)) {
    saveJSON(STORAGE_KEY_WALLETS, data.wallets);
  }
  if (data.settings) {
    const existing = loadJSON<Record<string, string>>(STORAGE_KEY_SETTINGS, {});
    saveJSON(STORAGE_KEY_SETTINGS, { ...existing, ...data.settings });
  }
  if (Array.isArray(data.alertHistory)) {
    saveJSON(STORAGE_KEY_ALERT_HISTORY, data.alertHistory);
  }
  if (Array.isArray(data.notificationHistory)) {
    saveJSON(STORAGE_KEY_NOTIFICATION_HISTORY, data.notificationHistory);
  }
}
