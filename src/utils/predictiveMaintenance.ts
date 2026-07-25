import { MinerSnapshot } from '../types';

export interface MaintenanceTask {
  id: string;
  minerId: string;
  type:
    | 'fan_cleaning'
    | 'thermal_paste'
    | 'dust_cleaning'
    | 'psu_check'
    | 'firmware_update'
    | 'cable_check'
    | 'custom';
  title: string;
  description: string;
  dueDate: number; // timestamp
  completedDate?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  estimatedDuration: number; // minutes
  estimatedCost: number; // USD
  createdAt: number;
}

export interface UptimeForecast {
  minerId: string;
  predictedUptime30d: number; // percentage 0-100
  predictedDowntimeHours: number;
  riskFactors: Array<{ factor: string; impact: number }>;
  confidence: number; // 0-1
  nextMaintenanceDate?: number;
}

export interface WeatherAlert {
  id: string;
  type: 'heatwave' | 'cold_snap' | 'power_outage_risk' | 'high_humidity' | 'storm';
  severity: 'info' | 'warning' | 'danger';
  title: string;
  description: string;
  temperature?: number;
  humidity?: number;
  expiresAt: number;
}

// Helper: generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Calculate predicted uptime based on historical snapshots
export function forecastUptime(snapshots: MinerSnapshot[]): UptimeForecast {
  if (snapshots.length < 10) {
    return {
      minerId: snapshots[0]?.minerId || '',
      predictedUptime30d: 95,
      predictedDowntimeHours: 36,
      riskFactors: [],
      confidence: 0.3,
    };
  }

  const sorted = [...snapshots].sort((a, b) => b.timestamp - a.timestamp);
  const recent = sorted.slice(0, Math.min(50, sorted.length));
  const total = recent.length;

  // Calculate downtime periods (gaps > 5 min between snapshots)
  let downtimeCount = 0;
  for (let i = 1; i < recent.length; i++) {
    const gap = (recent[i - 1].timestamp - recent[i].timestamp) / 1000;
    if (gap > 300) downtimeCount++;
  }

  // Calculate avg hashrate trend
  const halfLen = Math.floor(recent.length / 2);
  const recentHalf = recent.slice(0, halfLen);
  const olderHalf = recent.slice(halfLen);
  const recentAvgHash = recentHalf.reduce((s, r) => s + r.hashRate, 0) / (halfLen || 1);
  const olderAvgHash = olderHalf.reduce((s, r) => s + r.hashRate, 0) / (halfLen || 1);
  const hashrateChange = olderAvgHash > 0 ? (recentAvgHash - olderAvgHash) / olderAvgHash : 0;

  // Temperature trend
  const avgTempRecent = recentHalf.reduce((s, r) => s + r.temperature, 0) / (halfLen || 1);
  const avgTempOlder = olderHalf.reduce((s, r) => s + r.temperature, 0) / (halfLen || 1);
  const tempIncrease = avgTempRecent - avgTempOlder;

  // Base uptime from gap analysis
  const gapUptime =
    total > 1 ? Math.max(0, Math.min(100, 100 - (downtimeCount / (total - 1)) * 100)) : 95;

  // Adjust for hashrate decline
  let adjustedUptime = gapUptime;
  if (hashrateChange < -0.1) adjustedUptime *= 0.95;
  if (hashrateChange < -0.2) adjustedUptime *= 0.9;

  // Adjust for temperature increase
  if (tempIncrease > 5) adjustedUptime *= 0.97;
  if (tempIncrease > 10) adjustedUptime *= 0.93;

  const predictedUptime30d = Math.max(50, Math.min(99.9, adjustedUptime));
  const predictedDowntimeHours = ((100 - predictedUptime30d) / 100) * 30 * 24;

  const riskFactors: Array<{ factor: string; impact: number }> = [];
  if (hashrateChange < -0.05)
    riskFactors.push({ factor: 'Hashrate declining', impact: Math.abs(hashrateChange) * 100 });
  if (tempIncrease > 3)
    riskFactors.push({ factor: 'Temperature rising', impact: tempIncrease * 2 });
  if (downtimeCount > 2)
    riskFactors.push({ factor: 'Frequent disconnects', impact: downtimeCount * 5 });
  if (avgTempRecent > 75)
    riskFactors.push({ factor: 'High temperature', impact: (avgTempRecent - 75) * 3 });

  const confidence = Math.min(0.95, 0.3 + (total / 200) * 0.65);

  return {
    minerId: recent[0]?.minerId || '',
    predictedUptime30d: Math.round(predictedUptime30d * 10) / 10,
    predictedDowntimeHours: Math.round(predictedDowntimeHours * 10) / 10,
    riskFactors,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// Generate maintenance tasks based on snapshot data
export function generateMaintenanceSchedule(
  minerId: string,
  snapshots: MinerSnapshot[],
): Omit<MaintenanceTask, 'id' | 'createdAt'>[] {
  if (snapshots.length < 5) return [];

  const sorted = [...snapshots].sort((a, b) => b.timestamp - a.timestamp);
  const recent = sorted.slice(0, Math.min(50, sorted.length));
  const tasks: Omit<MaintenanceTask, 'id' | 'createdAt'>[] = [];
  const now = Date.now();

  const avgTemp = recent.reduce((s, r) => s + r.temperature, 0) / recent.length;
  const avgUptime = recent.reduce((s, r) => s + r.uptimeSeconds, 0) / recent.length;
  const rejectionRate =
    recent.reduce((s, r) => s + r.sharesRejected, 0) /
    Math.max(
      1,
      recent.reduce((s, r) => s + r.sharesAccepted + r.sharesRejected, 0),
    );

  // Fan cleaning if RPM declining or temp high
  const halfLen = Math.floor(recent.length / 2);
  const recentFanRpm =
    recent.slice(0, halfLen).reduce((s, r) => s + (r.fanRpm ?? 0), 0) / (halfLen || 1);
  const olderFanRpm =
    recent.slice(halfLen).reduce((s, r) => s + (r.fanRpm ?? 0), 0) / (halfLen || 1);
  if (recentFanRpm < olderFanRpm * 0.9 || avgTemp > 70) {
    tasks.push({
      minerId,
      type: 'fan_cleaning',
      title: 'Clean fan vents',
      description: `Fan RPM dropped ${Math.round((1 - recentFanRpm / (olderFanRpm || 1)) * 100)}%. Clean dust from fan vents.`,
      dueDate: now + 7 * 24 * 60 * 60 * 1000,
      priority: avgTemp > 75 ? 'high' : 'medium',
      status: 'pending',
      estimatedDuration: 15,
      estimatedCost: 0,
    });
  }

  // Thermal paste if consistently > 80°C
  if (avgTemp > 80) {
    tasks.push({
      minerId,
      type: 'thermal_paste',
      title: 'Replace thermal paste',
      description: `Average temperature ${Math.round(avgTemp)}°C exceeds safe threshold.`,
      dueDate: now + 14 * 24 * 60 * 60 * 1000,
      priority: 'high',
      status: 'pending',
      estimatedDuration: 45,
      estimatedCost: 15,
    });
  }

  // PSU check if uptime < 25d/month or unstable
  const avgUptimeDays = avgUptime / 86400;
  if (avgUptimeDays < 28) {
    tasks.push({
      minerId,
      type: 'psu_check',
      title: 'Check power supply',
      description: `Average uptime ${Math.round(avgUptimeDays)}d/month suggests power instability.`,
      dueDate: now + 10 * 24 * 60 * 60 * 1000,
      priority: avgUptimeDays < 25 ? 'high' : 'medium',
      status: 'pending',
      estimatedDuration: 30,
      estimatedCost: 0,
    });
  }

  // Share rejection check
  if (rejectionRate > 0.02) {
    tasks.push({
      minerId,
      type: 'cable_check',
      title: 'Check network cables',
      description: `Share rejection rate ${(rejectionRate * 100).toFixed(1)}% exceeds 2% threshold.`,
      dueDate: now + 3 * 24 * 60 * 60 * 1000,
      priority: rejectionRate > 0.05 ? 'critical' : 'high',
      status: 'pending',
      estimatedDuration: 20,
      estimatedCost: 0,
    });
  }

  // Dust cleaning every 30 days
  tasks.push({
    minerId,
    type: 'dust_cleaning',
    title: 'Dust cleaning',
    description: 'Scheduled dust cleaning for optimal airflow.',
    dueDate: now + 30 * 24 * 60 * 60 * 1000,
    priority: 'low',
    status: 'pending',
    estimatedDuration: 30,
    estimatedCost: 0,
  });

  return tasks;
}

// Simulate weather alerts based on environment
export function checkWeatherAlerts(temperature: number, humidity: number): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000;

  if (temperature > 35) {
    alerts.push({
      id: generateId(),
      type: 'heatwave',
      severity: temperature > 40 ? 'danger' : 'warning',
      title: temperature > 40 ? 'Extreme Heat Warning' : 'Heat Advisory',
      description: `Ambient temperature ${temperature}°C. Miners may throttle. Ensure adequate cooling.`,
      temperature,
      humidity,
      expiresAt,
    });
  }

  if (temperature < 5) {
    alerts.push({
      id: generateId(),
      type: 'cold_snap',
      severity: temperature < 0 ? 'danger' : 'warning',
      title: temperature < 0 ? 'Freezing Temperature Alert' : 'Cold Weather Advisory',
      description: `Ambient temperature ${temperature}°C. Condensation risk. Monitor humidity.`,
      temperature,
      humidity,
      expiresAt,
    });
  }

  if (humidity > 80) {
    alerts.push({
      id: generateId(),
      type: 'high_humidity',
      severity: humidity > 90 ? 'danger' : 'warning',
      title: 'High Humidity Alert',
      description: `Humidity at ${humidity}%. Risk of condensation damage to electronics.`,
      humidity,
      temperature,
      expiresAt,
    });
  }

  if (temperature > 30 && humidity > 70) {
    alerts.push({
      id: generateId(),
      type: 'power_outage_risk',
      severity: 'warning',
      title: 'Power Grid Stress',
      description: 'High temperature + humidity may cause power grid instability. Monitor uptime.',
      temperature,
      humidity,
      expiresAt,
    });
  }

  return alerts;
}
