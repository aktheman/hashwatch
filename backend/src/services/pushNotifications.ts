import { query } from '../db';
import { sendWebhook } from './webhook';

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

let webPushAvailable = false;
let webPushModule: typeof import('web-push') | null = null;

async function getWebPush() {
  if (webPushModule) return webPushModule;
  try {
    webPushModule = await import('web-push');
    const pubKey = process.env.VAPID_PUBLIC_KEY || '';
    const privKey = process.env.VAPID_PRIVATE_KEY || '';
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@hashwatch.app';
    if (pubKey && privKey) {
      webPushModule.setVapidDetails(subject, pubKey, privKey);
      webPushAvailable = true;
    }
    return webPushModule;
  } catch {
    return null;
  }
}

function filterByType(rows: { token: string; alert_types?: string; token_type?: string }[], type: string) {
  return rows.filter((row) => {
    if (!row.alert_types) return true;
    const types = row.alert_types.split(',');
    return types.includes(type);
  });
}

async function sendExpoPush(
  tokens: { token: string }[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (tokens.length === 0) return;
  const { Expo } = await import('expo-server-sdk');
  const expo = new Expo();
  const messages = tokens
    .filter((row) => Expo.isExpoPushToken(row.token))
    .map((row) => ({
      to: row.token,
      sound: 'default' as const,
      title,
      body,
      data: data || {},
    }));
  if (messages.length === 0) return;
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.error('Expo push send failed:', error);
    }
  }
}

async function sendWebPushToTokens(
  tokens: { token: string }[],
  title: string,
  body: string,
  options: {
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
    actions?: NotificationAction[];
  } = {},
): Promise<void> {
  if (tokens.length === 0) return;
  const wp = await getWebPush();
  if (!wp || !webPushAvailable) return;

  const payload = JSON.stringify({
    title,
    body,
    icon: options.icon || '/favicon.ico',
    badge: options.badge || '/favicon.ico',
    data: options.data || {},
    actions: options.actions || [],
  });

  for (const row of tokens) {
    try {
      const subscription = JSON.parse(row.token);
      await wp.sendNotification(subscription, payload, { TTL: 86400 });
    } catch (error) {
      console.error('Web push send failed:', error);
      if ((error as { statusCode?: number }).statusCode === 410) {
        await query('DELETE FROM push_tokens WHERE token = $1', [row.token]).catch(() => {});
      }
    }
  }
}

export async function sendPushNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
): Promise<void> {
  const result = await query(
    'SELECT token, alert_types, token_type FROM push_tokens WHERE userId = $1',
    [userId],
  );
  if (result.rows.length === 0) return;

  const filtered = filterByType(result.rows, type);
  const expoTokens = filtered.filter((r) => (r.token_type || 'expo') === 'expo');
  const webTokens = filtered.filter((r) => r.token_type === 'web');

  await sendExpoPush(expoTokens, title, body, { type });
  await sendWebPushToTokens(webTokens, title, body, { data: { type } });
}

export async function sendRichNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  options: {
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
    actions?: NotificationAction[];
  } = {},
): Promise<void> {
  const result = await query(
    'SELECT token, alert_types, token_type FROM push_tokens WHERE userId = $1',
    [userId],
  );
  if (result.rows.length === 0) return;

  const filtered = filterByType(result.rows, type);
  const expoTokens = filtered.filter((r) => (r.token_type || 'expo') === 'expo');
  const webTokens = filtered.filter((r) => r.token_type === 'web');

  await sendExpoPush(expoTokens, title, body, options.data || { type });
  await sendWebPushToTokens(webTokens, title, body, options);
}

export async function sendMinerOfflineNotification(
  userId: string,
  minerName: string,
  ip: string,
  minerId: string,
): Promise<void> {
  await sendRichNotification(userId, 'offline', 'Miner Offline', `${minerName} (${ip}) has gone offline`, {
    icon: '/icons/miner-offline.png',
    badge: '/icons/badge.png',
    data: { minerId, ip, url: `/miner/${minerId}` },
    actions: [
      { action: 'view_miner', title: 'View Miner' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
  await sendWebhook(userId, {
    event: 'offline',
    minerId,
    minerName,
    title: 'Miner Offline',
    body: `${minerName} (${ip}) has gone offline`,
    timestamp: Date.now(),
  });
}

export async function sendMinerOnlineNotification(
  userId: string,
  minerName: string,
  ip: string,
  minerId: string,
): Promise<void> {
  await sendPushNotification(userId, 'online', 'Miner Reconnected', `${minerName} (${ip}) is back online`);
  await sendWebhook(userId, {
    event: 'online',
    minerId,
    minerName,
    title: 'Miner Reconnected',
    body: `${minerName} (${ip}) is back online`,
    timestamp: Date.now(),
  });
}

export async function sendMinerHotNotification(
  userId: string,
  minerName: string,
  ip: string,
  temperature: number,
  minerId: string,
): Promise<void> {
  await sendRichNotification(userId, 'hot', 'High Temperature', `${minerName} is ${temperature.toFixed(0)}°C — check cooling`, {
    icon: '/icons/temperature.png',
    data: { minerId, temperature, url: `/miner/${minerId}` },
    actions: [
      { action: 'view_miner', title: 'View Miner' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
  await sendWebhook(userId, {
    event: 'hot',
    minerId,
    minerName,
    title: 'High Temperature',
    body: `${minerName} is ${temperature.toFixed(0)}°C — check cooling`,
    timestamp: Date.now(),
  });
}

export async function sendHashrateDropNotification(
  userId: string,
  minerName: string,
  minerId: string,
  pct: number,
): Promise<void> {
  await sendPushNotification(userId, 'hashrate_drop', 'Hashrate Drop', `${minerName} hashrate dropped ${pct}%`);
  await sendWebhook(userId, {
    event: 'hashrate_drop',
    minerId,
    minerName,
    title: 'Hashrate Drop',
    body: `${minerName} hashrate dropped ${pct}%`,
    timestamp: Date.now(),
  });
}

export async function sendLongUptimeNotification(
  userId: string,
  minerName: string,
  minerId: string,
  uptimeSeconds: number,
): Promise<void> {
  const hours = Math.round(uptimeSeconds / 3600);
  await sendPushNotification(userId, 'long_uptime', 'Long Uptime', `${minerName} has been running for ${hours}h`);
  await sendWebhook(userId, {
    event: 'long_uptime',
    minerId,
    minerName,
    title: 'Long Uptime',
    body: `${minerName} has been running for ${hours}h`,
    timestamp: Date.now(),
  });
}

export async function sendPoolChangeNotification(
  userId: string,
  minerName: string,
  minerId: string,
  oldPool: string | null,
  newPool: string | null,
): Promise<void> {
  const from = oldPool || 'unknown';
  const to = newPool || 'unknown';
  await sendPushNotification(userId, 'pool_lost', 'Pool Changed', `${minerName} moved from ${from} to ${to}`);
  await sendWebhook(userId, {
    event: 'pool_lost',
    minerId,
    minerName,
    title: 'Pool Changed',
    body: `${minerName} moved from ${from} to ${to}`,
    timestamp: Date.now(),
  });
}

export async function sendShareRejectionNotification(
  userId: string,
  minerName: string,
  minerId: string,
  rejectionRate: number,
): Promise<void> {
  await sendRichNotification(userId, 'share_rejection', 'Share Rejection', `${minerName} rejecting ${rejectionRate}% of shares`, {
    icon: '/icons/share-rejection.png',
    badge: '/icons/badge.png',
    data: { minerId, rejectionRate, url: `/miner/${minerId}` },
    actions: [
      { action: 'view_miner', title: 'View Miner' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
  await sendWebhook(userId, {
    event: 'share_rejection',
    minerId,
    minerName,
    title: 'Share Rejection',
    body: `${minerName} rejecting ${rejectionRate}% of shares`,
    timestamp: Date.now(),
  });
}
