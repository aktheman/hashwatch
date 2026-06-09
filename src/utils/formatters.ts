export function formatHashrate(hashRate: number, unit?: string): string {
  if (hashRate === 0) return '0 H/s';
  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'];
  let value = hashRate;
  let unitIndex = 0;
  if (unit) {
    unitIndex = units.indexOf(unit);
    if (unitIndex === -1) unitIndex = 0;
  } else {
    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000;
      unitIndex++;
    }
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
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
