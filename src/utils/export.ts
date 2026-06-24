import { Platform, Share } from 'react-native';
import * as DB from '../db/database';
import { Miner, MinerSnapshot, Wallet } from '../types';

type SnapshotKey = keyof MinerSnapshot;

function escapeCSV(val: string | number | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function snapshotsToCSV(snapshots: MinerSnapshot[], miners: Miner[]): string {
  const minerMap = new Map(miners.map((m) => [m.id, m.name || m.ip]));
  const headers: SnapshotKey[] = [
    'miner' as SnapshotKey,
    'timestamp',
    'hashRate',
    'hashRateUnit',
    'temperature',
    'voltage',
    'current',
    'power',
    'sharesAccepted',
    'sharesRejected',
    'uptimeSeconds',
    'frequency',
  ];
  const rows = snapshots.map((snap) =>
    headers
      .map((h) => {
        if (h === ('miner' as SnapshotKey))
          return escapeCSV(minerMap.get(snap.minerId) || snap.minerId);
        if (h === 'timestamp') return escapeCSV(new Date(snap.timestamp).toISOString());
        return escapeCSV(snap[h]);
      })
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

function triggerDownload(content: string, filename: string, mime: string): void {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  Share.share({ message: content, title: filename });
}

export async function exportAllData(): Promise<void> {
  const miners = await DB.loadMiners();
  const allSnapshots: MinerSnapshot[] = [];
  for (const m of miners) {
    const snaps = await DB.getSnapshots(m.id, 10000);
    allSnapshots.push(...snaps);
  }
  allSnapshots.sort((a, b) => a.timestamp - b.timestamp);

  const csv = snapshotsToCSV(allSnapshots, miners);
  const filename = `hashwatch_export_${Date.now()}.csv`;
  triggerDownload(csv, filename, 'text/csv');
}

export interface ExportJSON {
  version: 2;
  exportedAt: string;
  miners: Miner[];
  snapshots: MinerSnapshot[];
  wallets: Wallet[];
  settings: Record<string, string>;
}

export async function exportJSON(): Promise<void> {
  const miners = await DB.loadMiners();
  const wallets = await DB.loadWallets();
  const allSnapshots: MinerSnapshot[] = [];
  for (const m of miners) {
    const snaps = await DB.getSnapshots(m.id, 10000);
    allSnapshots.push(...snaps);
  }
  allSnapshots.sort((a, b) => a.timestamp - b.timestamp);

  const settingsRaw = {} as Record<string, string>;
  const settingKeys = ['power_cost', 'auto_scan', 'theme_mode', 'onboarding_complete', 'api_url'];
  for (const key of settingKeys) {
    const val = await DB.getSetting(key);
    if (val !== null) settingsRaw[key] = val;
  }

  const data: ExportJSON = {
    version: 2,
    exportedAt: new Date().toISOString(),
    miners,
    snapshots: allSnapshots,
    wallets,
    settings: settingsRaw,
  };

  const json = JSON.stringify(data, null, 2);
  const filename = `hashwatch_backup_${Date.now()}.json`;
  triggerDownload(json, filename, 'application/json');
}

export async function importFromJSON(jsonStr: string): Promise<{
  miners: number;
  snapshots: number;
  wallets: number;
}> {
  const data: ExportJSON = JSON.parse(jsonStr);

  if (!data.version || data.version < 2) {
    throw new Error('Unsupported backup format version');
  }

  const seenMinerIds = new Set<string>();

  for (const m of data.miners) {
    await DB.saveMiner(m);
    seenMinerIds.add(m.id);
  }

  for (const snap of data.snapshots) {
    if (seenMinerIds.has(snap.minerId)) {
      await DB.saveSnapshot(snap);
    }
  }

  for (const w of data.wallets) {
    await DB.saveWallet(w);
  }

  if (data.settings) {
    for (const [key, value] of Object.entries(data.settings)) {
      await DB.setSetting(key, value);
    }
  }

  return {
    miners: data.miners.length,
    snapshots: data.snapshots.length,
    wallets: data.wallets.length,
  };
}

export async function importFromCSV(
  csvText: string,
): Promise<{ imported: number; errors: string[] }> {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2)
    return { imported: 0, errors: ['CSV must have a header row and at least one data row'] };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf('name');
  const ipIdx = headers.indexOf('ip');
  const portIdx = headers.indexOf('port');

  if (nameIdx === -1 || ipIdx === -1) {
    return { imported: 0, errors: ['CSV must have "name" and "ip" columns'] };
  }

  let imported = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const name = cols[nameIdx];
    const ip = cols[ipIdx];
    const port = portIdx >= 0 ? parseInt(cols[portIdx]) || 80 : 80;

    if (!name || !ip) {
      errors.push(`Row ${i}: missing name or IP`);
      continue;
    }

    try {
      const { useMinerStore } = await import('../store/miners');
      await useMinerStore.getState().addMiner(ip, port, name);
      imported++;
    } catch (e) {
      errors.push(`Row ${i} (${name}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { imported, errors };
}
