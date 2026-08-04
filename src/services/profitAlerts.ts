import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as DB from '../db/database';
import { getBitcoinPrice } from './bitcoinPrice';
import { useAlertHistoryStore } from '../store/alertHistory';

export interface ProfitAlertSettings {
  enabled: boolean;
  dropPercent: number;
}

const DEFAULT_SETTINGS: ProfitAlertSettings = { enabled: false, dropPercent: 5 };
const ENABLED_KEY = 'profit_alert_enabled';
const DROP_KEY = 'profit_alert_drop_percent';
const BASELINE_KEY = 'profit_alert_baseline';

export async function getProfitAlertSettings(): Promise<ProfitAlertSettings> {
  const enabled = await DB.getSetting(ENABLED_KEY);
  const dropRaw = await DB.getSetting(DROP_KEY);
  const drop = dropRaw ? Number(dropRaw) : NaN;
  return {
    enabled: enabled === 'true',
    dropPercent: Number.isFinite(drop) && drop > 0 ? drop : DEFAULT_SETTINGS.dropPercent,
  };
}

export async function setProfitAlertSettings(settings: ProfitAlertSettings): Promise<void> {
  await DB.setSetting(ENABLED_KEY, settings.enabled ? 'true' : 'false');
  await DB.setSetting(DROP_KEY, String(settings.dropPercent));
}

async function notifyPriceDrop(price: number, baseline: number, dropPct: number): Promise<void> {
  const body = `BTC price dropped ${dropPct.toFixed(1)}% to $${Math.round(price).toLocaleString('en-US')} — below your ${baseline.toLocaleString('en-US')} baseline`;
  if (Platform.OS !== 'web') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Profitability Warning',
        body,
        data: { type: 'profit_price_drop', price, baseline },
      },
      trigger: null,
    });
  }
  useAlertHistoryStore.getState().addEvent({
    minerId: 'fleet',
    minerName: 'Fleet',
    type: 'price_drop',
    title: `BTC price dropped ${dropPct.toFixed(1)}%`,
  });
}

export async function checkProfitAlert(): Promise<void> {
  const settings = await getProfitAlertSettings();
  if (!settings.enabled) return;

  const notificationsEnabled = await DB.getSetting('notifications_enabled');
  if (notificationsEnabled === 'false') return;

  let price: number;
  try {
    price = await getBitcoinPrice();
  } catch {
    return;
  }
  if (!(price > 0)) return;

  const baselineRaw = await DB.getSetting(BASELINE_KEY);
  const baseline = baselineRaw ? Number(baselineRaw) : NaN;

  if (!(baseline > 0)) {
    await DB.setSetting(BASELINE_KEY, String(price));
    return;
  }

  if (price > baseline) {
    await DB.setSetting(BASELINE_KEY, String(price));
    return;
  }

  const dropPct = ((baseline - price) / baseline) * 100;
  if (dropPct >= settings.dropPercent) {
    await DB.setSetting(BASELINE_KEY, String(price));
    await notifyPriceDrop(price, baseline, dropPct);
  }
}
