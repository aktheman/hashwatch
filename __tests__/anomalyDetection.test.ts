import { MinerSnapshot } from '../src/types';
import {
  detectAnomalies,
  getHealthTrend,
  predictFailureProbability,
} from '../src/utils/anomalyDetection';

function makeSnapshot(index: number, overrides: Partial<MinerSnapshot> = {}): MinerSnapshot {
  return {
    minerId: 'm1',
    timestamp: 1000 + index * 60,
    hashRate: 100,
    temperature: 50,
    voltage: 12,
    current: 5,
    power: 600,
    sharesAccepted: 100,
    sharesRejected: 0,
    uptimeSeconds: index * 60,
    frequency: 450,
    ...overrides,
  };
}

function makeSeries(
  count: number,
  overrides: (index: number) => Partial<MinerSnapshot>,
): MinerSnapshot[] {
  return Array.from({ length: count }, (_, i) => makeSnapshot(i, overrides(i)));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('detectAnomalies - hashrate decline', () => {
  it('detects a critical hashrate decline', () => {
    const snapshots = [
      ...makeSeries(10, () => ({ hashRate: 100 })),
      ...makeSeries(10, (i) => ({ timestamp: 1000 + (10 + i) * 60, hashRate: 50 })),
    ];

    const result = detectAnomalies(snapshots);
    const anomaly = result.find((a) => a.type === 'hashrate_decline');

    expect(anomaly).toBeDefined();
    expect(anomaly!.severity).toBe('critical');
    expect(anomaly!.confidence).toBeCloseTo(0.711, 2);
    expect(anomaly!.currentValue).toBe(50);
    expect(anomaly!.expectedRange).toEqual([76, 95]);
    expect(anomaly!.message).toContain('47.4%');
    expect(anomaly!.detectedAt).toBe(snapshots[snapshots.length - 1].timestamp);
  });

  it('detects a warning hashrate decline (between 20% and 40%)', () => {
    const snapshots = [
      ...makeSeries(10, () => ({ hashRate: 100 })),
      ...makeSeries(10, (i) => ({ timestamp: 1000 + (10 + i) * 60, hashRate: 75 })),
    ];

    const anomaly = detectAnomalies(snapshots).find((a) => a.type === 'hashrate_decline');

    expect(anomaly!.severity).toBe('warning');
    expect(anomaly!.confidence).toBeCloseTo(0.346, 2);
  });

  it('returns nothing when the drop is below 20%', () => {
    const snapshots = [
      ...makeSeries(10, () => ({ hashRate: 100 })),
      ...makeSeries(10, (i) => ({ timestamp: 1000 + (10 + i) * 60, hashRate: 90 })),
    ];

    expect(detectAnomalies(snapshots).find((a) => a.type === 'hashrate_decline')).toBeUndefined();
  });

  it('returns nothing when the older average is zero', () => {
    const snapshots = makeSeries(20, () => ({ hashRate: 0 }));

    expect(detectAnomalies(snapshots).find((a) => a.type === 'hashrate_decline')).toBeUndefined();
  });

  it('returns nothing with fewer than 10 snapshots', () => {
    const snapshots = makeSeries(9, (i) => ({ hashRate: i < 4 ? 100 : 50 }));

    expect(detectAnomalies(snapshots).find((a) => a.type === 'hashrate_decline')).toBeUndefined();
  });
});

describe('detectAnomalies - temperature spike', () => {
  it('detects a critical temperature spike', () => {
    const snapshots = [
      ...makeSeries(5, () => ({ temperature: 50 })),
      ...makeSeries(10, (i) => ({ timestamp: 1000 + (5 + i) * 60, temperature: 90 })),
    ];

    const anomaly = detectAnomalies(snapshots).find((a) => a.type === 'temp_spike');

    expect(anomaly).toBeDefined();
    expect(anomaly!.severity).toBe('critical');
    expect(anomaly!.confidence).toBeCloseTo(0.833, 2);
    expect(anomaly!.currentValue).toBe(90);
  });

  it('detects a warning temperature spike', () => {
    const snapshots = [
      ...makeSeries(5, () => ({ temperature: 50 })),
      ...makeSeries(10, (i) => ({ timestamp: 1000 + (5 + i) * 60, temperature: 70 })),
    ];

    const anomaly = detectAnomalies(snapshots).find((a) => a.type === 'temp_spike');

    expect(anomaly!.severity).toBe('warning');
    expect(anomaly!.confidence).toBeCloseTo(0.417, 2);
  });

  it('returns nothing when the deviation is below 15 degrees', () => {
    const snapshots = [
      ...makeSeries(5, () => ({ temperature: 50 })),
      ...makeSeries(10, (i) => ({ timestamp: 1000 + (5 + i) * 60, temperature: 60 })),
    ];

    expect(detectAnomalies(snapshots).find((a) => a.type === 'temp_spike')).toBeUndefined();
  });

  it('returns nothing with fewer than 5 snapshots', () => {
    const snapshots = makeSeries(4, (i) => ({ temperature: i < 2 ? 50 : 90 }));

    expect(detectAnomalies(snapshots).find((a) => a.type === 'temp_spike')).toBeUndefined();
  });
});

describe('detectAnomalies - share rejection spike', () => {
  it('detects a critical rejection spike with high recent rate', () => {
    const snapshots = makeSeries(2, () => ({
      sharesAccepted: 1,
      sharesRejected: 1,
      uptimeSeconds: 10000,
    }));

    const anomaly = detectAnomalies(snapshots).find((a) => a.type === 'share_rejection_spike');

    expect(anomaly).toBeDefined();
    expect(anomaly!.severity).toBe('critical');
    expect(anomaly!.confidence).toBe(1);
    expect(anomaly!.currentValue).toBe(50);
  });

  it('detects a warning rejection spike', () => {
    const snapshots = [
      ...makeSeries(5, () => ({ sharesAccepted: 100, sharesRejected: 0 })),
      ...makeSeries(5, (i) => ({
        timestamp: 1000 + (5 + i) * 60,
        sharesAccepted: 90,
        sharesRejected: 10,
      })),
    ];

    const anomaly = detectAnomalies(snapshots).find((a) => a.type === 'share_rejection_spike');

    expect(anomaly!.severity).toBe('warning');
    expect(anomaly!.confidence).toBe(0.5);
  });

  it('returns nothing when the recent rate is below 5%', () => {
    const snapshots = makeSeries(10, () => ({ sharesAccepted: 100, sharesRejected: 0 }));

    expect(
      detectAnomalies(snapshots).find((a) => a.type === 'share_rejection_spike'),
    ).toBeUndefined();
  });

  it('returns nothing when recent rate is not 3x the older rate', () => {
    const snapshots = [
      ...makeSeries(5, () => ({ sharesAccepted: 80, sharesRejected: 20 })),
      ...makeSeries(5, (i) => ({
        timestamp: 1000 + (5 + i) * 60,
        sharesAccepted: 70,
        sharesRejected: 30,
      })),
    ];

    const anomaly = detectAnomalies(snapshots).find((a) => a.type === 'share_rejection_spike');

    expect(anomaly).toBeUndefined();
  });
});

describe('detectAnomalies - voltage fluctuation', () => {
  it('detects a warning voltage fluctuation', () => {
    const snapshots = makeSeries(10, (i) => ({ voltage: i % 2 === 0 ? 11.5 : 12.5 }));

    const anomaly = detectAnomalies(snapshots).find((a) => a.type === 'voltage_fluctuation');

    expect(anomaly).toBeDefined();
    expect(anomaly!.severity).toBe('warning');
    expect(anomaly!.confidence).toBeCloseTo(0.2635, 2);
  });

  it('detects a critical voltage fluctuation', () => {
    const snapshots = makeSeries(10, (i) => ({ voltage: i % 2 === 0 ? 11 : 13 }));

    const anomaly = detectAnomalies(snapshots).find((a) => a.type === 'voltage_fluctuation');

    expect(anomaly!.severity).toBe('critical');
    expect(anomaly!.confidence).toBeCloseTo(0.527, 2);
  });

  it('returns nothing for a stable voltage', () => {
    const snapshots = makeSeries(10, () => ({ voltage: 12 }));

    expect(
      detectAnomalies(snapshots).find((a) => a.type === 'voltage_fluctuation'),
    ).toBeUndefined();
  });
});

describe('detectAnomalies - uptime drop', () => {
  it('detects a critical uptime drop (restart)', () => {
    const snapshots = [
      makeSnapshot(0, { uptimeSeconds: 10000 }),
      makeSnapshot(1, { uptimeSeconds: 30 }),
    ];

    const anomaly = detectAnomalies(snapshots).find((a) => a.type === 'uptime_drop');

    expect(anomaly).toBeDefined();
    expect(anomaly!.severity).toBe('critical');
    expect(anomaly!.confidence).toBeCloseTo(0.997, 2);
    expect(anomaly!.currentValue).toBe(30);
    expect(anomaly!.message).toContain('restarted');
  });

  it('detects a warning uptime drop', () => {
    const snapshots = [
      makeSnapshot(0, { uptimeSeconds: 10000 }),
      makeSnapshot(1, { uptimeSeconds: 5000 }),
    ];

    const anomaly = detectAnomalies(snapshots).find((a) => a.type === 'uptime_drop');

    expect(anomaly!.severity).toBe('warning');
    expect(anomaly!.confidence).toBe(0.5);
  });

  it('returns nothing when the previous uptime is low', () => {
    const snapshots = [
      makeSnapshot(0, { uptimeSeconds: 100 }),
      makeSnapshot(1, { uptimeSeconds: 50 }),
    ];

    expect(detectAnomalies(snapshots).find((a) => a.type === 'uptime_drop')).toBeUndefined();
  });
});

describe('detectAnomalies - general', () => {
  it('returns [] for empty input', () => {
    expect(detectAnomalies([])).toEqual([]);
  });

  it('returns [] for a single snapshot', () => {
    expect(detectAnomalies([makeSnapshot(0)])).toEqual([]);
  });

  it('sorts anomalies by confidence descending', () => {
    const snapshots = [
      ...makeSeries(10, () => ({ hashRate: 100 })),
      ...makeSeries(10, (i) => ({
        timestamp: 1000 + (10 + i) * 60,
        hashRate: 50,
        voltage: i % 2 === 0 ? 11.5 : 12.5,
      })),
    ];

    const result = detectAnomalies(snapshots);
    const types = result.map((a) => a.type);

    expect(types[0]).toBe('hashrate_decline');
    expect(types[1]).toBe('voltage_fluctuation');
    expect(result[0].confidence).toBeGreaterThanOrEqual(result[1].confidence);
  });
});

describe('getHealthTrend', () => {
  it('returns stable with fewer than 10 snapshots', () => {
    expect(getHealthTrend(makeSeries(9, () => ({})))).toBe('stable');
  });

  it('returns degrading when the second half is hotter', () => {
    const snapshots = [
      ...makeSeries(5, () => ({ temperature: 50 })),
      ...makeSeries(5, (i) => ({ timestamp: 1000 + (5 + i) * 60, temperature: 90 })),
    ];

    expect(getHealthTrend(snapshots)).toBe('degrading');
  });

  it('returns improving when the second half is healthier', () => {
    const snapshots = [
      ...makeSeries(5, () => ({ temperature: 90, hashRate: 0 })),
      ...makeSeries(5, (i) => ({ timestamp: 1000 + (5 + i) * 60, temperature: 50, hashRate: 100 })),
    ];

    expect(getHealthTrend(snapshots)).toBe('improving');
  });

  it('returns improving when rejection rate drops in the second half', () => {
    const snapshots = [
      ...makeSeries(5, () => ({ sharesAccepted: 90, sharesRejected: 10 })),
      ...makeSeries(5, (i) => ({
        timestamp: 1000 + (5 + i) * 60,
        sharesAccepted: 100,
        sharesRejected: 0,
      })),
    ];

    expect(getHealthTrend(snapshots)).toBe('improving');
  });

  it('returns stable when both halves score the same', () => {
    const snapshots = makeSeries(10, () => ({ temperature: 50 }));

    expect(getHealthTrend(snapshots)).toBe('stable');
  });
});

describe('predictFailureProbability', () => {
  it('returns 0 with fewer than 5 snapshots', () => {
    expect(predictFailureProbability([])).toBe(0);
    expect(predictFailureProbability(makeSeries(4, () => ({})))).toBe(0);
  });

  it('returns 0 when no anomalies are present', () => {
    const snapshots = makeSeries(10, () => ({}));

    expect(predictFailureProbability(snapshots)).toBe(0);
  });

  it('scales the score by critical count and confidence', () => {
    const snapshots = [
      ...makeSeries(5, () => ({ temperature: 50 })),
      ...makeSeries(10, (i) => ({ timestamp: 1000 + (5 + i) * 60, temperature: 90 })),
    ];

    expect(predictFailureProbability(snapshots)).toBe(0.21);
  });
});
