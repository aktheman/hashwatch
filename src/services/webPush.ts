import axios from 'axios';
import { BASE_URL } from '../api/client';
import { getAuthToken } from '../store/authToken';

const VAPID_PUBLIC_KEY = 'BPtGk6XQ5qNhYfJkVmzQwL8R3s7a2D4cF9eG0hIjKlMnOpQrStUvWxYz';

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

export async function registerWebPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    const registration = await navigator.serviceWorker.ready;
    const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key.buffer as ArrayBuffer,
    });

    const token = getAuthToken();
    if (!token) return false;

    await axios.post(
      `${BASE_URL}/api/push/web-subscribe`,
      { subscription: JSON.parse(JSON.stringify(sub)) },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeWebPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;

    await subscription.unsubscribe();

    const token = getAuthToken();
    if (!token) return false;

    await axios.post(
      `${BASE_URL}/api/push/web-unsubscribe`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return true;
  } catch {
    return false;
  }
}
