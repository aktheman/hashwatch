import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { query } from '../db';

const expo = new Expo();

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

  const messages: ExpoPushMessage[] = tokens
    .filter((token) => Expo.isExpoPushToken(token))
    .map((token) => ({
      to: token,
      sound: 'default',
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
