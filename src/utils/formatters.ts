import { formatHashrateValue } from './hashrate';

export function formatHashrate(hashRate: number, unit?: string): string {
  if (unit) {
    return `${hashRate.toFixed(1)} ${unit}`;
  }
  return formatHashrateValue(hashRate);
}

export function formatTemperature(temp: number): string {
  return `${temp.toFixed(0)}°C`;
}

export function formatVoltage(mv: number): string {
  return `${(mv / 1000).toFixed(3)}V`;
}

export function formatPower(watts: number): string {
  return `${watts.toFixed(2)}W`;
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function formatDifficulty(diff: string | number): string {
  const n = typeof diff === 'string' ? parseFloat(diff) : diff;
  if (isNaN(n) || n === 0) return '0';
  const units = ['', 'K', 'M', 'G', 'T', 'P'];
  let val = n;
  let i = 0;
  while (val >= 1000 && i < units.length - 1) {
    val /= 1000;
    i++;
  }
  return `${val.toFixed(1)}${units[i]}`;
}

export function formatWTHs(power: number, hashRate: number, hashRateUnit: string): string {
  const th =
    hashRateUnit === 'TH/s'
      ? hashRate
      : hashRateUnit === 'GH/s'
        ? hashRate / 1000
        : hashRateUnit === 'MH/s'
          ? hashRate / 1_000_000
          : hashRateUnit === 'KH/s'
            ? hashRate / 1_000_000_000
            : 0;
  if (th === 0) return '—';
  return `${(power / th).toFixed(1)} W/THs`;
}
