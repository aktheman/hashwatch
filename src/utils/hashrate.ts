import { HashRateUnit } from '../types';

const UNIT_MULTIPLIERS: Record<HashRateUnit, number> = {
  'H/s': 1,
  'KH/s': 1e3,
  'MH/s': 1e6,
  'GH/s': 1e9,
  'TH/s': 1e12,
  'PH/s': 1e15,
};

export function toHashesPerSecond(hashRate: number, unit: HashRateUnit = 'GH/s'): number {
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

export function formatHashrateWithUnit(hashRate: number, unit?: HashRateUnit): string {
  if (unit) {
    return `${hashRate.toFixed(1)} ${unit}`;
  }
  return formatHashrateValue(toHashesPerSecond(hashRate, 'GH/s'));
}

const BLOCK_REWARD_BTC = 3.125;
const BLOCKS_PER_DAY = 144;
let _networkHashrate = 750_000_000_000_000_000_000;

export function getNetworkHashrate(): number {
  return _networkHashrate;
}

export function setNetworkHashrate(hps: number): void {
  _networkHashrate = hps;
}

export function estimateBTCPerDay(hashesPerSecond: number): number {
  const shareOfNetwork = hashesPerSecond / _networkHashrate;
  return shareOfNetwork * BLOCKS_PER_DAY * BLOCK_REWARD_BTC;
}

export function formatBTC(value: number): string {
  if (value >= 1) return `${value.toFixed(4)} BTC`;
  if (value >= 0.001) return `${(value * 1000).toFixed(2)} mBTC`;
  if (value >= 0.000001) return `${(value * 1000000).toFixed(0)} μBTC`;
  return `${(value * 100000000).toFixed(0)} sat`;
}

let _btcPrice = 85000;
let _btcPriceHistory: number[] = [];
let _btcPricePromise: Promise<number> | null = null;
let _btcPriceTimer: ReturnType<typeof setTimeout> | null = null;

export function getBTCPrice(): number {
  return _btcPrice;
}

export function getBTCPriceHistory(): number[] {
  return _btcPriceHistory;
}

export function setBTCPrice(price: number): void {
  _btcPrice = price;
}

export async function fetchBTCPrice(): Promise<number> {
  if (_btcPricePromise) return _btcPricePromise;
  _btcPricePromise = (async () => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    if (typeof id === 'object' && id !== null && 'unref' in id) {
      (id as { unref: () => void }).unref();
    }
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
        { signal: controller.signal },
      );
      clearTimeout(id);
      if (!res.ok) return _btcPrice;
      const data = await res.json();
      _btcPrice = data?.bitcoin?.usd ?? _btcPrice;
      _btcPriceHistory = [..._btcPriceHistory.slice(-479), _btcPrice];
      return _btcPrice;
    } catch {
      clearTimeout(id);
      return _btcPrice;
    }
  })();
  const price = await _btcPricePromise;
  _btcPricePromise = null;
  return price;
}

export async function fetchNetworkHashrate(): Promise<number> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);
  if (typeof id === 'object' && id !== null && 'unref' in id) {
    (id as { unref: () => void }).unref();
  }
  try {
    const res = await fetch('https://mempool.space/api/v1/mining/hashrate/24h', {
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) return _networkHashrate;
    const data = await res.json();
    const hps = data?.currentHashrate ?? data?.hashrate ?? _networkHashrate;
    _networkHashrate = hps;
    return hps;
  } catch {
    clearTimeout(id);
    return _networkHashrate;
  }
}

export function startPricePolling(intervalMs: number = 300000): () => void {
  fetchBTCPrice();
  fetchNetworkHashrate();
  _btcPriceTimer = setInterval(() => {
    fetchBTCPrice();
    fetchNetworkHashrate();
  }, intervalMs);
  if (_btcPriceTimer && typeof _btcPriceTimer === 'object' && 'unref' in _btcPriceTimer) {
    (_btcPriceTimer as { unref: () => void }).unref();
  }
  return () => {
    if (_btcPriceTimer) {
      clearInterval(_btcPriceTimer);
      _btcPriceTimer = null;
    }
  };
}

export function formatUSD(satsPerDay: number): string {
  const btc = satsPerDay / 100000000;
  return `$${(btc * _btcPrice).toFixed(2)}`;
}
