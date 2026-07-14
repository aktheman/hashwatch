import { Platform, NativeModules } from 'react-native';
import type { Miner } from '../types';

export function isDynamicIslandSupported(): boolean {
  if (Platform.OS !== 'ios') return false;
  const majorVersion = parseInt(String(Platform.Version), 10);
  return majorVersion >= 16;
}

function computeIslandData(miners: Miner[]) {
  const onlineCount = miners.filter((m) => m.isOnline).length;
  const totalHashrate = miners.reduce((sum, m) => {
    const hr = m.status?.hashRate ?? 0;
    const unit = m.status?.hashRateUnit ?? 'GH/s';
    if (unit.toLowerCase().includes('t')) return sum + hr;
    if (unit.toLowerCase().includes('g')) return sum + hr / 1000;
    return sum;
  }, 0);

  const topMiners = [...miners]
    .filter((m) => m.isOnline)
    .sort((a, b) => (b.status?.hashRate ?? 0) - (a.status?.hashRate ?? 0))
    .slice(0, 3)
    .map((m) => ({
      name: m.name,
      hashrate: `${m.status?.hashRate ?? 0} ${m.status?.hashRateUnit ?? 'GH/s'}`,
      temperature: m.status?.temperature ?? 0,
    }));

  return {
    onlineCount,
    totalCount: miners.length,
    totalHashrate: `${totalHashrate.toFixed(2)} TH/s`,
    topMiners,
  };
}

export async function updateDynamicIsland(miners: Miner[]): Promise<void> {
  if (!isDynamicIslandSupported()) return;
  if (!NativeModules.DynamicIsland) return;

  try {
    const data = computeIslandData(miners);
    await NativeModules.DynamicIsland.update({
      compact: `${data.onlineCount}/${data.totalCount} · ${data.totalHashrate}`,
      expanded: data.topMiners
        .map((m) => `${m.name}: ${m.hashrate} @ ${m.temperature}°C`)
        .join('\n'),
    });
  } catch {
    // no-op — module may not be available
  }
}
