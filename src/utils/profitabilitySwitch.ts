export interface PoolCandidate {
  name: string;
  url: string;
  fee: number;
  hashrate: number;
  luck: number;
  minPayout: number;
  payoutFrequency: string;
}

export interface ProfitabilityScore {
  pool: PoolCandidate;
  score: number;
  estimatedDailyBtc: number;
  reasons: string[];
}

const BLOCK_REWARD = 3.125;
const BLOCKS_PER_DAY = 144;

function scoreFee(fee: number): number {
  if (fee <= 0) return 100;
  if (fee <= 0.5) return 95;
  if (fee <= 1) return 90;
  if (fee <= 2) return 80;
  if (fee <= 3) return 70;
  return 50;
}

function scoreLuck(luck: number): number {
  if (luck <= 0) return 50;
  if (luck < 0.9) return 100;
  if (luck < 1.0) return 90;
  if (luck < 1.05) return 80;
  if (luck < 1.15) return 70;
  return 50;
}

function scorePayoutFrequency(freq: string): number {
  const lower = freq.toLowerCase();
  if (lower.includes('pps') || lower.includes('pay per share')) return 95;
  if (lower.includes('pplns')) return 85;
  if (lower.includes('daily')) return 80;
  if (lower.includes('weekly')) return 60;
  return 50;
}

export function rankPoolsByProfitability(
  candidates: PoolCandidate[],
  minerHashrate: number,
  _btcPrice: number,
): ProfitabilityScore[] {
  const totalNetworkHashrate = candidates.reduce((a, c) => a + c.hashrate, 0);

  return candidates
    .map((pool) => {
      const reasons: string[] = [];
      let score = 0;

      const baseDailyBtc = (minerHashrate / totalNetworkHashrate) * BLOCK_REWARD * BLOCKS_PER_DAY;
      const luckMultiplier = pool.luck > 0 ? 1 / pool.luck : 1;
      const estimatedDailyBtc = baseDailyBtc * luckMultiplier * (1 - pool.fee / 100);

      const feeScore = scoreFee(pool.fee);
      const luckScore = scoreLuck(pool.luck);
      const payoutScore = scorePayoutFrequency(pool.payoutFrequency);

      score = feeScore * 0.4 + luckScore * 0.35 + payoutScore * 0.25;

      if (pool.fee <= 1) {
        reasons.push(`Low fee: ${pool.fee}%`);
      } else if (pool.fee > 2) {
        reasons.push(`High fee: ${pool.fee}%`);
      }
      if (pool.luck < 1.0) {
        reasons.push(`Pool is lucky (${(pool.luck * 100).toFixed(0)}% luck)`);
      } else if (pool.luck > 1.1) {
        reasons.push(`Pool is unlucky (${(pool.luck * 100).toFixed(0)}% luck)`);
      }
      if (
        pool.payoutFrequency.toLowerCase().includes('pps') ||
        pool.payoutFrequency.toLowerCase().includes('daily')
      ) {
        reasons.push(`Payout: ${pool.payoutFrequency}`);
      }
      if (pool.minPayout > 0.001) {
        reasons.push(`Min payout: ${pool.minPayout} BTC`);
      }

      return {
        pool,
        score: Math.round(score * 10) / 10,
        estimatedDailyBtc: Math.round(estimatedDailyBtc * 100_000_000) / 100_000_000,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function shouldSwitch(
  currentPool: string,
  rankedPools: ProfitabilityScore[],
  threshold: number,
): { switch: boolean; target?: PoolCandidate; reason: string } {
  if (rankedPools.length === 0) {
    return { switch: false, reason: 'No pools available' };
  }
  const current = rankedPools.find(
    (p) => p.pool.name === currentPool || p.pool.url === currentPool,
  );
  const best = rankedPools[0];
  if (!current) {
    return { switch: true, target: best.pool, reason: 'Current pool not in candidate list' };
  }
  if (best.pool.name === current.pool.name) {
    return { switch: false, reason: 'Already on the best pool' };
  }
  const diff = best.score - current.score;
  if (diff >= threshold) {
    return {
      switch: true,
      target: best.pool,
      reason: `Higher profitability detected: ${best.score} vs ${current.score} (diff: ${diff.toFixed(1)})`,
    };
  }
  return {
    switch: false,
    reason: `Score difference (${diff.toFixed(1)}) below threshold (${threshold})`,
  };
}
