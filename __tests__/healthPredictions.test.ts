import { Miner, MinerSnapshot } from '../src/types';
import { analyzeMinerHealth, HealthPrediction } from '../src/utils/healthPredictions';

function makeMiner(overrides?: Partial<Miner>): Miner {
  return {
    id: 'test-miner',
    name: 'Test Miner',
    ip: '192.168.1.10',
    port: 80,
    isOnline: true,
    ...overrides,
  };
}

function makeSnapshot(
  overrides: Partial<MinerSnapshot> & { timestamp?: number },
  tsOffset = 0,
): MinerSnapshot {
  return {
    minerId: 'test-miner',
    timestamp: Date.now() - tsOffset,
    hashRate: 500,
    hashRateUnit: 'GH/s',
    temperature: 55,
    voltage: 1200,
    current: 400,
    power: 12,
    sharesAccepted: 1000,
    sharesRejected: 10,
    uptimeSeconds: 86400,
    frequency: 500,
    fanSpeed: 50,
    fanRpm: 3000,
    ...overrides,
  };
}

describe('analyzeMinerHealth', () => {
  it('returns critical risk for offline miner', () => {
    const miner = makeMiner({ isOnline: false });
    const result = analyzeMinerHealth(miner, []);
    expect(result.riskLevel).toBe('critical');
    expect(result.overallScore).toBe(0);
    expect(result.minerId).toBe('test-miner');
  });

  it('returns low risk with no predictions for healthy snapshots', () => {
    const miner = makeMiner();
    const snapshots = [
      makeSnapshot({ temperature: 50, fanRpm: 3000, fanSpeed: 50, hashRate: 500, power: 12 }),
      makeSnapshot(
        { temperature: 50, fanRpm: 3000, fanSpeed: 50, hashRate: 500, power: 12 },
        3600000,
      ),
      makeSnapshot(
        { temperature: 50, fanRpm: 3000, fanSpeed: 50, hashRate: 500, power: 12 },
        7200000,
      ),
    ];
    const result = analyzeMinerHealth(miner, snapshots);
    expect(result.riskLevel).toBe('low');
    expect(result.predictions.length).toBe(0);
    expect(result.overallScore).toBe(100);
  });

  it('detects fan failure risk when RPM trending down', () => {
    const miner = makeMiner();
    const snapshots = [
      makeSnapshot({ fanRpm: 1000, fanSpeed: 95 }),
      makeSnapshot({ fanRpm: 2000, fanSpeed: 80 }, 3600000),
      makeSnapshot({ fanRpm: 3000, fanSpeed: 60 }, 7200000),
      makeSnapshot({ fanRpm: 3200, fanSpeed: 50 }, 10800000),
    ];
    const result = analyzeMinerHealth(miner, snapshots);
    const fanPred = result.predictions.find((p) => p.type === 'fan_failure');
    expect(fanPred).toBeDefined();
    expect(fanPred!.probability).toBeGreaterThan(0.1);
    expect(fanPred!.evidence).toContain('RPM');
  });

  it('detects fan failure when speed at 100% but RPM low', () => {
    const miner = makeMiner();
    const snapshots = [
      makeSnapshot({ fanRpm: 500, fanSpeed: 100 }),
      makeSnapshot({ fanRpm: 2000, fanSpeed: 60 }, 3600000),
    ];
    const result = analyzeMinerHealth(miner, snapshots);
    const fanPred = result.predictions.find((p) => p.type === 'fan_failure');
    expect(fanPred).toBeDefined();
    expect(fanPred!.probability).toBeGreaterThanOrEqual(0.8);
  });

  it('detects thermal throttle when temp > 80', () => {
    const miner = makeMiner();
    const snapshots = [
      makeSnapshot({ temperature: 85 }),
      makeSnapshot({ temperature: 80 }, 3600000),
      makeSnapshot({ temperature: 75 }, 7200000),
    ];
    const result = analyzeMinerHealth(miner, snapshots);
    const thermalPred = result.predictions.find((p) => p.type === 'thermal_throttle');
    expect(thermalPred).toBeDefined();
    expect(thermalPred!.probability).toBeGreaterThanOrEqual(0.85);
    expect(thermalPred!.timeframe).toBe('24h');
  });

  it('detects thermal throttle when temp > 70 and rising', () => {
    const miner = makeMiner();
    const snapshots = [
      makeSnapshot({ temperature: 72 }),
      makeSnapshot({ temperature: 68 }, 3600000),
      makeSnapshot({ temperature: 64 }, 7200000),
    ];
    const result = analyzeMinerHealth(miner, snapshots);
    const thermalPred = result.predictions.find((p) => p.type === 'thermal_throttle');
    expect(thermalPred).toBeDefined();
    expect(thermalPred!.probability).toBeGreaterThanOrEqual(0.5);
  });

  it('detects hashrate decline', () => {
    const miner = makeMiner();
    const snapshots = [
      makeSnapshot({ hashRate: 300 }),
      makeSnapshot({ hashRate: 400 }, 3600000),
      makeSnapshot({ hashRate: 500 }, 7200000),
      makeSnapshot({ hashRate: 550 }, 10800000),
    ];
    const result = analyzeMinerHealth(miner, snapshots);
    const hrPred = result.predictions.find((p) => p.type === 'hashrate_decline');
    expect(hrPred).toBeDefined();
    expect(hrPred!.probability).toBeGreaterThan(0.1);
    expect(hrPred!.evidence).toContain('dropped');
  });

  it('detects share rejection spike', () => {
    const miner = makeMiner();
    const snapshots = [
      makeSnapshot({ sharesAccepted: 1010, sharesRejected: 90 }),
      makeSnapshot({ sharesAccepted: 1000, sharesRejected: 10 }, 3600000),
    ];
    const result = analyzeMinerHealth(miner, snapshots);
    const srPred = result.predictions.find((p) => p.type === 'share_rejection_spike');
    expect(srPred).toBeDefined();
    expect(srPred!.probability).toBeGreaterThan(0.1);
  });

  it('detects power anomaly when efficiency degrading', () => {
    const miner = makeMiner();
    const snapshots = [
      makeSnapshot({ hashRate: 300, power: 20 }),
      makeSnapshot({ hashRate: 400, power: 15 }, 3600000),
      makeSnapshot({ hashRate: 500, power: 12 }, 7200000),
      makeSnapshot({ hashRate: 500, power: 12 }, 10800000),
    ];
    const result = analyzeMinerHealth(miner, snapshots);
    const pwrPred = result.predictions.find((p) => p.type === 'power_anomaly');
    expect(pwrPred).toBeDefined();
    expect(pwrPred!.probability).toBeGreaterThan(0.1);
  });

  it('returns no predictions with single snapshot', () => {
    const miner = makeMiner();
    const snapshots = [makeSnapshot({})];
    const result = analyzeMinerHealth(miner, snapshots);
    expect(result.predictions.length).toBe(0);
    expect(result.overallScore).toBe(100);
  });

  it('returns no predictions with no snapshots for online miner', () => {
    const miner = makeMiner();
    const result = analyzeMinerHealth(miner, []);
    expect(result.predictions.length).toBe(0);
    expect(result.overallScore).toBe(100);
  });

  it('generates recommended actions', () => {
    const miner = makeMiner();
    const snapshots = [
      makeSnapshot({ fanRpm: 500, fanSpeed: 100, temperature: 85 }),
      makeSnapshot({ fanRpm: 3000, fanSpeed: 50, temperature: 60 }, 3600000),
      makeSnapshot({ fanRpm: 3000, fanSpeed: 50, temperature: 60 }, 7200000),
    ];
    const result = analyzeMinerHealth(miner, snapshots);
    expect(result.recommendedActions.length).toBeGreaterThan(0);
  });

  it('deduplicates recommended actions', () => {
    const miner = makeMiner();
    const snapshots = [
      makeSnapshot({ fanRpm: 500, fanSpeed: 100, temperature: 85 }),
      makeSnapshot({ fanRpm: 3000, fanSpeed: 50, temperature: 60 }, 3600000),
      makeSnapshot({ fanRpm: 3000, fanSpeed: 50, temperature: 60 }, 7200000),
    ];
    const result = analyzeMinerHealth(miner, snapshots);
    const unique = new Set(result.recommendedActions);
    expect(result.recommendedActions.length).toBe(unique.size);
  });

  it('returns all offline snapshots', () => {
    const miner = makeMiner();
    const result = analyzeMinerHealth(miner, []);
    expect(result.riskLevel).toBe('low');
    expect(result.overallScore).toBe(100);
  });
});
