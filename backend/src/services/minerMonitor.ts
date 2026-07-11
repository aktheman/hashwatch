import { query } from '../db';
import {
  sendMinerOfflineNotification,
  sendMinerOnlineNotification,
  sendMinerHotNotification,
  sendHashrateDropNotification,
  sendPoolChangeNotification,
  sendLongUptimeNotification,
  sendShareRejectionNotification,
} from './pushNotifications';
import { setPoolStatus } from './minerState';

interface MinerState {
  isOnline: boolean;
  temperature: number;
  hashRate: number;
  pool: string | null;
  uptimeSeconds?: number;
  sharesAccepted?: number;
  sharesRejected?: number;
}

interface AlertRuleRow {
  enabled: boolean;
  tempthreshold: number;
  hashratedroppercent: number;
  offlinereminderminutes: number;
  uptimethresholdhours: number;
  sharerejectionpercent: number;
}

const minerStates = new Map<string, MinerState>();
const notificationCooldown = new Map<string, number>();
const alertRuleCache = new Map<string, AlertRuleRow>();
const COOLDOWN_MS = 15 * 60 * 1000;
const RULE_CACHE_TTL = 300_000;

let lastRuleFetch = 0;

let notifPrefsCache = new Map<string, Record<string, boolean>>();
let notifPrefsCacheTime = 0;

async function getNotificationPrefs(
  userId: string,
  minerId: string,
): Promise<Record<string, boolean>> {
  const cacheKey = `${userId}:${minerId}`;
  if (Date.now() - notifPrefsCacheTime < RULE_CACHE_TTL) {
    const cached = notifPrefsCache.get(cacheKey);
    if (cached) return cached;
  }
  try {
    const result = await query(
      'SELECT alertType, enabled FROM notification_prefs WHERE userId = $1 AND minerId = $2',
      [userId, minerId],
    );
    const prefs: Record<string, boolean> = {};
    for (const row of result.rows) {
      prefs[row.alerttype] = row.enabled;
    }
    notifPrefsCache.set(cacheKey, prefs);
    notifPrefsCacheTime = Date.now();
    return prefs;
  } catch {
    return {};
  }
}

async function getAlertRules(minerId: string, userId: string): Promise<AlertRuleRow> {
  const cacheKey = `${userId}:${minerId}`;
  if (Date.now() - lastRuleFetch < RULE_CACHE_TTL) {
    const cached = alertRuleCache.get(cacheKey);
    if (cached) return cached;
  }
  try {
    const result = await query(
      'SELECT enabled, tempThreshold, hashrateDropPercent, offlineReminderMinutes, uptimeThresholdHours FROM miner_alert_rules WHERE userId = $1 AND minerId = $2',
      [userId, minerId],
    );
    if (result.rows.length > 0) {
      const row = result.rows[0] as AlertRuleRow;
      const rule: AlertRuleRow = {
        enabled: row.enabled,
        tempthreshold: row.tempthreshold,
        hashratedroppercent: row.hashratedroppercent,
        offlinereminderminutes: row.offlinereminderminutes,
        uptimethresholdhours: row.uptimethresholdhours,
        sharerejectionpercent: row.sharerejectionpercent,
      };
      alertRuleCache.set(cacheKey, rule);
      return rule;
    }
  } catch {
    // DB unavailable — fall through to defaults
  }
  return {
    enabled: true,
    tempthreshold: 70,
    hashratedroppercent: 50,
    offlinereminderminutes: 5,
    uptimethresholdhours: 24,
    sharerejectionpercent: 10,
  };
}

function canNotify(key: string): boolean {
  const last = notificationCooldown.get(key);
  if (last && Date.now() - last < COOLDOWN_MS) return false;
  notificationCooldown.set(key, Date.now());
  return true;
}

export async function checkMinerStatus(
  userId: string,
  minerId: string,
  minerName: string,
  ip: string,
  isOnline: boolean,
  temperature: number,
  hashRate: number = 0,
  pool: string | null = null,
  uptimeSeconds: number = 0,
  sharesAccepted: number = 0,
  sharesRejected: number = 0,
): Promise<void> {
  const key = `${userId}:${minerId}`;
  const prev = minerStates.get(key) as MinerState | undefined;

  if (!prev) {
    minerStates.set(key, {
      isOnline,
      temperature,
      hashRate,
      pool,
      uptimeSeconds,
      sharesAccepted,
      sharesRejected,
    });
    setPoolStatus(minerId, { miner: minerName, pool, hashrate: hashRate, lastSeen: Date.now() });
    return;
  }

  const rules = await getAlertRules(minerId, userId);

  if (!rules.enabled) {
    minerStates.set(key, {
      isOnline,
      temperature,
      hashRate,
      pool,
      uptimeSeconds,
      sharesAccepted,
      sharesRejected,
    });
    setPoolStatus(minerId, { miner: minerName, pool, hashrate: hashRate, lastSeen: Date.now() });
    return;
  }

  const prefs = await getNotificationPrefs(userId, minerId);

  if (prev.isOnline && !isOnline && canNotify(`${key}:offline`) && prefs.offline !== false) {
    sendMinerOfflineNotification(userId, minerName, ip, minerId);
  } else if (!prev.isOnline && isOnline && canNotify(`${key}:online`) && prefs.online !== false) {
    sendMinerOnlineNotification(userId, minerName, ip, minerId);
  }

  const tempThreshold = rules.tempthreshold;
  if (
    temperature > tempThreshold &&
    prev.temperature <= tempThreshold &&
    canNotify(`${key}:hot`) &&
    prefs.hot !== false
  ) {
    sendMinerHotNotification(userId, minerName, ip, temperature, minerId);
  }

  const prevHr = prev.hashRate;
  const dropRatio = 100 / (100 - rules.hashratedroppercent);
  if (
    prevHr > 0 &&
    hashRate > 0 &&
    prevHr / hashRate > dropRatio &&
    canNotify(`${key}:hashrate_drop`) &&
    prefs.hashrate_drop !== false
  ) {
    const pct = Math.round((1 - hashRate / prevHr) * 100);
    sendHashrateDropNotification(userId, minerName, minerId, pct);
  }

  if (
    prev.pool &&
    pool &&
    prev.pool !== pool &&
    canNotify(`${key}:pool_change`) &&
    prefs.pool_lost !== false
  ) {
    const oldPool = prev.pool || 'unknown';
    const newPool = pool || 'unknown';
    sendPoolChangeNotification(userId, minerName, minerId, oldPool, newPool);
  }

  if (
    isOnline &&
    prev.isOnline &&
    rules.uptimethresholdhours > 0 &&
    canNotify(`${key}:long_uptime`) &&
    prefs.long_uptime !== false
  ) {
    const uptimeSec = prev.uptimeSeconds ?? 0;
    if (uptimeSec > 0 && uptimeSec >= rules.uptimethresholdhours * 3600) {
      sendLongUptimeNotification(userId, minerName, minerId, uptimeSec);
    }
  }

  const deltaAccepted = sharesAccepted - (prev.sharesAccepted ?? 0);
  const deltaRejected = sharesRejected - (prev.sharesRejected ?? 0);
  if (deltaAccepted + deltaRejected > 0) {
    const rejectionRate = (deltaRejected / (deltaAccepted + deltaRejected)) * 100;
    if (
      rejectionRate >= rules.sharerejectionpercent &&
      canNotify(`${key}:share_rejection`) &&
      prefs.share_rejection !== false
    ) {
      sendShareRejectionNotification(userId, minerName, minerId, Math.round(rejectionRate));
    }
  }

  minerStates.set(key, {
    isOnline,
    temperature,
    hashRate,
    pool,
    uptimeSeconds,
    sharesAccepted,
    sharesRejected,
  });
  setPoolStatus(minerId, { miner: minerName, pool, hashrate: hashRate, lastSeen: Date.now() });
}
