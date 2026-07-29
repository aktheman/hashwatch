import { Miner } from '../types';
import { getSetting, setSetting } from '../db/database';
import { toHashesPerSecond, formatHashrateValue } from '../utils/hashrate';

const WIDGET_DATA_KEY = 'widget_data';

export interface WidgetData {
  totalMiners: number;
  onlineMiners: number;
  totalHashrate: number;
  avgTemp: number;
  fleetHealth: string;
  lastUpdated: number;
}

function calculateHealthGrade(online: number, total: number, avgTemp: number): string {
  if (total === 0) return 'F';
  const uptimeScore = (online / total) * 60;
  const tempScore = avgTemp <= 65 ? 40 : avgTemp <= 75 ? 20 : avgTemp <= 85 ? 10 : 0;
  const score = uptimeScore + tempScore;
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export async function prepareWidgetData(miners: Miner[]): Promise<WidgetData> {
  const totalMiners = miners.length;
  const onlineMiners = miners.filter((m) => m.isOnline).length;

  let totalHashrate = 0;
  let tempSum = 0;
  let tempCount = 0;

  for (const miner of miners) {
    if (miner.status?.hashRate) {
      totalHashrate += toHashesPerSecond(miner.status.hashRate, miner.status.hashRateUnit);
    }
    if (miner.status?.temperature && miner.status.temperature > 0) {
      tempSum += miner.status.temperature;
      tempCount++;
    }
  }

  const avgTemp = tempCount > 0 ? tempSum / tempCount : 0;
  const fleetHealth = calculateHealthGrade(onlineMiners, totalMiners, avgTemp);

  return {
    totalMiners,
    onlineMiners,
    totalHashrate,
    avgTemp: Math.round(avgTemp * 10) / 10,
    fleetHealth,
    lastUpdated: Date.now(),
  };
}

export async function saveWidgetData(data: WidgetData): Promise<void> {
  try {
    await setSetting(WIDGET_DATA_KEY, JSON.stringify(data));
  } catch {
    // Storage may be unavailable
  }
}

export async function loadWidgetData(): Promise<WidgetData | null> {
  try {
    const raw = await getSetting(WIDGET_DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WidgetData;
  } catch {
    return null;
  }
}

export function formatWidgetHashrate(hashesPerSecond: number): string {
  if (hashesPerSecond <= 0) return '0 H/s';
  return formatHashrateValue(hashesPerSecond);
}
