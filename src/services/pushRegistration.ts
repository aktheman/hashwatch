import { Platform } from 'react-native';
import { getExpoPushTokenAsync } from 'expo-notifications';
import { BASE_URL } from '../api/client';
import { requestNotificationPermissions } from './notifications';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushToken(authToken: string | null) {
  if (Platform.OS === 'web') {
    await registerWebPush(authToken);
    return;
  }
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;

    const { data: token } = await getExpoPushTokenAsync();
    if (!authToken || !token) return;
    await fetch(`${BASE_URL}/api/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token,
        alertTypes: ['offline', 'online', 'hot', 'hashrate_drop', 'pool_lost', 'long_uptime'],
      }),
    });
  } catch {
    // silently fail
  }
}

export async function unregisterPushToken(authToken: string | null) {
  if (Platform.OS === 'web') return;
  try {
    const { data: token } = await getExpoPushTokenAsync();
    if (!authToken || !token) return;
    await fetch(`${BASE_URL}/api/push/unregister`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch {
    // silently fail
  }
}

async function registerWebPush(authToken: string | null) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      subscription.unsubscribe();
    }

    const publicVapidKey = (window as unknown as Record<string, string>).VAPID_PUBLIC_KEY
      || 'BEl62iUYgUivx0kvS7I1sE1q5n4WLaY6lY7lFJ6n4WLaY6lY7lFJ6n4WLaY6lY7lFJ6n4WLaY6lY7lFJ6n4WLA';

    const keyBuffer = urlBase64ToUint8Array(publicVapidKey).buffer as ArrayBuffer;
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBuffer,
    });

    if (!authToken || !subscription) return;
    await fetch(`${BASE_URL}/api/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token: JSON.stringify(subscription),
        alertTypes: ['offline', 'online', 'hot', 'hashrate_drop', 'pool_lost', 'long_uptime'],
      }),
    });
  } catch {
    // silently fail
  }
}
