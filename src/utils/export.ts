import { Platform, Share } from 'react-native';
import * as DB from '../db/database';
import { Miner, MinerSnapshot, Wallet } from '../types';
import { toHashesPerSecond } from './hashrate';

type SnapshotKey = keyof MinerSnapshot;

function escapeCSV(val: string | number | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function computeEfficiency(power: number, hashRate: number, hashRateUnit?: string): number {
  if (power <= 0 || hashRate <= 0) return 0;
  const ths = hashRate * (hashRateUnit?.toLowerCase().includes('t') ? 1 : 0.001);
  return ths > 0 ? power / ths : 0;
}

function snapshotsToCSV(snapshots: MinerSnapshot[], miners: Miner[]): string {
  const minerMap = new Map(miners.map((m) => [m.id, m.name || m.ip]));
  const headers: string[] = [
    'Miner',
    'Timestamp',
    'Hash Rate',
    'Unit',
    'Temperature',
    'Voltage',
    'Current',
    'Power',
    'Efficiency (J/TH)',
    'Shares Accepted',
    'Shares Rejected',
    'Uptime (s)',
    'Frequency',
  ];
  const rows = snapshots.map((snap) => {
    const eff = computeEfficiency(snap.power, snap.hashRate, snap.hashRateUnit);
    return [
      escapeCSV(minerMap.get(snap.minerId) || snap.minerId),
      escapeCSV(new Date(snap.timestamp).toISOString()),
      escapeCSV(snap.hashRate),
      escapeCSV(snap.hashRateUnit),
      escapeCSV(snap.temperature),
      escapeCSV(snap.voltage),
      escapeCSV(snap.current),
      escapeCSV(snap.power),
      escapeCSV(eff.toFixed(2)),
      escapeCSV(snap.sharesAccepted),
      escapeCSV(snap.sharesRejected),
      escapeCSV(snap.uptimeSeconds),
      escapeCSV(snap.frequency),
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

function minersToCSV(miners: Miner[], powerCost: number): string {
  const headers: string[] = [
    'Name',
    'IP',
    'Port',
    'Online',
    'Hash Rate',
    'Unit',
    'Temperature',
    'VR Temp',
    'Voltage',
    'Current',
    'Power',
    'Efficiency (J/TH)',
    'Core Voltage',
    'Frequency',
    'Fan Speed',
    'Fan RPM',
    'Shares Accepted',
    'Shares Rejected',
    'Best Diff',
    'Best Session Diff',
    'Uptime (s)',
    'Pool',
    'Pool Port',
    'Pool User',
    'Pool Response (ms)',
    'Group',
    'Wallet',
    'Cost/Day ($)',
  ];
  const rows = miners.map((m) => {
    const hr = m.status?.hashRate ?? 0;
    const unit = m.status?.hashRateUnit ?? 'GH/s';
    const power = m.status?.power ?? 0;
    const eff = computeEfficiency(power, hr, unit);
    const hps = toHashesPerSecond(hr, unit);
    const costPerDay = power > 0 ? (power / 1000) * powerCost * 24 : 0;
    return [
      escapeCSV(m.name),
      escapeCSV(m.ip),
      escapeCSV(m.port),
      escapeCSV(m.isOnline ? 'Yes' : 'No'),
      escapeCSV(hr),
      escapeCSV(unit),
      escapeCSV(m.status?.temperature),
      escapeCSV(m.status?.vrTemp),
      escapeCSV(m.status?.voltage),
      escapeCSV(m.status?.current),
      escapeCSV(power),
      escapeCSV(eff.toFixed(2)),
      escapeCSV(m.status?.coreVoltage),
      escapeCSV(m.status?.frequency),
      escapeCSV(m.status?.fanSpeed),
      escapeCSV(m.status?.fanRpm),
      escapeCSV(m.status?.sharesAccepted),
      escapeCSV(m.status?.sharesRejected),
      escapeCSV(m.status?.bestDiff),
      escapeCSV(m.status?.bestSessionDiff),
      escapeCSV(m.status?.uptimeSeconds),
      escapeCSV(m.status?.pool),
      escapeCSV(m.status?.poolPort),
      escapeCSV(m.status?.poolUser),
      escapeCSV(m.status?.poolResponseTime),
      escapeCSV(m.group),
      escapeCSV(m.walletId),
      escapeCSV(costPerDay.toFixed(4)),
    ].join(',');
  });
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

export async function exportMinerStatusCSV(): Promise<void> {
  const miners = await DB.loadMiners();
  const powerCostRaw = await DB.getSetting('power_cost');
  const powerCost = parseFloat(powerCostRaw || '0');

  const csv = minersToCSV(miners, powerCost);
  const filename = `hashwatch_miners_${Date.now()}.csv`;
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
