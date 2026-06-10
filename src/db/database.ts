import { Miner, MinerSnapshot } from '../types';

const _miners: Miner[] = [];
const _snapshots: MinerSnapshot[] = [];
const _settings: { key: string; value: string }[] = [];

export async function getSetting(key: string): Promise<string | null> {
  return _settings.find((s) => s.key === key)?.value || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const idx = _settings.findIndex((s) => s.key === key);
  if (idx >= 0) _settings[idx] = { key, value };
  else _settings.push({ key, value });
}

export async function loadMiners(): Promise<Miner[]> {
  return _miners;
}

export async function saveMiner(m: Miner): Promise<void> {
  const idx = _miners.findIndex((x) => x.id === m.id);
  if (idx >= 0) _miners[idx] = m;
  else _miners.push(m);
}

export async function deleteMiner(id: string): Promise<void> {
  const idx = _miners.findIndex((m) => m.id === id);
  if (idx >= 0) _miners.splice(idx, 1);
}

export async function saveSnapshot(s: MinerSnapshot): Promise<void> {
  _snapshots.push(s);
}

export async function getSnapshots(
  minerId: string,
  limit: number = 100
): Promise<MinerSnapshot[]> {
  return _snapshots
    .filter((s) => s.minerId === minerId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export async function cleanupOldSnapshots(
  olderThan: number = 7 * 24 * 60 * 60 * 1000
): Promise<void> {
  const cutoff = Date.now() - olderThan;
  for (let i = _snapshots.length - 1; i >= 0; i--) {
    if (_snapshots[i].timestamp < cutoff) {
      _snapshots.splice(i, 1);
    }
  }
}
