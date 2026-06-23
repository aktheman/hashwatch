import { query } from '../db';

async function getPushTokensForUser(userId: string): Promise<string[]> {
  const result = await query('SELECT token FROM push_tokens WHERE userId = $1', [userId]);
  return result.rows.map((r: any) => r.token);
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  const tokens = await getPushTokensForUser(userId);
  if (tokens.length === 0) return;

  const ExpoModule: any = await import('expo-server-sdk');
  const expo = new ExpoModule.Expo();

  const messages = tokens
    .filter((token: string) => ExpoModule.Expo.isExpoPushToken(token))
    .map((token: string) => ({
      to: token,
      sound: 'default' as const,
      title,
      body,
      data: data || {},
    }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch {
      // silently fail individual push sending
    }
  }
}

export async function sendMinerOfflineNotification(
  userId: string,
  minerName: string,
  ip: string,
  minerId: string,
): Promise<void> {
  await sendPushNotification(userId, 'Miner Offline', `${minerName} (${ip}) has gone offline`, {
    minerId,
    type: 'offline',
  });
}

export async function sendMinerOnlineNotification(
  userId: string,
  minerName: string,
  ip: string,
  minerId: string,
): Promise<void> {
  await sendPushNotification(userId, 'Miner Reconnected', `${minerName} (${ip}) is back online`, {
    minerId,
    type: 'online',
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
    'High Temperature',
    `${minerName} is ${temperature.toFixed(0)}°C — check cooling`,
    { minerId, type: 'hot' },
  );
}

export async function sendHashrateDropNotification(
  userId: string,
  minerName: string,
  minerId: string,
  pct: number,
): Promise<void> {
  await sendPushNotification(userId, 'Hashrate Drop', `${minerName} hashrate dropped ${pct}%`, {
    minerId,
    type: 'hashrate_drop',
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
  await sendPushNotification(userId, 'Pool Changed', `${minerName} moved from ${from} to ${to}`, {
    minerId,
    type: 'pool_change',
    oldPool: from,
    newPool: to,
  });
}
