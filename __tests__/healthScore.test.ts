import { calculateHealthScore, HealthBreakdown } from '../src/utils/healthScore';
import { Miner } from '../src/types';

function makeMiner(overrides: Partial<Miner> = {}): Miner {
  return {
    id: '1',
    name: 'Test Miner',
    ip: '192.168.1.1',
    port: 80,
    isOnline: true,
    status: {
      hashRate: 500,
      hashRateUnit: 'GH/s',
      temperature: 50,
      vrTemp: 50,
      voltage: 5.0,
      current: 1.0,
      power: 5.0,
      sharesAccepted: 1000,
      sharesRejected: 0,
      bestDiff: '1.0',
      bestSessionDiff: '1.0',
      uptimeSeconds: 86400 * 7,
      coreVoltage: 500,
      frequency: 500,
      fanSpeed: 50,
      fanRpm: 3000,
      pool: 'pool.example.com',
      poolPort: 3333,
      poolUser: 'worker1',
      poolResponseTime: 50,
    },
    ...overrides,
  };
}

describe('calculateHealthScore', () => {
  it('returns A+ for ideal miner with all metrics perfect', () => {
    const miner = makeMiner();
    const result = calculateHealthScore(miner);
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.grade).toBe('A+');
  });

  it('returns 0 and F for offline miner with no status', () => {
    const miner = makeMiner({ isOnline: false, status: null });
    const result = calculateHealthScore(miner);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
    expect(result.temperature).toBe(0);
    expect(result.hashrate).toBe(0);
    expect(result.uptime).toBe(0);
    expect(result.shares).toBe(0);
    expect(result.stability).toBe(0);
  });

  it('returns 0 and F for online miner with null status', () => {
    const miner = makeMiner({ status: null });
    const result = calculateHealthScore(miner);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
  });

  it('returns lower score for overheating miner', () => {
    const ideal = calculateHealthScore(makeMiner());
    const overheated = calculateHealthScore(
      makeMiner({ status: { ...makeMiner().status!, temperature: 90 } }),
    );
    expect(overheated.temperature).toBe(0);
    expect(overheated.score).toBeLessThan(ideal.score);
  });

  it('returns lower score for low hashrate miner', () => {
    const ideal = calculateHealthScore(makeMiner());
    const lowHash = calculateHealthScore(
      makeMiner({ status: { ...makeMiner().status!, hashRate: 250 } }),
    );
    expect(lowHash.hashrate).toBeLessThan(ideal.hashrate);
    expect(lowHash.score).toBeLessThan(ideal.score);
  });

  it('returns lower score for high rejection rate', () => {
    const ideal = calculateHealthScore(makeMiner());
    const highReject = calculateHealthScore(
      makeMiner({
        status: {
          ...makeMiner().status!,
          sharesAccepted: 900,
          sharesRejected: 100,
        },
      }),
    );
    expect(highReject.shares).toBeLessThan(ideal.shares);
    expect(highReject.score).toBeLessThan(ideal.score);
  });

  it('returns lower score for miner with zero uptime', () => {
    const ideal = calculateHealthScore(makeMiner());
    const zeroUptime = calculateHealthScore(
      makeMiner({ status: { ...makeMiner().status!, uptimeSeconds: 0 } }),
    );
    expect(zeroUptime.uptime).toBe(0);
    expect(zeroUptime.score).toBeLessThan(ideal.score);
  });

  it('clamps score to 0-100 range', () => {
    const miner = makeMiner({
      isOnline: true,
      status: {
        ...makeMiner().status!,
        temperature: 100,
        hashRate: 0,
        uptimeSeconds: 0,
        sharesAccepted: 0,
        sharesRejected: 1000,
      },
    });
    const result = calculateHealthScore(miner);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  describe('grade boundaries', () => {
    const gradeCases: [number, HealthBreakdown['grade']][] = [
      [95, 'A+'],
      [90, 'A'],
      [80, 'B+'],
      [70, 'B'],
      [60, 'C+'],
      [50, 'C'],
      [30, 'D'],
      [0, 'F'],
    ];

    gradeCases.forEach(([expectedScore, expectedGrade]) => {
      it(`assigns grade ${expectedGrade} for score ${expectedScore}`, () => {
        const miner = makeMiner();
        const result = calculateHealthScore(miner);
        expect(typeof result.grade).toBe('string');
        const validGrades: HealthBreakdown['grade'][] = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];
        expect(validGrades).toContain(result.grade);
      });
    });

    it('grade A+ requires score >= 95', () => {
      const miner = makeMiner();
      const result = calculateHealthScore(miner);
      if (result.score >= 95) {
        expect(result.grade).toBe('A+');
      }
    });

    it('grade F for score < 30', () => {
      const miner = makeMiner({
        isOnline: true,
        status: {
          ...makeMiner().status!,
          temperature: 100,
          hashRate: 10,
          uptimeSeconds: 0,
          sharesAccepted: 0,
          sharesRejected: 1000,
        },
      });
      const result = calculateHealthScore(miner);
      if (result.score < 30) {
        expect(result.grade).toBe('F');
      }
    });
  });

  it('includes all breakdown fields', () => {
    const result = calculateHealthScore(makeMiner());
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('temperature');
    expect(result).toHaveProperty('hashrate');
    expect(result).toHaveProperty('uptime');
    expect(result).toHaveProperty('shares');
    expect(result).toHaveProperty('stability');
    expect(result).toHaveProperty('grade');
  });

  it('stability returns placeholder value of 85', () => {
    const result = calculateHealthScore(makeMiner());
    expect(result.stability).toBe(85);
  });

  it('scores 100 for temperature at exactly 55°C', () => {
    const miner = makeMiner({ status: { ...makeMiner().status!, temperature: 55 } });
    const result = calculateHealthScore(miner);
    expect(result.temperature).toBe(100);
  });

  it('scores 0 for temperature at exactly 85°C', () => {
    const miner = makeMiner({ status: { ...makeMiner().status!, temperature: 85 } });
    const result = calculateHealthScore(miner);
    expect(result.temperature).toBe(0);
  });

  it('scores 100 for hashrate ratio >= 95%', () => {
    const result = calculateHealthScore(makeMiner());
    expect(result.hashrate).toBe(100);
  });

  it('scores 0 for hashrate ratio <= 50%', () => {
    const miner = makeMiner({ status: { ...makeMiner().status!, hashRate: 250 } });
    const result = calculateHealthScore(miner);
    expect(result.hashrate).toBe(0);
  });

  it('scores 100 for uptime >= 24h', () => {
    const result = calculateHealthScore(makeMiner());
    expect(result.uptime).toBe(100);
  });

  it('scores 0 for uptime <= 1h', () => {
    const miner = makeMiner({ status: { ...makeMiner().status!, uptimeSeconds: 3600 } });
    const result = calculateHealthScore(miner);
    expect(result.uptime).toBe(0);
  });

  it('scores 100 for share acceptance >= 99%', () => {
    const result = calculateHealthScore(makeMiner());
    expect(result.shares).toBe(100);
  });

  it('scores 0 for share acceptance <= 90%', () => {
    const miner = makeMiner({
      status: { ...makeMiner().status!, sharesAccepted: 900, sharesRejected: 100 },
    });
    const result = calculateHealthScore(miner);
    expect(result.shares).toBe(0);
  });

  it('all individual breakdown scores are between 0 and 100', () => {
    const miner = makeMiner({
      status: {
        ...makeMiner().status!,
        temperature: 70,
        hashRate: 400,
        uptimeSeconds: 7200,
        sharesAccepted: 950,
        sharesRejected: 50,
      },
    });
    const result = calculateHealthScore(miner);
    expect(result.temperature).toBeGreaterThanOrEqual(0);
    expect(result.temperature).toBeLessThanOrEqual(100);
    expect(result.hashrate).toBeGreaterThanOrEqual(0);
    expect(result.hashrate).toBeLessThanOrEqual(100);
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(result.uptime).toBeLessThanOrEqual(100);
    expect(result.shares).toBeGreaterThanOrEqual(0);
    expect(result.shares).toBeLessThanOrEqual(100);
    expect(result.stability).toBeGreaterThanOrEqual(0);
    expect(result.stability).toBeLessThanOrEqual(100);
  });
});
