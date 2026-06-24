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

  const ExpoModule: any = await import('expo-server-sdk');
  const expo = new ExpoModule.Expo();

  const messages = result.rows
    .filter((row: any) => {
      if (!row.alert_types) return true;
      const types = row.alert_types.split(',');
      return types.includes(type);
    })
    .filter((row: any) => ExpoModule.Expo.isExpoPushToken(row.token))
    .map((row: any) => ({
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
  await sendPushNotification(
    userId,
    'offline',
    'Miner Offline',
    `${minerName} (${ip}) has gone offline`,
  );
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
    'pool_change',
    'Pool Changed',
    `${minerName} moved from ${from} to ${to}`,
  );
}
