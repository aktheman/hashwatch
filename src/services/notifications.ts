import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Miner } from '../types';
import * as DB from '../db/database';
import { useAlertHistoryStore } from '../store/alertHistory';

const OFFLINE_REMINDER_TEXT = 'offline for over 5 minutes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let notifiedOfflineAt = new Map<string, number>();
let notifiedHot = new Set<string>();
let notifiedHashrateDrop = new Set<string>();
let notifiedPoolLoss = new Set<string>();
let notifiedLongUptime = new Set<string>();
let notifiedShareRejection = new Set<string>();
let prevHashrates = new Map<string, number>();
let prevSharesAccepted = new Map<string, number>();
let prevSharesRejected = new Map<string, number>();
let pendingBatch: { title: string; body: string; data?: Record<string, string> }[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

const BATCH_DELAY_MS = 2000;

export interface AlertRule {
  enabled: boolean;
  tempThreshold: number;
  hashrateDropPercent: number;
  offlineReminderMinutes: number;
  uptimeThresholdHours: number;
  shareRejectionPercent: number;
}

const DEFAULT_RULES: AlertRule = {
  enabled: true,
  tempThreshold: 70,
  hashrateDropPercent: 50,
  offlineReminderMinutes: 5,
  uptimeThresholdHours: 24,
  shareRejectionPercent: 10,
};

export async function getAlertRules(minerId: string): Promise<AlertRule> {
  const saved = await DB.getSetting(`alert_rules_${minerId}`);
  if (saved) {
    try {
      return { ...DEFAULT_RULES, ...JSON.parse(saved) };
    } catch {}
  }
  return DEFAULT_RULES;
}

export async function setAlertRules(minerId: string, rules: AlertRule): Promise<void> {
  await DB.setSetting(`alert_rules_${minerId}`, JSON.stringify(rules));
  try {
    const { useAuthStore } = await import('../store/auth');
    const token = useAuthStore.getState().token;
    if (token) {
      const { putMinerAlertRules } = await import('../api/client');
      await putMinerAlertRules(minerId, {
        enabled: rules.enabled,
        tempThreshold: rules.tempThreshold,
        hashrateDropPercent: rules.hashrateDropPercent,
        offlineReminderMinutes: rules.offlineReminderMinutes,
        uptimeThresholdHours: rules.uptimeThresholdHours,
      });
    }
  } catch {
    // silent — offline or not authenticated
  }
}

export { DEFAULT_RULES };

export async function getDefaultAlertRules(): Promise<AlertRule> {
  const saved = await DB.getSetting('default_alert_rules');
  if (saved) {
    try {
      return { ...DEFAULT_RULES, ...JSON.parse(saved) };
    } catch {}
  }
  return { ...DEFAULT_RULES };
}

export async function setDefaultAlertRules(rules: AlertRule): Promise<void> {
  await DB.setSetting('default_alert_rules', JSON.stringify(rules));
}

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
  notifiedShareRejection = new Set();
  prevHashrates = new Map();
  prevSharesAccepted = new Map();
  prevSharesRejected = new Map();
  pendingBatch = [];
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
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
  for (const key of notifiedShareRejection) {
    if (!activeMinerIds.has(key)) notifiedShareRejection.delete(key);
  }
  for (const key of prevHashrates.keys()) {
    if (!activeMinerIds.has(key)) prevHashrates.delete(key);
  }
  for (const key of prevSharesAccepted.keys()) {
    if (!activeMinerIds.has(key)) prevSharesAccepted.delete(key);
  }
  for (const key of prevSharesRejected.keys()) {
    if (!activeMinerIds.has(key)) prevSharesRejected.delete(key);
  }
}

export async function checkMinerAlerts(prevMiners: Miner[], currentMiners: Miner[]): Promise<void> {
  cleanupAlertState(new Set(currentMiners.map((m) => m.id)));

  const enabledSetting = await DB.getSetting('notifications_enabled');
  if (enabledSetting === 'false') return;

  if (await isQuietHours()) return;

  const alertRuleCache = new Map<string, AlertRule>();
  const alertPrefCache = new Map<string, Record<string, boolean>>();
  for (const miner of currentMiners) {
    if (!alertRuleCache.has(miner.id)) {
      const rules = await getAlertRules(miner.id);
      alertRuleCache.set(miner.id, rules);
    }
    if (!alertPrefCache.has(miner.id)) {
      const raw = await DB.getSetting(`notify_${miner.id}`);
      try {
        alertPrefCache.set(miner.id, raw ? JSON.parse(raw) : {});
      } catch {
        alertPrefCache.set(miner.id, {});
      }
    }
  }

  for (const current of currentMiners) {
    const prev = prevMiners.find((m) => m.id === current.id);
    if (!prev) continue;
    const rules = alertRuleCache.get(current.id) || DEFAULT_RULES;
    const prefs = alertPrefCache.get(current.id) || {};

    if (!rules.enabled) continue;

    if (prev.isOnline && !current.isOnline) {
      if (prefs.offline !== false) {
        notifiedOfflineAt.set(current.id, Date.now());
        await sendOfflineAlert(current);
      }
    }

    if (current.isOnline && !prev.isOnline) {
      const lastOffline = notifiedOfflineAt.get(current.id);
      if (lastOffline) {
        notifiedOfflineAt.delete(current.id);
        if (prefs.online !== false) {
          await sendOnlineAlert(current);
        }
      }
    }

    if (!current.isOnline) {
      const lastOffline = notifiedOfflineAt.get(current.id);
      const reminderMs = rules.offlineReminderMinutes * 60 * 1000;
      if (lastOffline && Date.now() - lastOffline > reminderMs) {
        notifiedOfflineAt.set(current.id, Date.now());
        if (prefs.offline !== false) {
          await sendOfflineReminder(current);
        }
      }
      continue;
    }

    const temp = current.status?.temperature ?? 0;
    if (temp > rules.tempThreshold && !notifiedHot.has(current.id)) {
      notifiedHot.add(current.id);
      if (prefs.hot !== false) {
        await sendHotAlert(current, temp);
      }
    }
    if (temp <= rules.tempThreshold - 5 && notifiedHot.has(current.id)) {
      notifiedHot.delete(current.id);
    }

    const hr = current.status?.hashRate ?? 0;
    const prevHr = prev.status?.hashRate ?? 0;
    const dropRatio = 100 / (100 - rules.hashrateDropPercent);
    if (prevHr > 0 && hr > 0 && prevHr / hr > dropRatio && !notifiedHashrateDrop.has(current.id)) {
      notifiedHashrateDrop.add(current.id);
      if (prefs.hashrate_drop !== false) {
        await sendHashrateDropAlert(current, hr, prevHr);
      }
    }
    if (hr >= prevHr && notifiedHashrateDrop.has(current.id)) {
      notifiedHashrateDrop.delete(current.id);
    }

    const pool = current.status?.pool;
    const prevPool = prev.status?.pool;
    if (prevPool && !pool && !notifiedPoolLoss.has(current.id)) {
      notifiedPoolLoss.add(current.id);
      if (prefs.pool_lost !== false) {
        await sendPoolLostAlert(current, prevPool);
      }
    }
    if (pool && notifiedPoolLoss.has(current.id)) {
      notifiedPoolLoss.delete(current.id);
    }

    const uptimeThresholdSec = rules.uptimeThresholdHours * 3600;
    const uptime = current.status?.uptimeSeconds ?? 0;
    if (uptime > uptimeThresholdSec && !notifiedLongUptime.has(current.id)) {
      notifiedLongUptime.add(current.id);
      if (prefs.long_uptime !== false) {
        await sendLongUptimeAlert(current, uptime);
      }
    }
    if (uptime < uptimeThresholdSec && notifiedLongUptime.has(current.id)) {
      notifiedLongUptime.delete(current.id);
    }

    const curAccepted = current.status?.sharesAccepted ?? 0;
    const curRejected = current.status?.sharesRejected ?? 0;
    const prevAccepted = prevSharesAccepted.get(current.id) ?? 0;
    const prevRejected = prevSharesRejected.get(current.id) ?? 0;
    const deltaAccepted = curAccepted - prevAccepted;
    const deltaRejected = curRejected - prevRejected;
    if (deltaAccepted + deltaRejected > 0) {
      const rejectionRate = (deltaRejected / (deltaAccepted + deltaRejected)) * 100;
      if (rejectionRate >= rules.shareRejectionPercent && !notifiedShareRejection.has(current.id)) {
        notifiedShareRejection.add(current.id);
        if (prefs.share_rejection !== false) {
          await sendShareRejectionAlert(current, rejectionRate);
        }
      }
      if (
        rejectionRate < rules.shareRejectionPercent / 2 &&
        notifiedShareRejection.has(current.id)
      ) {
        notifiedShareRejection.delete(current.id);
      }
    }
    prevSharesAccepted.set(current.id, curAccepted);
    prevSharesRejected.set(current.id, curRejected);

    prevHashrates.set(current.id, hr);
  }

  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  flushBatch();
}

async function send(title: string, body: string, data?: Record<string, string>) {
  pendingBatch.push({ title, body, data });

  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  batchTimer = setTimeout(() => {
    flushBatch();
  }, BATCH_DELAY_MS);
  if (batchTimer && typeof batchTimer === 'object' && 'unref' in batchTimer) {
    batchTimer.unref();
  }
}

function flushBatch(): void {
  if (pendingBatch.length === 0) return;

  const items = [...pendingBatch];
  pendingBatch = [];

  if (items.length === 1) {
    const { title, body, data } = items[0];
    if (window.electronAPI?.isElectron) {
      window.electronAPI.sendNotification(title, body);
    }
    if (Platform.OS !== 'web') {
      Notifications.scheduleNotificationAsync({
        content: { title, body, data, categoryIdentifier: 'miner-alerts' },
        trigger: null,
      });
    }
    return;
  }

  const offlineCount = items.filter((i) => i.data?.type === 'offline').length;
  const onlineCount = items.filter((i) => i.data?.type === 'online').length;
  const otherCount = items.length - offlineCount - onlineCount;

  const parts: string[] = [];
  if (offlineCount > 0)
    parts.push(`${offlineCount} miner${offlineCount > 1 ? 's' : ''} went offline`);
  if (onlineCount > 0) parts.push(`${onlineCount} miner${onlineCount > 1 ? 's' : ''} reconnected`);
  if (otherCount > 0) parts.push(`${otherCount} other alert${otherCount > 1 ? 's' : ''}`);

  const title = 'HashWatch Alerts';
  const body = parts.join(', ');

  if (window.electronAPI?.isElectron) {
    window.electronAPI.sendNotification(title, body);
  }
  if (Platform.OS !== 'web') {
    Notifications.scheduleNotificationAsync({
      content: { title, body, data: { type: 'batch' }, categoryIdentifier: 'miner-alerts' },
      trigger: null,
    });
  }
}

async function sendOfflineAlert(miner: Miner) {
  await send('Miner Offline', `${miner.name} (${miner.ip}) has gone offline`, {
    minerId: miner.id,
    type: 'offline',
  });
  useAlertHistoryStore.getState().addEvent({
    minerId: miner.id,
    minerName: miner.name,
    type: 'offline',
    title: `${miner.name} went offline`,
  });
}

async function sendOfflineReminder(miner: Miner) {
  await send('Still Offline', `${miner.name} has been ${OFFLINE_REMINDER_TEXT}`, {
    minerId: miner.id,
    type: 'offline_reminder',
  });
  useAlertHistoryStore.getState().addEvent({
    minerId: miner.id,
    minerName: miner.name,
    type: 'offline_reminder',
    title: `${miner.name} still offline`,
  });
}

async function sendOnlineAlert(miner: Miner) {
  await send('Miner Reconnected', `${miner.name} (${miner.ip}) is back online`, {
    minerId: miner.id,
    type: 'online',
  });
  useAlertHistoryStore.getState().addEvent({
    minerId: miner.id,
    minerName: miner.name,
    type: 'online',
    title: `${miner.name} reconnected`,
  });
}

async function sendHotAlert(miner: Miner, temp: number) {
  await send('High Temperature', `${miner.name} is ${temp.toFixed(0)}°C — check cooling`, {
    minerId: miner.id,
    type: 'hot',
  });
  useAlertHistoryStore.getState().addEvent({
    minerId: miner.id,
    minerName: miner.name,
    type: 'hot',
    title: `${miner.name} temperature ${temp.toFixed(0)}°C`,
  });
}

async function sendHashrateDropAlert(miner: Miner, currentHr: number, prevHr: number) {
  const pct = Math.round((1 - currentHr / prevHr) * 100);
  await send('Hashrate Drop', `${miner.name} hashrate dropped ${pct}%`, {
    minerId: miner.id,
    type: 'hashrate_drop',
  });
  useAlertHistoryStore.getState().addEvent({
    minerId: miner.id,
    minerName: miner.name,
    type: 'hashrate_drop',
    title: `${miner.name} hashrate dropped ${pct}%`,
  });
}

async function sendPoolLostAlert(miner: Miner, pool: string) {
  await send('Pool Disconnected', `${miner.name} lost connection to ${pool}`, {
    minerId: miner.id,
    type: 'pool_lost',
  });
  useAlertHistoryStore.getState().addEvent({
    minerId: miner.id,
    minerName: miner.name,
    type: 'pool_lost',
    title: `${miner.name} lost pool ${pool}`,
  });
}

async function sendLongUptimeAlert(miner: Miner, seconds: number) {
  const hrs = Math.round(seconds / 3600);
  await send('Long Uptime', `${miner.name} running for ${hrs}h`, {
    minerId: miner.id,
    type: 'long_uptime',
  });
  useAlertHistoryStore.getState().addEvent({
    minerId: miner.id,
    minerName: miner.name,
    type: 'long_uptime',
    title: `${miner.name} running ${hrs}h`,
  });
}

async function sendShareRejectionAlert(miner: Miner, rejectionRate: number) {
  const pct = Math.round(rejectionRate);
  await send('Share Rejection', `${miner.name} rejecting ${pct}% of shares`, {
    minerId: miner.id,
    type: 'share_rejection',
  });
  useAlertHistoryStore.getState().addEvent({
    minerId: miner.id,
    minerName: miner.name,
    type: 'share_rejection',
    title: `${miner.name} rejecting ${pct}% shares`,
  });
}

async function isQuietHours(): Promise<boolean> {
  const quietStart = await DB.getSetting('quiet_hours_start');
  const quietEnd = await DB.getSetting('quiet_hours_end');
  const quietEnabled = await DB.getSetting('quiet_hours_enabled');
  if (quietEnabled === 'false' || !quietStart || !quietEnd) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = quietStart.split(':').map(Number);
  const [endH, endM] = quietEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}
