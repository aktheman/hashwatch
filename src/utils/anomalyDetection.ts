import type { MinerSnapshot } from '../types';

export interface Anomaly {
  type:
    | 'hashrate_decline'
    | 'temp_spike'
    | 'share_rejection_spike'
    | 'voltage_fluctuation'
    | 'uptime_drop';
  severity: 'warning' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  expectedRange: [number, number];
  confidence: number;
  detectedAt: number;
}

function rollingAvg(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function detectHashrateDecline(snapshots: MinerSnapshot[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (snapshots.length < 10) return anomalies;
  const hashrates = snapshots.map((s) => s.hashRate);
  const rolling = rollingAvg(hashrates, 10);
  if (rolling.length < 10) return anomalies;
  const recentAvg = rolling[rolling.length - 1];
  const olderAvg = rolling[rolling.length - 10] ?? rolling[0];
  if (olderAvg === 0) return anomalies;
  const dropPercent = (olderAvg - recentAvg) / olderAvg;
  if (dropPercent > 0.2) {
    const severity = dropPercent > 0.4 ? 'critical' : 'warning';
    const confidence = clampConfidence(dropPercent * 1.5);
    anomalies.push({
      type: 'hashrate_decline',
      severity,
      message: `Hashrate dropped ${(dropPercent * 100).toFixed(1)}% from rolling average`,
      metric: 'Hashrate',
      currentValue: recentAvg,
      expectedRange: [olderAvg * 0.8, olderAvg],
      confidence,
      detectedAt: snapshots[snapshots.length - 1].timestamp,
    });
  }
  return anomalies;
}

function detectTempSpike(snapshots: MinerSnapshot[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (snapshots.length < 5) return anomalies;
  const temps = snapshots.map((s) => s.temperature);
  const rolling = rollingAvg(temps, 10);
  const recentAvg = rolling[rolling.length - 1];
  const olderAvg = rolling[Math.max(0, rolling.length - 10)] ?? rolling[0];
  const deviation = recentAvg - olderAvg;
  if (deviation > 15) {
    const severity = deviation > 25 ? 'critical' : 'warning';
    const confidence = clampConfidence(deviation / 40);
    anomalies.push({
      type: 'temp_spike',
      severity,
      message: `Temperature is ${deviation.toFixed(1)}°C above rolling average`,
      metric: 'Temperature',
      currentValue: recentAvg,
      expectedRange: [olderAvg - 5, olderAvg + 10],
      confidence,
      detectedAt: snapshots[snapshots.length - 1].timestamp,
    });
  }
  return anomalies;
}

function detectShareRejectionSpike(snapshots: MinerSnapshot[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (snapshots.length < 2) return anomalies;
  const recent = snapshots.slice(-5);
  const older = snapshots.slice(-20, -5);
  const recentTotal = recent.reduce((a, s) => a + s.sharesAccepted + s.sharesRejected, 0);
  const recentRejected = recent.reduce((a, s) => a + s.sharesRejected, 0);
  const recentRate = recentTotal > 0 ? recentRejected / recentTotal : 0;
  const olderTotal = older.reduce((a, s) => a + s.sharesAccepted + s.sharesRejected, 0);
  const olderRejected = older.reduce((a, s) => a + s.sharesRejected, 0);
  const olderRate = olderTotal > 0 ? olderRejected / olderTotal : 0;
  if (recentRate > 0.05 && recentRate > olderRate * 3) {
    const severity = recentRate > 0.15 ? 'critical' : 'warning';
    const confidence = clampConfidence(recentRate * 5);
    anomalies.push({
      type: 'share_rejection_spike',
      severity,
      message: `Share rejection rate at ${(recentRate * 100).toFixed(1)}% (was ${(olderRate * 100).toFixed(1)}%)`,
      metric: 'Rejection Rate',
      currentValue: recentRate * 100,
      expectedRange: [0, Math.max(1, olderRate * 100 * 3)],
      confidence,
      detectedAt: snapshots[snapshots.length - 1].timestamp,
    });
  }
  return anomalies;
}

function detectVoltageFluctuation(snapshots: MinerSnapshot[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (snapshots.length < 10) return anomalies;
  const recent10 = snapshots.slice(-10);
  const voltages = recent10.map((s) => s.voltage);
  const sd = stddev(voltages);
  if (sd > 0.5) {
    const severity = sd > 1.0 ? 'critical' : 'warning';
    const confidence = clampConfidence(sd / 2);
    const mean = voltages.reduce((a, b) => a + b, 0) / voltages.length;
    anomalies.push({
      type: 'voltage_fluctuation',
      severity,
      message: `Voltage standard deviation at ${sd.toFixed(3)}V (mean: ${mean.toFixed(2)}V)`,
      metric: 'Voltage',
      currentValue: sd,
      expectedRange: [0, 0.5],
      confidence,
      detectedAt: snapshots[snapshots.length - 1].timestamp,
    });
  }
  return anomalies;
}

function detectUptimeDrop(snapshots: MinerSnapshot[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (snapshots.length < 2) return anomalies;
  const last = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  if (last.uptimeSeconds < prev.uptimeSeconds && prev.uptimeSeconds > 300) {
    const severity = last.uptimeSeconds < 60 ? 'critical' : 'warning';
    const confidence = clampConfidence(1 - last.uptimeSeconds / Math.max(prev.uptimeSeconds, 1));
    anomalies.push({
      type: 'uptime_drop',
      severity,
      message: `Miner restarted — uptime dropped from ${Math.floor(prev.uptimeSeconds / 3600)}h to ${Math.floor(last.uptimeSeconds / 60)}m`,
      metric: 'Uptime',
      currentValue: last.uptimeSeconds,
      expectedRange: [prev.uptimeSeconds, prev.uptimeSeconds + 300],
      confidence,
      detectedAt: last.timestamp,
    });
  }
  return anomalies;
}

export function detectAnomalies(snapshots: MinerSnapshot[]): Anomaly[] {
  const recent = snapshots.slice(-50);
  const anomalies: Anomaly[] = [
    ...detectHashrateDecline(recent),
    ...detectTempSpike(recent),
    ...detectShareRejectionSpike(recent),
    ...detectVoltageFluctuation(recent),
    ...detectUptimeDrop(recent),
  ];
  return anomalies.sort((a, b) => b.confidence - a.confidence);
}

export function getHealthTrend(snapshots: MinerSnapshot[]): 'improving' | 'stable' | 'degrading' {
  if (snapshots.length < 10) return 'stable';
  const mid = Math.floor(snapshots.length / 2);
  const firstHalf = snapshots.slice(0, mid);
  const secondHalf = snapshots.slice(mid);

  function avgHealthScore(group: MinerSnapshot[]): number {
    if (group.length === 0) return 50;
    const scores = group.map((s) => {
      let score = 100;
      if (s.temperature > 75) score -= (s.temperature - 75) * 2;
      const totalShares = s.sharesAccepted + s.sharesRejected;
      if (totalShares > 0 && s.sharesRejected / totalShares > 0.05) score -= 20;
      if (s.hashRate === 0) score -= 30;
      return Math.max(0, Math.min(100, score));
    });
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const firstAvg = avgHealthScore(firstHalf);
  const secondAvg = avgHealthScore(secondHalf);
  const diff = secondAvg - firstAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'degrading';
  return 'stable';
}

export function predictFailureProbability(snapshots: MinerSnapshot[]): number {
  if (snapshots.length < 5) return 0;
  const anomalies = detectAnomalies(snapshots);
  if (anomalies.length === 0) return 0;
  const criticalCount = anomalies.filter((a) => a.severity === 'critical').length;
  const warningCount = anomalies.filter((a) => a.severity === 'warning').length;
  const avgConfidence = anomalies.reduce((a, b) => a + b.confidence, 0) / anomalies.length;
  const score = Math.min(1, (criticalCount * 0.25 + warningCount * 0.1) * avgConfidence);
  return Math.round(score * 100) / 100;
}
