import {
  sendMinerOfflineNotification,
  sendMinerOnlineNotification,
  sendMinerHotNotification,
} from './pushNotifications';

interface MinerState {
  isOnline: boolean;
  temperature: number;
}

const minerStates = new Map<string, MinerState>();

export function checkMinerStatus(
  userId: string,
  minerId: string,
  minerName: string,
  ip: string,
  isOnline: boolean,
  temperature: number,
): void {
  const key = `${userId}:${minerId}`;
  const prev = minerStates.get(key);

  if (!prev) {
    minerStates.set(key, { isOnline, temperature });
    return;
  }

  if (prev.isOnline && !isOnline) {
    sendMinerOfflineNotification(userId, minerName, ip, minerId);
  } else if (!prev.isOnline && isOnline) {
    sendMinerOnlineNotification(userId, minerName, ip, minerId);
  }

  if (temperature > 70 && prev.temperature <= 70) {
    sendMinerHotNotification(userId, minerName, ip, temperature, minerId);
  }

  minerStates.set(key, { isOnline, temperature });
}
