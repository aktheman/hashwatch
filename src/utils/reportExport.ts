import { Platform, Share } from 'react-native';
import { Miner, MinerSnapshot } from '../types';

export interface ReportOptions {
  format: 'csv' | 'json';
  dateRange: { from: number; to: number };
  minerIds?: string[];
  includeSnapshots: boolean;
  includeEarnings: boolean;
  includePoolStats: boolean;
  includeHealth: boolean;
}

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

function computeAcceptRate(accepted: number | undefined, rejected: number | undefined): number {
  const a = accepted ?? 0;
  const r = rejected ?? 0;
  const total = a + r;
  return total > 0 ? (a / total) * 100 : 0;
}

function formatUptime(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return '0h';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function reportCSV(
  miners: Miner[],
  snapshots: MinerSnapshot[],
  options: ReportOptions,
): string {
  const filteredMiners = filterMiners(miners, options);
  const filteredSnapshots = filterSnapshots(snapshots, options);

  const headers: string[] = [
    'Miner Name',
    'IP',
    'Group',
    'Online',
    'Hashrate',
    'Temperature',
    'Power',
    'Efficiency (W/TH)',
    'Shares Accepted',
    'Shares Rejected',
    'Accept Rate %',
    'Uptime',
    'Pool',
    'Best Diff',
    'Estimated BTC/Day',
    'Estimated USD/Day',
  ];

  if (options.includeSnapshots) {
    headers.push('Snapshot Count');
  }
  if (options.includePoolStats) {
    headers.push('Pool Port', 'Pool User', 'Pool Response (ms)');
  }
  if (options.includeHealth) {
    headers.push('Fan Speed', 'Fan RPM', 'Core Voltage', 'VR Temp');
  }

  const minerSnapCounts = new Map<string, number>();
  for (const s of filteredSnapshots) {
    minerSnapCounts.set(s.minerId, (minerSnapCounts.get(s.minerId) ?? 0) + 1);
  }

  const rows = filteredMiners.map((m) => {
    const hr = m.status?.hashRate ?? 0;
    const unit = m.status?.hashRateUnit ?? 'GH/s';
    const power = m.status?.power ?? 0;
    const eff = computeEfficiency(power, hr, unit);
    const acceptRate = computeAcceptRate(m.status?.sharesAccepted, m.status?.sharesRejected);

    const cols: (string | number)[] = [
      m.name,
      m.ip,
      m.group || '',
      m.isOnline ? 'Yes' : 'No',
      `${hr} ${unit}`,
      m.status?.temperature ?? '',
      power,
      eff > 0 ? eff.toFixed(2) : '',
      m.status?.sharesAccepted ?? 0,
      m.status?.sharesRejected ?? 0,
      acceptRate.toFixed(1),
      formatUptime(m.status?.uptimeSeconds),
      m.status?.pool || '',
      m.status?.bestDiff || '',
      '',
      '',
    ];

    if (options.includeSnapshots) {
      cols.push(minerSnapCounts.get(m.id) ?? 0);
    }
    if (options.includePoolStats) {
      cols.push(
        m.status?.poolPort ?? '',
        m.status?.poolUser || '',
        m.status?.poolResponseTime ?? '',
      );
    }
    if (options.includeHealth) {
      cols.push(
        m.status?.fanSpeed ?? '',
        m.status?.fanRpm ?? '',
        m.status?.coreVoltage ?? '',
        m.status?.vrTemp ?? '',
      );
    }

    return cols.map(escapeCSV).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function reportJSON(
  miners: Miner[],
  snapshots: MinerSnapshot[],
  options: ReportOptions,
): Record<string, unknown> {
  const filteredMiners = filterMiners(miners, options);
  const filteredSnapshots = filterSnapshots(snapshots, options);

  const minerData = filteredMiners.map((m) => {
    const hr = m.status?.hashRate ?? 0;
    const unit = m.status?.hashRateUnit ?? 'GH/s';
    const power = m.status?.power ?? 0;
    const eff = computeEfficiency(power, hr, unit);
    const acceptRate = computeAcceptRate(m.status?.sharesAccepted, m.status?.sharesRejected);

    const entry: Record<string, unknown> = {
      name: m.name,
      ip: m.ip,
      group: m.group || null,
      online: m.isOnline,
      hashrate: `${hr} ${unit}`,
      temperature: m.status?.temperature ?? null,
      power,
      efficiency: eff > 0 ? Number(eff.toFixed(2)) : null,
      sharesAccepted: m.status?.sharesAccepted ?? 0,
      sharesRejected: m.status?.sharesRejected ?? 0,
      acceptRate: Number(acceptRate.toFixed(1)),
      uptime: formatUptime(m.status?.uptimeSeconds),
      pool: m.status?.pool || null,
      bestDiff: m.status?.bestDiff || null,
    };

    if (options.includePoolStats) {
      entry.poolPort = m.status?.poolPort ?? null;
      entry.poolUser = m.status?.poolUser || null;
      entry.poolResponseTime = m.status?.poolResponseTime ?? null;
    }

    if (options.includeHealth) {
      entry.fanSpeed = m.status?.fanSpeed ?? null;
      entry.fanRpm = m.status?.fanRpm ?? null;
      entry.coreVoltage = m.status?.coreVoltage ?? null;
      entry.vrTemp = m.status?.vrTemp ?? null;
    }

    if (options.includeSnapshots) {
      entry.snapshots = filteredSnapshots
        .filter((s) => s.minerId === m.id)
        .map((s) => ({
          timestamp: new Date(s.timestamp).toISOString(),
          hashRate: `${s.hashRate} ${s.hashRateUnit ?? unit}`,
          temperature: s.temperature,
          power: s.power,
          sharesAccepted: s.sharesAccepted,
          sharesRejected: s.sharesRejected,
        }));
    }

    return entry;
  });

  return {
    generatedAt: new Date().toISOString(),
    dateRange: {
      from: new Date(options.dateRange.from).toISOString(),
      to: new Date(options.dateRange.to).toISOString(),
    },
    minerCount: minerData.length,
    miners: minerData,
  };
}

function filterMiners(miners: Miner[], options: ReportOptions): Miner[] {
  let result = miners;
  if (options.minerIds && options.minerIds.length > 0) {
    const idSet = new Set(options.minerIds);
    result = result.filter((m) => idSet.has(m.id));
  }
  return result;
}

function filterSnapshots(snapshots: MinerSnapshot[], options: ReportOptions): MinerSnapshot[] {
  const { from, to } = options.dateRange;
  let result = snapshots.filter((s) => s.timestamp >= from && s.timestamp <= to);
  if (options.minerIds && options.minerIds.length > 0) {
    const idSet = new Set(options.minerIds);
    result = result.filter((s) => idSet.has(s.minerId));
  }
  return result;
}

export function downloadReport(
  content: string | Record<string, unknown>,
  filename: string,
  mimeType: string,
): void {
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  if (Platform.OS === 'web') {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  Share.share({ message: text, title: filename });
}
