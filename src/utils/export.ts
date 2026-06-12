import { Platform, Share } from 'react-native';
import * as DB from '../db/database';
import { Miner, MinerSnapshot } from '../types';

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

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({
    message: csv,
    title: filename,
  });
}
