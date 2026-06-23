import {
  sendMinerOfflineNotification,
  sendMinerOnlineNotification,
  sendMinerHotNotification,
  sendHashrateDropNotification,
} from './pushNotifications';
import { setPoolStatus } from './minerState';

interface MinerState {
  isOnline: boolean;
  temperature: number;
  hashRate: number;
  pool: string | null;
}

const minerStates = new Map<string, MinerState>();
const notificationCooldown = new Map<string, number>();
const COOLDOWN_MS = 15 * 60 * 1000;

function canNotify(key: string): boolean {
  const last = notificationCooldown.get(key);
  if (last && Date.now() - last < COOLDOWN_MS) return false;
  notificationCooldown.set(key, Date.now());
  return true;
}

export function checkMinerStatus(
  userId: string,
  minerId: string,
  minerName: string,
  ip: string,
  isOnline: boolean,
  temperature: number,
  hashRate: number = 0,
  pool: string | null = null,
): void {
  const key = `${userId}:${minerId}`;
  const prev = minerStates.get(key) as MinerState | undefined;

  if (!prev) {
    minerStates.set(key, { isOnline, temperature, hashRate, pool });
    setPoolStatus(minerId, { miner: minerName, pool, hashrate: hashRate, lastSeen: Date.now() });
    return;
  }

  if (prev.isOnline && !isOnline && canNotify(`${key}:offline`)) {
    sendMinerOfflineNotification(userId, minerName, ip, minerId);
  } else if (!prev.isOnline && isOnline && canNotify(`${key}:online`)) {
    sendMinerOnlineNotification(userId, minerName, ip, minerId);
  }

  if (temperature > 70 && prev.temperature <= 70 && canNotify(`${key}:hot`)) {
    sendMinerHotNotification(userId, minerName, ip, temperature, minerId);
  }

  const prevHr = prev.hashRate;
  if (prevHr > hashRate * 2 && hashRate > 0 && canNotify(`${key}:hashrate_drop`)) {
    const pct = Math.round((1 - hashRate / prevHr) * 100);
    sendHashrateDropNotification(userId, minerName, minerId, pct);
  }

  if (prev.pool && pool && prev.pool !== pool && canNotify(`${key}:pool_change`)) {
    // Placeholder for future pool change notification
  }

  minerStates.set(key, { isOnline, temperature, hashRate, pool });
  setPoolStatus(minerId, { miner: minerName, pool, hashrate: hashRate, lastSeen: Date.now() });
}
