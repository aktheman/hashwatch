import { Platform } from 'react-native';
import type { Miner } from '../types';

// expo-activitykit may not be installed — use dynamic import with any types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activityModule: any = null;
let loadAttempted = false;

export function _resetModuleCache(): void {
  activityModule = null;
  loadAttempted = false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadModule(): Promise<any | null> {
  if (loadAttempted) return activityModule;
  loadAttempted = true;
  if (Platform.OS !== 'ios') return null;
  try {
    // expo-activitykit may not be installed
    const mod = require('expo-activitykit'); // eslint-disable-line @typescript-eslint/no-require-imports
    activityModule = mod;
    return mod;
  } catch {
    return null;
  }
}

function computeStats(miners: Miner[]) {
  const onlineCount = miners.filter((m) => m.isOnline).length;
  const totalHashrate = miners.reduce((sum, m) => {
    const hr = m.status?.hashRate ?? 0;
    const unit = m.status?.hashRateUnit ?? 'GH/s';
    if (unit.toLowerCase().includes('t')) return sum + hr;
    if (unit.toLowerCase().includes('g')) return sum + hr / 1000;
    return sum;
  }, 0);
  const alertCount = miners.filter(
    (m) =>
      m.isOnline && ((m.status?.temperature ?? 0) > 80 || (m.status?.sharesRejected ?? 0) > 10),
  ).length;

  return {
    onlineCount,
    totalCount: miners.length,
    totalHashrate: totalHashrate.toFixed(2),
    alertCount,
  };
}

export async function startLiveActivity(miners: Miner[]): Promise<void> {
  const mod = await loadModule();
  if (!mod || !mod.startActivityAsync) return;

  try {
    const stats = computeStats(miners);
    await mod.startActivityAsync(
      { type: 'MiningMonitor' },
      {
        value: {
          onlineCount: stats.onlineCount,
          totalCount: stats.totalCount,
          totalHashrate: `${stats.totalHashrate} TH/s`,
          alertCount: stats.alertCount,
        },
      },
    );
  } catch {
    // no-op — module may not be available
  }
}

export async function updateLiveActivity(miners: Miner[]): Promise<void> {
  const mod = await loadModule();
  if (!mod || !mod.updateActivityAsync) return;

  try {
    const stats = computeStats(miners);
    await mod.updateActivityAsync(
      { type: 'MiningMonitor' },
      {
        value: {
          onlineCount: stats.onlineCount,
          totalCount: stats.totalCount,
          totalHashrate: `${stats.totalHashrate} TH/s`,
          alertCount: stats.alertCount,
        },
      },
    );
  } catch {
    // no-op
  }
}

export async function endLiveActivity(): Promise<void> {
  const mod = await loadModule();
  if (!mod || !mod.endActivityAsync) return;

  try {
    await mod.endActivityAsync({ type: 'MiningMonitor' });
  } catch {
    // no-op
  }
}

export function isLiveActivitySupported(): boolean {
  return Platform.OS === 'ios';
}
