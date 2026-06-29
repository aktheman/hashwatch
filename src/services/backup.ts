import { Platform } from 'react-native';
import { Miner, MinerSnapshot, Wallet } from '../types';
import { AlertEvent } from '../store/alertHistory';
import { PushNotificationEntry } from '../store/notificationHistory';
import * as DB from '../db/database';

export interface BackupData {
  version: 1;
  exportedAt: string;
  miners: Miner[];
  snapshots: MinerSnapshot[];
  wallets: Wallet[];
  settings: Record<string, string>;
  alertHistory: AlertEvent[];
  notificationHistory: PushNotificationEntry[];
}

const ALERT_HISTORY_KEY = 'hashwatch_alert_history';
const NOTIFICATION_HISTORY_KEY = 'hashwatch_notification_history';

function triggerDownload(content: string, filename: string, mime: string): void {
  if (window.electronAPI?.isElectron) {
    window.electronAPI.showSaveDialog({ defaultPath: filename, content });
    return;
  }
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export async function exportBackup(): Promise<string> {
  const miners = await DB.loadMiners();
  const wallets = await DB.loadWallets();
  const allSnapshots: MinerSnapshot[] = [];
  for (const m of miners) {
    const snaps = await DB.getSnapshots(m.id, 100000);
    allSnapshots.push(...snaps);
  }
  allSnapshots.sort((a, b) => a.timestamp - b.timestamp);

  const settings: Record<string, string> = {};
  const settingKeys = [
    'power_cost',
    'auto_scan',
    'theme_mode',
    'onboarding_complete',
    'api_url',
    'language',
    'auto_dark_hour',
    'notifications_enabled',
    'dashboard_sections',
    'kiosk_mode',
  ];
  for (const key of settingKeys) {
    const val = await DB.getSetting(key);
    if (val !== null) settings[key] = val;
  }

  let alertHistory: AlertEvent[] = [];
  try {
    const raw = await DB.getSetting(ALERT_HISTORY_KEY);
    if (raw) alertHistory = JSON.parse(raw);
  } catch {}

  let notificationHistory: PushNotificationEntry[] = [];
  try {
    const raw = await DB.getSetting(NOTIFICATION_HISTORY_KEY);
    if (raw) notificationHistory = JSON.parse(raw);
  } catch {}

  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    miners,
    snapshots: allSnapshots,
    wallets,
    settings,
    alertHistory,
    notificationHistory,
  };

  const json = JSON.stringify(data, null, 2);
  const filename = `hashwatch_backup_${Date.now()}.json`;
  triggerDownload(json, filename, 'application/json');
  return json;
}

export interface ImportResult {
  success: boolean;
  errors?: string[];
}

export async function importBackup(json: string): Promise<ImportResult> {
  const errors: string[] = [];

  let data: BackupData;
  try {
    data = JSON.parse(json);
  } catch {
    return { success: false, errors: ['Invalid JSON format'] };
  }

  if (!data.version || data.version < 1) {
    return { success: false, errors: ['Unsupported backup format version'] };
  }
  if (!Array.isArray(data.miners)) {
    return { success: false, errors: ['Missing miners array in backup'] };
  }
  if (!Array.isArray(data.wallets)) {
    return { success: false, errors: ['Missing wallets array in backup'] };
  }
  if (!Array.isArray(data.snapshots)) {
    return { success: false, errors: ['Missing snapshots array in backup'] };
  }

  const seenMinerIds = new Set<string>();

  try {
    for (const m of data.miners) {
      await DB.saveMiner(m);
      seenMinerIds.add(m.id);
    }

    for (const snap of data.snapshots) {
      if (seenMinerIds.has(snap.minerId)) {
        await DB.saveSnapshot(snap);
      }
    }

    for (const w of data.wallets) {
      await DB.saveWallet(w);
    }

    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        await DB.setSetting(key, value);
      }
    }

    if (Array.isArray(data.alertHistory)) {
      await DB.setSetting(ALERT_HISTORY_KEY, JSON.stringify(data.alertHistory));
    }

    if (Array.isArray(data.notificationHistory)) {
      await DB.setSetting(NOTIFICATION_HISTORY_KEY, JSON.stringify(data.notificationHistory));
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : 'Unknown error during import');
    return { success: false, errors };
  }

  return { success: true, errors: errors.length > 0 ? errors : undefined };
}
