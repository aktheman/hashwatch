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

const BLOCK_REWARD_BTC = 3.125;
const BLOCKS_PER_DAY = 144;
const NETWORK_HASHRATE = 750_000_000_000_000_000_000;

export function estimateBTCPerDay(hashesPerSecond: number): number {
  const shareOfNetwork = hashesPerSecond / NETWORK_HASHRATE;
  return shareOfNetwork * BLOCKS_PER_DAY * BLOCK_REWARD_BTC;
}

export function formatBTC(value: number): string {
  if (value >= 1) return `${value.toFixed(4)} BTC`;
  if (value >= 0.001) return `${(value * 1000).toFixed(2)} mBTC`;
  if (value >= 0.000001) return `${(value * 1000000).toFixed(0)} μBTC`;
  return `${(value * 100000000).toFixed(0)} sat`;
}

export function estimateUSDBTC(): number {
  return 85000;
}

export function formatUSD(satsPerDay: number): string {
  const btcPrice = estimateUSDBTC();
  const btc = satsPerDay / 100000000;
  return `$${(btc * btcPrice).toFixed(2)}`;
}
