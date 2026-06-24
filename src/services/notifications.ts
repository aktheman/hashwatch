import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Miner } from '../types';
import * as DB from '../db/database';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const OFFLINE_REMINDER_MS = 5 * 60 * 1000;
const UPTIME_THRESHOLD = 24 * 60 * 60;

let notifiedOfflineAt = new Map<string, number>();
let notifiedHot = new Set<string>();
let notifiedHashrateDrop = new Set<string>();
let notifiedPoolLoss = new Set<string>();
let notifiedLongUptime = new Set<string>();
let prevHashrates = new Map<string, number>();

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('miner-alerts', {
        name: 'Miner Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 100],
      });
    }
    return true;
  } catch {
    return false;
  }
}

export function resetAlertState(): void {
  notifiedOfflineAt = new Map();
  notifiedHot = new Set();
  notifiedHashrateDrop = new Set();
  notifiedPoolLoss = new Set();
  notifiedLongUptime = new Set();
  prevHashrates = new Map();
}

export function cleanupAlertState(activeMinerIds: Set<string>): void {
  for (const key of notifiedOfflineAt.keys()) {
    if (!activeMinerIds.has(key)) notifiedOfflineAt.delete(key);
  }
  for (const key of notifiedHot) {
    if (!activeMinerIds.has(key)) notifiedHot.delete(key);
  }
  for (const key of notifiedHashrateDrop) {
    if (!activeMinerIds.has(key)) notifiedHashrateDrop.delete(key);
  }
  for (const key of notifiedPoolLoss) {
    if (!activeMinerIds.has(key)) notifiedPoolLoss.delete(key);
  }
  for (const key of notifiedLongUptime) {
    if (!activeMinerIds.has(key)) notifiedLongUptime.delete(key);
  }
  for (const key of prevHashrates.keys()) {
    if (!activeMinerIds.has(key)) prevHashrates.delete(key);
  }
}

export async function checkMinerAlerts(prevMiners: Miner[], currentMiners: Miner[]): Promise<void> {
  cleanupAlertState(new Set(currentMiners.map((m) => m.id)));

  const enabledSetting = await DB.getSetting('notifications_enabled');
  if (enabledSetting === 'false') return;

  for (const current of currentMiners) {
    const prev = prevMiners.find((m) => m.id === current.id);
    if (!prev) continue;

    if (prev.isOnline && !current.isOnline) {
      notifiedOfflineAt.set(current.id, Date.now());
      await sendOfflineAlert(current);
    }

    if (current.isOnline && !prev.isOnline) {
      const lastOffline = notifiedOfflineAt.get(current.id);
      if (lastOffline) {
        notifiedOfflineAt.delete(current.id);
        await sendOnlineAlert(current);
      }
    }

    if (!current.isOnline) {
      const lastOffline = notifiedOfflineAt.get(current.id);
      if (lastOffline && Date.now() - lastOffline > OFFLINE_REMINDER_MS) {
        notifiedOfflineAt.set(current.id, Date.now());
        await sendOfflineReminder(current);
      }
      continue;
    }

    const temp = current.status?.temperature ?? 0;
    if (temp > 70 && !notifiedHot.has(current.id)) {
      notifiedHot.add(current.id);
      await sendHotAlert(current, temp);
    }
    if (temp <= 65 && notifiedHot.has(current.id)) {
      notifiedHot.delete(current.id);
    }

    const hr = current.status?.hashRate ?? 0;
    const prevHr = prev.status?.hashRate ?? 0;
    if (prevHr > 0 && hr > 0 && prevHr / hr > 2 && !notifiedHashrateDrop.has(current.id)) {
      notifiedHashrateDrop.add(current.id);
      await sendHashrateDropAlert(current, hr, prevHr);
    }
    if (hr >= prevHr && notifiedHashrateDrop.has(current.id)) {
      notifiedHashrateDrop.delete(current.id);
    }

    const pool = current.status?.pool;
    const prevPool = prev.status?.pool;
    if (prevPool && !pool && !notifiedPoolLoss.has(current.id)) {
      notifiedPoolLoss.add(current.id);
      await sendPoolLostAlert(current, prevPool);
    }
    if (pool && notifiedPoolLoss.has(current.id)) {
      notifiedPoolLoss.delete(current.id);
    }

    const uptime = current.status?.uptimeSeconds ?? 0;
    if (uptime > UPTIME_THRESHOLD && !notifiedLongUptime.has(current.id)) {
      notifiedLongUptime.add(current.id);
      await sendLongUptimeAlert(current, uptime);
    }
    if (uptime < UPTIME_THRESHOLD && notifiedLongUptime.has(current.id)) {
      notifiedLongUptime.delete(current.id);
    }

    prevHashrates.set(current.id, hr);
  }
}

async function send(title: string, body: string, data?: Record<string, string>) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, categoryIdentifier: 'miner-alerts' },
    trigger: null,
  });
}

async function sendOfflineAlert(miner: Miner) {
  await send('Miner Offline', `${miner.name} (${miner.ip}) has gone offline`, {
    minerId: miner.id,
    type: 'offline',
  });
}

async function sendOfflineReminder(miner: Miner) {
  await send('Still Offline', `${miner.name} has been offline for over 5 minutes`, {
    minerId: miner.id,
    type: 'offline_reminder',
  });
}

async function sendOnlineAlert(miner: Miner) {
  await send('Miner Reconnected', `${miner.name} (${miner.ip}) is back online`, {
    minerId: miner.id,
    type: 'online',
  });
}

async function sendHotAlert(miner: Miner, temp: number) {
  await send('High Temperature', `${miner.name} is ${temp.toFixed(0)}°C — check cooling`, {
    minerId: miner.id,
    type: 'hot',
  });
}

async function sendHashrateDropAlert(miner: Miner, currentHr: number, prevHr: number) {
  const pct = Math.round((1 - currentHr / prevHr) * 100);
  await send('Hashrate Drop', `${miner.name} hashrate dropped ${pct}%`, {
    minerId: miner.id,
    type: 'hashrate_drop',
  });
}

async function sendPoolLostAlert(miner: Miner, pool: string) {
  await send('Pool Disconnected', `${miner.name} lost connection to ${pool}`, {
    minerId: miner.id,
    type: 'pool_lost',
  });
}

async function sendLongUptimeAlert(miner: Miner, seconds: number) {
  const hrs = Math.round(seconds / 3600);
  await send('Long Uptime', `${miner.name} running for ${hrs}h`, {
    minerId: miner.id,
    type: 'long_uptime',
  });
}
