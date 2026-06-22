import { create } from 'zustand';
import * as DB from '../db/database';
import * as API from '../api/client';
import { configureClient } from '../api/client';
import { connectWebSocket, disconnectWebSocket } from '../services/websocket';
import { registerPushToken, unregisterPushToken } from '../services/pushRegistration';
import { setTokenGetter, notifyAuthLogin } from './authToken';

const SYNCED_SETTINGS = ['theme_mode', 'power_cost', 'auto_scan'];

interface QueuedSetting {
  key: string;
  value: string;
  timestamp: number;
}

let _settingsQueue: QueuedSetting[] = [];

async function loadQueue(): Promise<void> {
  try {
    const stored = await DB.getSetting('settings_queue');
    if (stored) {
      _settingsQueue = JSON.parse(stored);
    }
  } catch {
    _settingsQueue = [];
  }
}

async function saveQueue(): Promise<void> {
  try {
    await DB.setSetting('settings_queue', JSON.stringify(_settingsQueue));
  } catch {
    // best-effort
  }
}

export async function queueSetting(key: string, value: string): Promise<void> {
  _settingsQueue.push({ key, value, timestamp: Date.now() });
  await saveQueue();
}

async function processQueue(): Promise<void> {
  if (_settingsQueue.length === 0) return;

  const toProcess = [..._settingsQueue];
  _settingsQueue = [];
  await saveQueue();

  for (const item of toProcess) {
    try {
      await API.putSetting(item.key, item.value);
    } catch {
      // Re-queue on failure
      _settingsQueue.push(item);
    }
  }

  if (_settingsQueue.length > 0) {
    await saveQueue();
  }
}

async function syncSettingsFromBackend() {
  try {
    const remote = await API.getSettings();
    if (remote && typeof remote === 'object') {
      for (const [key, value] of Object.entries(remote)) {
        if (typeof value === 'string') {
          await DB.setSetting(key, value);
        }
      }
    }
  } catch {
    // best-effort
  }
}

async function pushSettingsToBackend() {
  await processQueue();
  for (const key of SYNCED_SETTINGS) {
    const value = await DB.getSetting(key);
    if (value) {
      try {
        await API.putSetting(key, value);
      } catch {
        // best-effort per setting
      }
    }
  }
}

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  syncing: boolean;
  synced: boolean;
  lastSyncTimestamp: number | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  email: null,
  syncing: false,
  synced: false,
  lastSyncTimestamp: null,

  login: async (email: string, password: string) => {
    try {
      const res = await API.login(email, password);
      set({ token: res.token, userId: res.userId, email });
      await DB.setSetting('auth_token', res.token);
      await DB.setSetting('auth_email', email);
      connectWebSocket(res.token);
      registerPushToken(res.token);
      notifyAuthLogin();
      syncSettingsFromBackend();
      return true;
    } catch {
      return false;
    }
  },

  register: async (email: string, password: string) => {
    try {
      const res = await API.register(email, password);
      set({ token: res.token, userId: res.userId, email });
      await DB.setSetting('auth_token', res.token);
      await DB.setSetting('auth_email', email);
      connectWebSocket(res.token);
      registerPushToken(res.token);
      notifyAuthLogin();
      syncSettingsFromBackend();
      return true;
    } catch {
      return false;
    }
  },

  logout: async () => {
    const token = useAuthStore.getState().token;
    unregisterPushToken(token);
    disconnectWebSocket();
    set({ token: null, userId: null, email: null, synced: false });
    await DB.setSetting('auth_token', '');
    await DB.setSetting('auth_email', '');
  },

  restoreSession: async () => {
    await loadQueue();
    const token = await DB.getSetting('auth_token');
    const email = await DB.getSetting('auth_email');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1])) as { userId?: string; exp?: number };
        const userId = payload.userId || null;
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          await DB.setSetting('auth_token', '');
          set({ token: '', email: null, userId: null });
          return;
        }
        set({ token, email, userId });
      } catch {
        await DB.setSetting('auth_token', '');
        set({ token: '', email: null, userId: null });
      }
      connectWebSocket(token);
      registerPushToken(token);
      syncSettingsFromBackend();
    }
  },

  syncNow: async () => {
    set({ syncing: true });
    await pushSettingsToBackend();
    await syncSettingsFromBackend();
    set({ syncing: false, synced: true, lastSyncTimestamp: Date.now() });
  },
}));

configureClient({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => {
    useAuthStore.getState().logout();
  },
});

setTokenGetter(() => useAuthStore.getState().token);

import('../services/networkStatus')
  .then(({ onNetworkReconnect }) => {
    onNetworkReconnect(() => {
      const { token, syncNow } = useAuthStore.getState();
      if (token) {
        syncNow();
      }
    });
  })
  .catch(() => {
    // networkStatus not available (e.g. web)
  });
