import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Miner } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let notifiedOffline = new Set<string>();
let notifiedHot = new Set<string>();

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

export async function checkMinerAlerts(
  prevMiners: Miner[],
  currentMiners: Miner[]
): Promise<void> {
  for (const current of currentMiners) {
    const prev = prevMiners.find((m) => m.id === current.id);
    if (!prev) continue;

    if (prev.isOnline && !current.isOnline) {
      notifiedOffline.add(current.id);
      await sendOfflineAlert(current);
    }

    if (current.isOnline && !prev.isOnline && notifiedOffline.has(current.id)) {
      notifiedOffline.delete(current.id);
      await sendOnlineAlert(current);
    }

    const temp = current.status?.temperature ?? 0;
    if (temp > 70 && !notifiedHot.has(current.id)) {
      notifiedHot.add(current.id);
      await sendHotAlert(current, temp);
    }
    if (temp <= 65 && notifiedHot.has(current.id)) {
      notifiedHot.delete(current.id);
    }
  }
}

async function sendOfflineAlert(miner: Miner): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Miner Offline',
      body: `${miner.name} (${miner.ip}) has gone offline`,
      data: { minerId: miner.id, type: 'offline' },
      categoryIdentifier: 'miner-alerts',
    },
    trigger: null,
  });
}

async function sendOnlineAlert(miner: Miner): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Miner Reconnected',
      body: `${miner.name} (${miner.ip}) is back online`,
      data: { minerId: miner.id, type: 'online' },
      categoryIdentifier: 'miner-alerts',
    },
    trigger: null,
  });
}

async function sendHotAlert(miner: Miner, temp: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'High Temperature',
      body: `${miner.name} is ${temp.toFixed(0)}°C — check cooling`,
      data: { minerId: miner.id, type: 'hot' },
      categoryIdentifier: 'miner-alerts',
    },
    trigger: null,
  });
}
