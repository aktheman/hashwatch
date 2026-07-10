import { query } from '../db';

export async function sendPushNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
): Promise<void> {
  const result = await query('SELECT token, alert_types FROM push_tokens WHERE userId = $1', [
    userId,
  ]);
  if (result.rows.length === 0) return;

  const { Expo } = await import('expo-server-sdk');
  const expo = new Expo();

  const messages = result.rows
    .filter((row: { alert_types?: string; token: string }) => {
      if (!row.alert_types) return true;
      const types = row.alert_types.split(',');
      return types.includes(type);
    })
    .filter((row: { token: string }) => Expo.isExpoPushToken(row.token))
    .map((row: { token: string }) => ({
      to: row.token,
      sound: 'default' as const,
      title,
      body,
      data: { type },
    }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.error('Push send failed:', error);
    }
  }
}

import { sendWebhook } from './webhook';

export async function sendMinerOfflineNotification(
  userId: string,
  minerName: string,
  ip: string,
  minerId: string,
): Promise<void> {
  await sendPushNotification(
    userId,
    'offline',
    'Miner Offline',
    `${minerName} (${ip}) has gone offline`,
  );
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
  await sendPushNotification(
    userId,
    'online',
    'Miner Reconnected',
    `${minerName} (${ip}) is back online`,
  );
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
  await sendPushNotification(
    userId,
    'hot',
    'High Temperature',
    `${minerName} is ${temperature.toFixed(0)}°C — check cooling`,
  );
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
  await sendPushNotification(
    userId,
    'hashrate_drop',
    'Hashrate Drop',
    `${minerName} hashrate dropped ${pct}%`,
  );
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
  await sendPushNotification(
    userId,
    'long_uptime',
    'Long Uptime',
    `${minerName} has been running for ${hours}h`,
  );
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
  await sendPushNotification(
    userId,
    'pool_lost',
    'Pool Changed',
    `${minerName} moved from ${from} to ${to}`,
  );
  await sendWebhook(userId, {
    event: 'pool_lost',
    minerId,
    minerName,
    title: 'Pool Changed',
    body: `${minerName} moved from ${from} to ${to}`,
    timestamp: Date.now(),
  });
}
