import { Platform } from 'react-native';
import { getExpoPushTokenAsync } from 'expo-notifications';
import { BASE_URL } from '../api/client';
import { useAuthStore } from '../store/auth';
import { requestNotificationPermissions } from './notifications';

export async function registerPushToken() {
  if (Platform.OS === 'web') return;
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;

    const { data: token } = await getExpoPushTokenAsync();
    const authToken = useAuthStore.getState().token;
    if (!authToken || !token) return;
    await fetch(`${BASE_URL}/api/push/register`, {
      method: 'POST',
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

export async function unregisterPushToken() {
  if (Platform.OS === 'web') return;
  try {
    const { data: token } = await getExpoPushTokenAsync();
    const authToken = useAuthStore.getState().token;
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
