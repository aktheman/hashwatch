import {
  forecastUptime,
  generateMaintenanceSchedule,
  checkWeatherAlerts,
} from '../src/utils/predictiveMaintenance';
import { MinerSnapshot } from '../src/types';

function makeSnapshot(overrides: Partial<MinerSnapshot> = {}): MinerSnapshot {
  return {
    minerId: 'miner-1',
    timestamp: Date.now() - Math.random() * 86400000,
    hashRate: 500,
    temperature: 60,
    voltage: 12,
    current: 5,
    power: 60,
    sharesAccepted: 100,
    sharesRejected: 0,
    uptimeSeconds: 86400,
    fanRpm: 3000,
    fanSpeed: 50,
    frequency: 500,
    ...overrides,
  };
}

function makeSnapshots(count: number, overrides: Partial<MinerSnapshot> = {}): MinerSnapshot[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) =>
    makeSnapshot({ timestamp: now - (count - i) * 60000, ...overrides }),
  );
}

describe('forecastUptime', () => {
  it('returns defaults for empty snapshots', () => {
    const result = forecastUptime([]);
    expect(result.predictedUptime30d).toBe(95);
    expect(result.predictedDowntimeHours).toBe(36);
    expect(result.riskFactors).toEqual([]);
    expect(result.confidence).toBe(0.3);
  });

  it('returns low confidence for fewer than 10 snapshots', () => {
    const snapshots = makeSnapshots(5);
    const result = forecastUptime(snapshots);
    expect(result.confidence).toBe(0.3);
    expect(result.predictedUptime30d).toBe(95);
  });

  it('returns >95% uptime for healthy snapshots', () => {
    const snapshots = makeSnapshots(20, {
      hashRate: 500,
      temperature: 55,
      fanRpm: 3000,
      sharesAccepted: 100,
      sharesRejected: 0,
    });
    const result = forecastUptime(snapshots);
    expect(result.predictedUptime30d).toBeGreaterThan(95);
  });

  it('returns lower uptime for declining hashrate', () => {
    const stableSnapshots = makeSnapshots(20, { hashRate: 500 });
    const stable = forecastUptime(stableSnapshots);

    const decliningSnapshots = Array.from({ length: 20 }, (_, i) =>
      makeSnapshot({ hashRate: 500 - i * 20, timestamp: Date.now() - (20 - i) * 60000 }),
    );
    const declining = forecastUptime(decliningSnapshots);

    expect(declining.predictedUptime30d).toBeLessThan(stable.predictedUptime30d);
  });

  it('returns lower uptime for high temperatures', () => {
    const coolSnapshots = makeSnapshots(20, { temperature: 50 });
    const cool = forecastUptime(coolSnapshots);

    const hotSnapshots = makeSnapshots(20, { temperature: 85 });
    const hot = forecastUptime(hotSnapshots);

    expect(hot.predictedUptime30d).toBeLessThanOrEqual(cool.predictedUptime30d);
  });

  it('returns lower uptime for frequent downtime gaps', () => {
    const continuous = makeSnapshots(20, { hashRate: 500, temperature: 55 });
    const continuousResult = forecastUptime(continuous);

    const now = Date.now();
    const withGaps = Array.from({ length: 20 }, (_, i) =>
      makeSnapshot({
        timestamp: i % 5 === 0 ? now - (20 - i) * 60000 - 600000 : now - (20 - i) * 60000,
        hashRate: 500,
        temperature: 55,
      }),
    );
    const gapResult = forecastUptime(withGaps);

    expect(gapResult.predictedUptime30d).toBeLessThanOrEqual(continuousResult.predictedUptime30d);
  });

  it('includes hashrate decline in risk factors when present', () => {
    const snapshots = Array.from({ length: 20 }, (_, i) =>
      makeSnapshot({ hashRate: 500 - i * 15, timestamp: Date.now() - (20 - i) * 60000 }),
    );
    const result = forecastUptime(snapshots);
    const factors = result.riskFactors.map((r) => r.factor);
    expect(factors).toContain('Hashrate declining');
  });

  it('includes high temp in risk factors when present', () => {
    const snapshots = makeSnapshots(20, { temperature: 80 });
    const result = forecastUptime(snapshots);
    const factors = result.riskFactors.map((r) => r.factor);
    expect(factors).toContain('High temperature');
  });

  it('confidence increases with more snapshots', () => {
    const few = forecastUptime(makeSnapshots(12));
    const many = forecastUptime(makeSnapshots(100));
    expect(many.confidence).toBeGreaterThan(few.confidence);
  });

  it('confidence is capped at 0.95', () => {
    const snapshots = makeSnapshots(200);
    const result = forecastUptime(snapshots);
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });
});

describe('generateMaintenanceSchedule', () => {
  it('returns empty array for fewer than 5 snapshots', () => {
    const tasks = generateMaintenanceSchedule('miner-1', makeSnapshots(3));
    expect(tasks).toEqual([]);
  });

  it('returns only dust cleaning for few snapshots above threshold', () => {
    const snapshots = makeSnapshots(8, {
      temperature: 60,
      fanRpm: 3000,
      uptimeSeconds: 86400 * 30,
      sharesAccepted: 100,
      sharesRejected: 0,
    });
    const tasks = generateMaintenanceSchedule('miner-1', snapshots);
    const types = tasks.map((t) => t.type);
    expect(types).toContain('dust_cleaning');
    expect(types).not.toContain('thermal_paste');
    expect(types).not.toContain('fan_cleaning');
    expect(types).not.toContain('psu_check');
  });

  it('includes fan cleaning when RPM is declining', () => {
    const now = Date.now();
    const snapshots = Array.from({ length: 15 }, (_, i) =>
      makeSnapshot({
        timestamp: now - (15 - i) * 60000,
        fanRpm: i >= 8 ? 2000 : 3000,
        temperature: 55,
        uptimeSeconds: 86400 * 30,
        sharesAccepted: 100,
        sharesRejected: 0,
      }),
    );
    const tasks = generateMaintenanceSchedule('miner-1', snapshots);
    const types = tasks.map((t) => t.type);
    expect(types).toContain('fan_cleaning');
  });

  it('includes thermal paste when avg temp > 80', () => {
    const snapshots = makeSnapshots(15, { temperature: 85 });
    const tasks = generateMaintenanceSchedule('miner-1', snapshots);
    const types = tasks.map((t) => t.type);
    expect(types).toContain('thermal_paste');
  });

  it('includes PSU check when avg uptime < 28 days', () => {
    const snapshots = makeSnapshots(15, {
      uptimeSeconds: 86400 * 20,
      temperature: 55,
      sharesAccepted: 100,
      sharesRejected: 0,
      fanRpm: 3000,
    });
    const tasks = generateMaintenanceSchedule('miner-1', snapshots);
    const types = tasks.map((t) => t.type);
    expect(types).toContain('psu_check');
  });

  it('includes cable check when rejection rate > 2%', () => {
    const snapshots = makeSnapshots(15, {
      sharesAccepted: 50,
      sharesRejected: 5,
      temperature: 55,
      fanRpm: 3000,
      uptimeSeconds: 86400 * 30,
    });
    const tasks = generateMaintenanceSchedule('miner-1', snapshots);
    const types = tasks.map((t) => t.type);
    expect(types).toContain('cable_check');
  });

  it('always includes dust cleaning', () => {
    const snapshots = makeSnapshots(15, {
      temperature: 55,
      fanRpm: 3000,
      uptimeSeconds: 86400 * 30,
      sharesAccepted: 100,
      sharesRejected: 0,
    });
    const tasks = generateMaintenanceSchedule('miner-1', snapshots);
    const types = tasks.map((t) => t.type);
    expect(types).toContain('dust_cleaning');
  });

  it('assigns critical priority for high rejection rate', () => {
    const snapshots = makeSnapshots(15, {
      sharesAccepted: 50,
      sharesRejected: 10,
      temperature: 55,
      fanRpm: 3000,
      uptimeSeconds: 86400 * 30,
    });
    const tasks = generateMaintenanceSchedule('miner-1', snapshots);
    const cableTask = tasks.find((t) => t.type === 'cable_check');
    expect(cableTask).toBeDefined();
    expect(cableTask!.priority).toBe('critical');
  });
});

describe('checkWeatherAlerts', () => {
  it('returns empty for mild conditions', () => {
    const alerts = checkWeatherAlerts(25, 50);
    expect(alerts).toEqual([]);
  });

  it('detects heatwave at temperature > 35', () => {
    const alerts = checkWeatherAlerts(36, 50);
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts.some((a) => a.type === 'heatwave')).toBe(true);
  });

  it('detects extreme heat at temperature > 40', () => {
    const alerts = checkWeatherAlerts(42, 50);
    const heatwave = alerts.find((a) => a.type === 'heatwave');
    expect(heatwave).toBeDefined();
    expect(heatwave!.severity).toBe('danger');
    expect(heatwave!.title).toBe('Extreme Heat Warning');
  });

  it('detects cold snap at temperature < 5', () => {
    const alerts = checkWeatherAlerts(3, 50);
    expect(alerts.some((a) => a.type === 'cold_snap')).toBe(true);
  });

  it('detects freezing at temperature < 0', () => {
    const alerts = checkWeatherAlerts(-2, 50);
    const cold = alerts.find((a) => a.type === 'cold_snap');
    expect(cold).toBeDefined();
    expect(cold!.severity).toBe('danger');
  });

  it('detects high humidity at humidity > 80', () => {
    const alerts = checkWeatherAlerts(25, 85);
    expect(alerts.some((a) => a.type === 'high_humidity')).toBe(true);
  });

  it('detects power grid stress at high temp + humidity', () => {
    const alerts = checkWeatherAlerts(32, 75);
    expect(alerts.some((a) => a.type === 'power_outage_risk')).toBe(true);
  });

  it('returns multiple alerts for multiple conditions', () => {
    const alerts = checkWeatherAlerts(38, 85);
    expect(alerts.length).toBeGreaterThanOrEqual(3);
    const types = alerts.map((a) => a.type);
    expect(types).toContain('heatwave');
    expect(types).toContain('high_humidity');
    expect(types).toContain('power_outage_risk');
  });

  it('returns alerts with unique IDs', () => {
    const alerts = checkWeatherAlerts(42, 95);
    const ids = alerts.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
