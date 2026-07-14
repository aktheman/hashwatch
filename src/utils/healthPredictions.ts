import { Miner, MinerSnapshot } from '../types';

export interface HealthPrediction {
  minerId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictions: Prediction[];
  overallScore: number;
  recommendedActions: string[];
}

export interface Prediction {
  type:
    | 'fan_failure'
    | 'thermal_throttle'
    | 'hashrate_decline'
    | 'share_rejection_spike'
    | 'power_anomaly';
  probability: number;
  timeframe: string;
  evidence: string;
}

function trendDirection(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';
  const n = Math.min(values.length, 10);
  const recent = values.slice(0, Math.floor(n / 2));
  const older = values.slice(Math.floor(n / 2));
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
  const pctChange = avgOlder > 0 ? (avgRecent - avgOlder) / avgOlder : 0;
  if (pctChange > 0.05) return 'up';
  if (pctChange < -0.05) return 'down';
  return 'stable';
}

function predictFanFailure(snapshots: MinerSnapshot[]): Prediction | null {
  if (snapshots.length < 2) return null;
  const rpms = snapshots.map((s) => s.fanRpm ?? 0).filter((r) => r > 0);
  const speeds = snapshots.map((s) => s.fanSpeed ?? 0);
  if (rpms.length < 2 && speeds.length < 2) return null;

  let probability = 0;
  let evidence = '';

  if (rpms.length >= 2) {
    const trend = trendDirection(rpms);
    if (trend === 'down') {
      const latest = rpms[0];
      const oldest = rpms[rpms.length - 1];
      const dropPct = oldest > 0 ? (oldest - latest) / oldest : 0;
      probability = Math.min(0.95, dropPct * 1.2);
      evidence = `RPM trending down: ${oldest} → ${latest}`;
    }
  }

  if (speeds.length >= 2) {
    const latestSpeed = speeds[0];
    if (latestSpeed >= 95 && rpms.length > 0 && rpms[0] < 1000) {
      probability = Math.max(probability, 0.8);
      evidence = evidence || `Fan speed ${latestSpeed}% but RPM only ${rpms[0]}`;
    }
  }

  if (probability < 0.01) return null;

  return {
    type: 'fan_failure',
    probability: Math.round(probability * 100) / 100,
    timeframe: '7d',
    evidence,
  };
}

function predictThermalThrottle(snapshots: MinerSnapshot[]): Prediction | null {
  if (snapshots.length < 2) return null;
  const temps = snapshots.map((s) => s.temperature);
  const latest = temps[0];

  let probability = 0;
  let evidence = '';

  if (latest > 80) {
    probability = 0.85;
    evidence = `Current temp ${latest}°C (critical)`;
  } else if (latest > 70) {
    const trend = trendDirection(temps);
    if (trend === 'up') {
      probability = 0.6;
      evidence = `Temp ${latest}°C and rising`;
    } else {
      probability = 0.3;
      evidence = `Temp ${latest}°C (elevated)`;
    }
  } else {
    const trend = trendDirection(temps);
    if (trend === 'up' && latest > 60) {
      probability = 0.2;
      evidence = `Temp ${latest}°C, trending upward`;
    }
  }

  if (probability < 0.01) return null;

  return {
    type: 'thermal_throttle',
    probability: Math.round(probability * 100) / 100,
    timeframe: latest > 75 ? '24h' : '7d',
    evidence,
  };
}

function predictHashrateDecline(snapshots: MinerSnapshot[]): Prediction | null {
  if (snapshots.length < 3) return null;
  const rates = snapshots.map((s) => s.hashRate).filter((r) => r > 0);
  if (rates.length < 3) return null;

  const trend = trendDirection(rates);
  if (trend !== 'down') return null;

  const latest = rates[0];
  const oldest = rates[rates.length - 1];
  const dropPct = oldest > 0 ? (oldest - latest) / oldest : 0;
  const probability = Math.min(0.95, dropPct * 1.5);

  if (probability < 0.1) return null;

  return {
    type: 'hashrate_decline',
    probability: Math.round(probability * 100) / 100,
    timeframe: '30d',
    evidence: `Hashrate dropped ${Math.round(dropPct * 100)}%: ${oldest} → ${latest}`,
  };
}

function predictShareRejection(snapshots: MinerSnapshot[]): Prediction | null {
  if (snapshots.length < 2) return null;
  const accepted = snapshots.map((s) => s.sharesAccepted);
  const rejected = snapshots.map((s) => s.sharesRejected);

  const recentAcceptedDelta = accepted[0] - (accepted[1] ?? 0);
  const recentRejectedDelta = rejected[0] - (rejected[1] ?? 0);

  if (recentAcceptedDelta <= 0 && recentRejectedDelta <= 0) return null;

  const total = recentAcceptedDelta + recentRejectedDelta;
  if (total <= 0) return null;

  const rejectRate = recentRejectedDelta / total;

  if (rejectRate < 0.1) return null;

  const probability = Math.min(0.95, rejectRate * 1.2);
  return {
    type: 'share_rejection_spike',
    probability: Math.round(probability * 100) / 100,
    timeframe: '24h',
    evidence: `Recent rejection rate: ${Math.round(rejectRate * 100)}%`,
  };
}

function predictPowerAnomaly(snapshots: MinerSnapshot[]): Prediction | null {
  if (snapshots.length < 3) return null;
  const efficiencies = snapshots
    .map((s) => (s.power > 0 && s.hashRate > 0 ? s.hashRate / s.power : 0))
    .filter((e) => e > 0);
  if (efficiencies.length < 3) return null;

  const trend = trendDirection(efficiencies);
  if (trend !== 'down') return null;

  const latest = efficiencies[0];
  const oldest = efficiencies[efficiencies.length - 1];
  const dropPct = oldest > 0 ? (oldest - latest) / oldest : 0;
  const probability = Math.min(0.9, dropPct * 1.3);

  if (probability < 0.1) return null;

  return {
    type: 'power_anomaly',
    probability: Math.round(probability * 100) / 100,
    timeframe: '30d',
    evidence: `Efficiency degraded ${Math.round(dropPct * 100)}%`,
  };
}

function riskLevel(score: number): HealthPrediction['riskLevel'] {
  if (score >= 0.75) return 'critical';
  if (score >= 0.5) return 'high';
  if (score >= 0.25) return 'medium';
  return 'low';
}

const ACTION_MAP: Record<string, string> = {
  fan_failure: 'cleanFanVents',
  thermal_throttle: 'checkThermalPaste',
  hashrate_decline: 'verifyPoolConnection',
  share_rejection_spike: 'verifyPoolConnection',
  power_anomaly: 'checkPowerSupply',
};

function buildActions(predictions: Prediction[]): string[] {
  const seen = new Set<string>();
  const actions: string[] = [];
  for (const p of predictions) {
    const action = ACTION_MAP[p.type];
    if (action && !seen.has(action)) {
      seen.add(action);
      actions.push(action);
    }
  }
  if (predictions.some((p) => p.probability >= 0.7)) {
    if (!seen.has('reduceOverclock')) {
      seen.add('reduceOverclock');
      actions.push('reduceOverclock');
    }
  }
  return actions;
}

export function analyzeMinerHealth(miner: Miner, snapshots: MinerSnapshot[]): HealthPrediction {
  const predictions: Prediction[] = [];

  const fan = predictFanFailure(snapshots);
  if (fan) predictions.push(fan);

  const thermal = predictThermalThrottle(snapshots);
  if (thermal) predictions.push(thermal);

  const hashrate = predictHashrateDecline(snapshots);
  if (hashrate) predictions.push(hashrate);

  const shares = predictShareRejection(snapshots);
  if (shares) predictions.push(shares);

  const power = predictPowerAnomaly(snapshots);
  if (power) predictions.push(power);

  const maxProb = predictions.length > 0 ? Math.max(...predictions.map((p) => p.probability)) : 0;

  const overallScore = miner.isOnline ? Math.round((1 - maxProb) * 100) : 0;

  return {
    minerId: miner.id,
    riskLevel: miner.isOnline ? riskLevel(maxProb) : 'critical',
    predictions,
    overallScore,
    recommendedActions: buildActions(predictions),
  };
}
