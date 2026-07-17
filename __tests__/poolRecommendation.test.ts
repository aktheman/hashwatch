import { Miner } from '../src/types';
import {
  recommendPools,
  analyzePoolPerformance,
  PoolRecommendation,
} from '../src/utils/poolRecommendation';

function makeMiner(overrides: Partial<Miner> & { id: string }): Miner {
  return {
    name: overrides.id,
    ip: '192.168.1.100',
    port: 80,
    isOnline: true,
    ...overrides,
  };
}

function makeStatus(pool: string, accepted: number, rejected: number, hashRate = 500) {
  return {
    hashRate,
    hashRateUnit: 'H/s' as const,
    temperature: 60,
    vrTemp: 50,
    voltage: 5.0,
    current: 1.0,
    power: 5.0,
    sharesAccepted: accepted,
    sharesRejected: rejected,
    bestDiff: '1.0',
    bestSessionDiff: '1.0',
    uptimeSeconds: 86400,
    coreVoltage: 500,
    frequency: 480,
    fanSpeed: 100,
    fanRpm: 3000,
    pool,
    poolPort: 3333,
    poolUser: 'test',
    poolResponseTime: 50,
  };
}

describe('recommendPools', () => {
  it('returns empty array for empty miners list', () => {
    expect(recommendPools([])).toEqual([]);
  });

  it('recommends alternative when miner is on high-rejection pool', () => {
    const miners = [
      makeMiner({
        id: 'm1',
        status: makeStatus('stratum.slushpool.com:3333', 100, 12),
      }),
    ];

    const recs = recommendPools(miners);
    expect(recs.length).toBeGreaterThan(0);

    const pools = recs.map((r) => r.pool);
    expect(pools.some((p) => p !== 'stratum.slushpool.com')).toBe(true);

    const hasHighConfidence = recs.some(
      (r) => r.confidence === 'high' || r.confidence === 'medium',
    );
    expect(hasHighConfidence).toBe(true);
  });

  it('suggests diversification when multiple miners on same pool', () => {
    const miners = [
      makeMiner({
        id: 'm1',
        status: makeStatus('stratum.slushpool.com:3333', 1000, 5, 500),
      }),
      makeMiner({
        id: 'm2',
        status: makeStatus('stratum.slushpool.com:3333', 1000, 5, 500),
      }),
      makeMiner({
        id: 'm3',
        status: makeStatus('stratum.slushpool.com:3333', 1000, 5, 500),
      }),
    ];

    const recs = recommendPools(miners);
    const diversityRecs = recs.filter(
      (r) =>
        r.reason.toLowerCase().includes('diversif') ||
        r.reason.toLowerCase().includes('concentrated'),
    );
    expect(diversityRecs.length).toBeGreaterThan(0);
  });

  it('returns recommendations with improvement estimate > 0', () => {
    const miners = [
      makeMiner({
        id: 'm1',
        status: makeStatus('pool.ckpool.org:3333', 500, 30),
      }),
    ];

    const recs = recommendPools(miners);
    for (const rec of recs) {
      expect(rec.estimatedImprovement).toBeGreaterThanOrEqual(0);
      expect(typeof rec.reason).toBe('string');
      expect(rec.reason.length).toBeGreaterThan(0);
    }
  });

  it('recommends PPLNS pools for solo miners', () => {
    const miners = [
      makeMiner({
        id: 'm1',
        status: makeStatus('solo.ckpool.org:3333', 10, 0, 100),
      }),
    ];

    const recs = recommendPools(miners);
    const pplnsRecs = recs.filter(
      (r) => r.pool === 'stratum.slushpool.com' || r.pool === 'pool.braiins.com',
    );
    expect(pplnsRecs.length).toBeGreaterThan(0);
    expect(pplnsRecs[0].reason.toLowerCase()).toContain('solo');
  });

  it('recommends low-fee pools for low hashrate miners', () => {
    const miners = [
      makeMiner({
        id: 'm1',
        status: makeStatus('stratum.slushpool.com:3333', 50, 2, 50),
      }),
    ];

    const recs = recommendPools(miners);
    const lowHrRecs = recs.filter((r) => r.pool === 'pool.ckpool.org');
    expect(lowHrRecs.length).toBeGreaterThan(0);
  });

  it('deduplicates recommendations', () => {
    const miners = [
      makeMiner({
        id: 'm1',
        status: makeStatus('stratum.slushpool.com:3333', 100, 15, 50),
      }),
      makeMiner({
        id: 'm2',
        status: makeStatus('stratum.slushpool.com:3333', 100, 15, 50),
      }),
    ];

    const recs = recommendPools(miners);
    const keys = recs.map((r) => r.pool);
    const unique = [...new Set(keys)];
    expect(keys.length).toBe(unique.length);
  });

  it('sorts by estimatedImprovement descending', () => {
    const miners = [
      makeMiner({
        id: 'm1',
        status: makeStatus('stratum.slushpool.com:3333', 100, 20, 50),
      }),
      makeMiner({
        id: 'm2',
        status: makeStatus('stratum.slushpool.com:3333', 100, 20, 50),
      }),
      makeMiner({
        id: 'm3',
        status: makeStatus('stratum.slushpool.com:3333', 100, 20, 50),
      }),
    ];

    const recs = recommendPools(miners);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i].estimatedImprovement).toBeLessThanOrEqual(recs[i - 1].estimatedImprovement);
    }
  });
});

describe('analyzePoolPerformance', () => {
  it('returns empty record for empty miners list', () => {
    expect(analyzePoolPerformance([])).toEqual({});
  });

  it('groups miners by pool and computes aggregate stats', () => {
    const miners = [
      makeMiner({
        id: 'm1',
        status: makeStatus('pool.ckpool.org:3333', 200, 10, 500),
      }),
      makeMiner({
        id: 'm2',
        status: makeStatus('pool.ckpool.org:3333', 300, 15, 700),
      }),
      makeMiner({
        id: 'm3',
        status: makeStatus('stratum.slushpool.com:3333', 500, 5, 1000),
      }),
    ];

    const result = analyzePoolPerformance(miners);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['pool.ckpool.org'].minerCount).toBe(2);
    expect(result['stratum.slushpool.com'].minerCount).toBe(1);
    expect(result['pool.ckpool.org'].totalHashrate).toBe(1200);
    expect(result['stratum.slushpool.com'].totalHashrate).toBe(1000);
  });

  it('computes average rejection rate per pool', () => {
    const miners = [
      makeMiner({
        id: 'm1',
        status: makeStatus('pool.ckpool.org:3333', 100, 0, 500),
      }),
      makeMiner({
        id: 'm2',
        status: makeStatus('pool.ckpool.org:3333', 100, 20, 500),
      }),
    ];

    const result = analyzePoolPerformance(miners);
    const stats = result['pool.ckpool.org'];

    expect(stats.avgRejectionRate).toBeCloseTo(0.0833, 2);
  });

  it('handles miners with no status', () => {
    const miners = [
      makeMiner({ id: 'm1', status: null }),
      makeMiner({ id: 'm2', status: undefined as unknown as Miner['status'] }),
    ];

    const result = analyzePoolPerformance(miners);
    expect(result['unknown'].minerCount).toBe(2);
    expect(result['unknown'].avgRejectionRate).toBe(0);
  });

  it('handles single miner', () => {
    const miners = [
      makeMiner({
        id: 'm1',
        status: makeStatus('stratum.luckpool.net:3333', 500, 25, 800),
      }),
    ];

    const result = analyzePoolPerformance(miners);
    expect(result['stratum.luckpool.net'].minerCount).toBe(1);
    expect(result['stratum.luckpool.net'].avgRejectionRate).toBeCloseTo(0.0476, 2);
    expect(result['stratum.luckpool.net'].totalHashrate).toBe(800);
  });

  it('handles multiple different pools', () => {
    const miners = [
      makeMiner({ id: 'm1', status: makeStatus('pool.ckpool.org:3333', 100, 0, 500) }),
      makeMiner({ id: 'm2', status: makeStatus('stratum.slushpool.com:3333', 200, 10, 600) }),
      makeMiner({ id: 'm3', status: makeStatus('ss.antpool.com:3333', 300, 5, 900) }),
      makeMiner({ id: 'm4', status: makeStatus('stratum.luckpool.net:3333', 150, 15, 400) }),
    ];

    const result = analyzePoolPerformance(miners);
    expect(Object.keys(result)).toHaveLength(4);

    expect(result['pool.ckpool.org'].avgRejectionRate).toBe(0);
    expect(result['stratum.slushpool.com'].avgRejectionRate).toBeCloseTo(0.0476, 2);
    expect(result['ss.antpool.com'].avgRejectionRate).toBeCloseTo(0.0164, 2);
    expect(result['stratum.luckpool.net'].avgRejectionRate).toBeCloseTo(0.0909, 2);
  });
});

describe('PoolRecommendation interface', () => {
  it('has correct shape', () => {
    const rec: PoolRecommendation = {
      pool: 'test',
      reason: 'test reason',
      estimatedImprovement: 10,
      confidence: 'high',
    };

    expect(rec.pool).toBe('test');
    expect(rec.reason).toBe('test reason');
    expect(rec.estimatedImprovement).toBe(10);
    expect(rec.confidence).toBe('high');
  });
});
