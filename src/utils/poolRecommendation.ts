import { Miner } from '../types';

export interface PoolRecommendation {
  pool: string;
  reason: string;
  estimatedImprovement: number;
  confidence: 'high' | 'medium' | 'low';
}

interface PoolProfile {
  name: string;
  avgFee: number;
  regions: string[];
  payoutMethod: string;
  minPayout: number;
  reliability: number;
}

const POOL_PROFILES: Record<string, PoolProfile> = {
  'solo.ckpool.org': {
    name: 'CKPool Solo',
    avgFee: 0,
    regions: ['global'],
    payoutMethod: 'solo',
    minPayout: 0,
    reliability: 0.85,
  },
  'stratum.slushpool.com': {
    name: 'Slush Pool',
    avgFee: 2,
    regions: ['global'],
    payoutMethod: 'PPLNS',
    minPayout: 0.001,
    reliability: 0.95,
  },
  'pool.ckpool.org': {
    name: 'CKPool PPLNS',
    avgFee: 1,
    regions: ['global'],
    payoutMethod: 'PPLNS',
    minPayout: 0,
    reliability: 0.9,
  },
  'stratum.luckpool.net': {
    name: 'LuckPool',
    avgFee: 1.5,
    regions: ['global'],
    payoutMethod: 'PPLNS',
    minPayout: 0.0001,
    reliability: 0.8,
  },
  'pool.braiins.com': {
    name: 'Braiins Pool',
    avgFee: 2,
    regions: ['global'],
    payoutMethod: 'PPLNS',
    minPayout: 0.0001,
    reliability: 0.93,
  },
  'ss.antpool.com': {
    name: 'AntPool',
    avgFee: 2.5,
    regions: ['asia', 'global'],
    payoutMethod: 'PPLNS',
    minPayout: 0.001,
    reliability: 0.92,
  },
  'stratum+tcp://': {
    name: 'Custom Pool',
    avgFee: 2,
    regions: ['global'],
    payoutMethod: 'unknown',
    minPayout: 0,
    reliability: 0.5,
  },
};

const HIGH_REJECTION_THRESHOLD = 0.1;
const SOLO_MINERS_SUGGEST_PPLNS = true;

function getRejectionRate(miner: Miner): number {
  if (!miner.status) return 0;
  const total = miner.status.sharesAccepted + miner.status.sharesRejected;
  if (total === 0) return 0;
  return miner.status.sharesRejected / total;
}

function getPoolKey(pool: string): string {
  if (!pool) return 'unknown';
  const stripped = pool.replace(/^stratum\+tcp:\/\//, '').replace(/^stratum\+ssl:\/\//, '');
  const host = stripped.split(':')[0] || stripped;
  for (const key of Object.keys(POOL_PROFILES)) {
    const strippedKey = key.replace(/^stratum\+tcp:\/\//, '');
    if (host === strippedKey || host.endsWith('.' + strippedKey)) {
      return key;
    }
  }
  return stripped;
}

export function analyzePoolPerformance(miners: Miner[]): Record<
  string,
  {
    minerCount: number;
    avgRejectionRate: number;
    totalHashrate: number;
  }
> {
  const grouped: Record<string, { count: number; totalRejection: number; totalHashrate: number }> =
    {};

  for (const miner of miners) {
    const pool = miner.status?.pool ?? 'unknown';
    const poolKey = getPoolKey(pool);
    if (!grouped[poolKey]) {
      grouped[poolKey] = { count: 0, totalRejection: 0, totalHashrate: 0 };
    }
    grouped[poolKey].count += 1;
    grouped[poolKey].totalRejection += getRejectionRate(miner);
    grouped[poolKey].totalHashrate += miner.status?.hashRate ?? 0;
  }

  const result: Record<
    string,
    {
      minerCount: number;
      avgRejectionRate: number;
      totalHashrate: number;
    }
  > = {};

  for (const [pool, data] of Object.entries(grouped)) {
    result[pool] = {
      minerCount: data.count,
      avgRejectionRate: data.count > 0 ? data.totalRejection / data.count : 0,
      totalHashrate: data.totalHashrate,
    };
  }

  return result;
}

function buildRecommendationsForHighRejection(
  miners: Miner[],
  poolStats: Record<
    string,
    { minerCount: number; avgRejectionRate: number; totalHashrate: number }
  >,
): PoolRecommendation[] {
  const recs: PoolRecommendation[] = [];
  const poorPools = Object.entries(poolStats)
    .filter(([, stats]) => stats.avgRejectionRate >= HIGH_REJECTION_THRESHOLD)
    .sort((a, b) => b[1].avgRejectionRate - a[1].avgRejectionRate);

  for (const [poolKey, stats] of poorPools) {
    const alternatives = Object.keys(POOL_PROFILES)
      .filter((p) => p !== poolKey && p !== 'stratum+tcp://')
      .sort((a, b) => POOL_PROFILES[b].reliability - POOL_PROFILES[a].reliability);

    for (const alt of alternatives.slice(0, 2)) {
      const profile = POOL_PROFILES[alt];
      const improvement = Math.min(30, Math.round(stats.avgRejectionRate * 100 * 2));
      recs.push({
        pool: alt,
        reason: `Pool ${poolKey} has ${(stats.avgRejectionRate * 100).toFixed(1)}% rejection rate. ${profile.name} offers ${profile.payoutMethod} with ${profile.avgFee}% fee.`,
        estimatedImprovement: improvement,
        confidence: stats.avgRejectionRate > 0.15 ? 'high' : 'medium',
      });
    }
  }

  return recs;
}

function buildDiversificationRecommendations(
  poolStats: Record<
    string,
    { minerCount: number; avgRejectionRate: number; totalHashrate: number }
  >,
): PoolRecommendation[] {
  const recs: PoolRecommendation[] = [];
  const totalMiners = Object.values(poolStats).reduce((sum, s) => sum + s.minerCount, 0);

  for (const [poolKey, stats] of Object.entries(poolStats)) {
    if (stats.minerCount >= 2 && totalMiners >= 3) {
      const concentration = stats.minerCount / totalMiners;
      if (concentration >= 0.5) {
        const alternatives = Object.keys(POOL_PROFILES)
          .filter((p) => p !== poolKey && p !== 'stratum+tcp://')
          .sort((a, b) => POOL_PROFILES[b].reliability - POOL_PROFILES[a].reliability);

        const bestAlt = alternatives[0];
        if (bestAlt) {
          const profile = POOL_PROFILES[bestAlt];
          recs.push({
            pool: bestAlt,
            reason: `${stats.minerCount} miners (${(concentration * 100).toFixed(0)}%) concentrated on ${poolKey}. Diversify to ${profile.name} for redundancy.`,
            estimatedImprovement: Math.round(concentration * 15),
            confidence: concentration > 0.7 ? 'high' : 'medium',
          });
        }
      }
    }
  }

  return recs;
}

function buildSoloMinerRecommendations(miners: Miner[]): PoolRecommendation[] {
  const recs: PoolRecommendation[] = [];

  if (!SOLO_MINERS_SUGGEST_PPLNS) return recs;

  const soloMiners = miners.filter((m) => {
    const pool = m.status?.pool ?? '';
    return pool.includes('solo');
  });

  if (soloMiners.length === 0) return recs;

  const hashrates = soloMiners.map((m) => m.status?.hashRate ?? 0);
  const avgHashrate = hashrates.reduce((a, b) => a + b, 0) / hashrates.length;

  for (const alt of ['stratum.slushpool.com', 'pool.braiins.com']) {
    const profile = POOL_PROFILES[alt];
    if (!profile) continue;

    const confidence: 'high' | 'medium' | 'low' =
      avgHashrate < 500 ? 'high' : avgHashrate < 2000 ? 'medium' : 'low';

    recs.push({
      pool: alt,
      reason: `${soloMiners.length} miner(s) on solo pool with avg hashrate ${avgHashrate.toFixed(0)} H/s. ${profile.name} (${profile.payoutMethod}) provides steadier income at this hashrate.`,
      estimatedImprovement: avgHashrate < 500 ? 15 : avgHashrate < 2000 ? 8 : 3,
      confidence,
    });
  }

  return recs;
}

function buildLowHashrateRecommendations(miners: Miner[]): PoolRecommendation[] {
  const recs: PoolRecommendation[] = [];
  const lowHashMiners = miners.filter((m) => {
    const hr = m.status?.hashRate ?? 0;
    return hr > 0 && hr < 100;
  });

  if (lowHashMiners.length === 0) return recs;

  recs.push({
    pool: 'pool.ckpool.org',
    reason: `${lowHashMiners.length} miner(s) with <100 H/s. CKPool PPLNS has low fees and no minimum payout, suitable for low hashrate.`,
    estimatedImprovement: 5,
    confidence: 'medium',
  });

  return recs;
}

export function recommendPools(miners: Miner[]): PoolRecommendation[] {
  if (miners.length === 0) return [];

  const poolStats = analyzePoolPerformance(miners);
  const allRecs: PoolRecommendation[] = [
    ...buildRecommendationsForHighRejection(miners, poolStats),
    ...buildDiversificationRecommendations(poolStats),
    ...buildSoloMinerRecommendations(miners),
    ...buildLowHashrateRecommendations(miners),
  ];

  const seen = new Set<string>();
  const deduped: PoolRecommendation[] = [];
  for (const rec of allRecs) {
    const key = `${rec.pool}:${rec.reason.slice(0, 40)}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(rec);
    }
  }

  return deduped.sort((a, b) => b.estimatedImprovement - a.estimatedImprovement);
}
