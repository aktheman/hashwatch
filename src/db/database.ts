import { Miner, MinerSnapshot, Wallet } from '../types';

const STORAGE_KEY_MINERS = 'hashwatch_miners';
const STORAGE_KEY_SNAPSHOTS = 'hashwatch_snapshots';
const STORAGE_KEY_SETTINGS = 'hashwatch_settings';
const STORAGE_KEY_WALLETS = 'hashwatch_wallets';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

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
  const miners = loadJSON<Miner[]>(STORAGE_KEY_MINERS, []);
  const idx = miners.findIndex((x) => x.id === m.id);
  if (idx >= 0) miners[idx] = m;
  else miners.push(m);
  saveJSON(STORAGE_KEY_MINERS, miners);
}

export async function deleteMiner(id: string): Promise<void> {
  let miners = loadJSON<Miner[]>(STORAGE_KEY_MINERS, []);
  miners = miners.filter((m) => m.id !== id);
  saveJSON(STORAGE_KEY_MINERS, miners);
  const snapshots = loadJSON<MinerSnapshot[]>(STORAGE_KEY_SNAPSHOTS, []);
  saveJSON(
    STORAGE_KEY_SNAPSHOTS,
    snapshots.filter((s) => s.minerId !== id),
  );
}

export async function saveSnapshot(s: MinerSnapshot): Promise<void> {
  const snapshots = loadJSON<MinerSnapshot[]>(STORAGE_KEY_SNAPSHOTS, []);
  snapshots.push(s);
  saveJSON(STORAGE_KEY_SNAPSHOTS, snapshots);
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
