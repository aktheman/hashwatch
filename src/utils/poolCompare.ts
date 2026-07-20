import { Miner } from '../types';
import { toHashesPerSecond } from './hashrate';

export interface PoolMetrics {
  pool: string;
  poolPort: number;
  minerCount: number;
  totalHashrate: number;
  avgTemp: number;
  avgEfficiency: number;
  totalSharesAccepted: number;
  totalSharesRejected: number;
  uptime: number;
}

export interface MetricComparison {
  label: string;
  valueA: number;
  valueB: number;
  unit: string;
  winner: 'A' | 'B' | 'tie';
  higherIsBetter: boolean;
}

export function extractPoolMetrics(miners: Miner[]): Map<string, PoolMetrics> {
  const poolMap = new Map<string, PoolMetrics>();

  for (const m of miners) {
    if (!m.status?.pool) continue;
    const key = `${m.status.pool}:${m.status.poolPort || 3333}`;
    const existing = poolMap.get(key);
    const hr = toHashesPerSecond(m.status.hashRate, m.status.hashRateUnit);
    const temp = m.status.temperature;
    const eff = m.status.power > 0 ? hr / m.status.power : 0;
    const uptime = m.status.uptimeSeconds || 0;

    if (existing) {
      existing.minerCount += 1;
      existing.totalHashrate += hr;
      existing.avgTemp =
        (existing.avgTemp * (existing.minerCount - 1) + temp) / existing.minerCount;
      existing.avgEfficiency =
        (existing.avgEfficiency * (existing.minerCount - 1) + eff) / existing.minerCount;
      existing.totalSharesAccepted += m.status.sharesAccepted;
      existing.totalSharesRejected += m.status.sharesRejected;
      existing.uptime += uptime;
    } else {
      poolMap.set(key, {
        pool: m.status.pool,
        poolPort: m.status.poolPort || 3333,
        minerCount: 1,
        totalHashrate: hr,
        avgTemp: temp,
        avgEfficiency: eff,
        totalSharesAccepted: m.status.sharesAccepted,
        totalSharesRejected: m.status.sharesRejected,
        uptime,
      });
    }
  }

  return poolMap;
}

function winner(a: number, b: number, higherIsBetter: boolean): 'A' | 'B' | 'tie' {
  if (Math.abs(a - b) < 0.001) return 'tie';
  return higherIsBetter ? (a > b ? 'A' : 'B') : a < b ? 'A' : 'B';
}

export function comparePools(dataA: PoolMetrics, dataB: PoolMetrics): MetricComparison[] {
  return [
    {
      label: 'hashrate',
      valueA: dataA.totalHashrate,
      valueB: dataB.totalHashrate,
      unit: 'H/s',
      winner: winner(dataA.totalHashrate, dataB.totalHashrate, true),
      higherIsBetter: true,
    },
    {
      label: 'efficiency',
      valueA: dataA.avgEfficiency,
      valueB: dataB.avgEfficiency,
      unit: 'GH/J',
      winner: winner(dataA.avgEfficiency, dataB.avgEfficiency, true),
      higherIsBetter: true,
    },
    {
      label: 'temperature',
      valueA: dataA.avgTemp,
      valueB: dataB.avgTemp,
      unit: '°C',
      winner: winner(dataA.avgTemp, dataB.avgTemp, false),
      higherIsBetter: false,
    },
    {
      label: 'shares',
      valueA: dataA.totalSharesAccepted,
      valueB: dataB.totalSharesAccepted,
      unit: '',
      winner: winner(dataA.totalSharesAccepted, dataB.totalSharesAccepted, true),
      higherIsBetter: true,
    },
    {
      label: 'uptime',
      valueA: dataA.uptime,
      valueB: dataB.uptime,
      unit: 's',
      winner: winner(dataA.uptime, dataB.uptime, true),
      higherIsBetter: true,
    },
  ];
}

export function getPoolRecommendation(comparisons: MetricComparison[]): string {
  const aWins = comparisons.filter((c) => c.winner === 'A').length;
  const bWins = comparisons.filter((c) => c.winner === 'B').length;

  if (aWins > bWins) return 'A';
  if (bWins > aWins) return 'B';
  return 'tie';
}

export function estimateEarnings(hashrate: number, btcPrice: number, poolFee: number): number {
  const BLOCK_REWARD = 3.125;
  const BLOCKS_PER_DAY = 144;
  const NETWORK_HASHRATE = 750_000_000_000_000_000_000;
  const dailyBlockReward = BLOCK_REWARD * BLOCKS_PER_DAY;
  const share = hashrate / NETWORK_HASHRATE;
  const dailyBTC = dailyBlockReward * share * (1 - poolFee / 100);
  return dailyBTC * btcPrice;
}
