const UNIT_MULTIPLIERS: Record<string, number> = {
  'H/s': 1,
  'KH/s': 1e3,
  'MH/s': 1e6,
  'GH/s': 1e9,
  'TH/s': 1e12,
  'PH/s': 1e15,
};

export function toHashesPerSecond(hashRate: number, unit: string = 'GH/s'): number {
  return hashRate * (UNIT_MULTIPLIERS[unit] ?? UNIT_MULTIPLIERS['GH/s']);
}

export function formatHashrateValue(hashesPerSecond: number): string {
  if (hashesPerSecond === 0) return '0 H/s';
  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'];
  let value = hashesPerSecond;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function formatHashrateWithUnit(hashRate: number, unit?: string): string {
  if (unit) {
    return `${hashRate.toFixed(1)} ${unit}`;
  }
  return formatHashrateValue(toHashesPerSecond(hashRate, 'GH/s'));
}
