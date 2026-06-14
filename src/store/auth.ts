import { create } from 'zustand';
import * as DB from '../db/database';
import * as API from '../api/client';
import { configureClient } from '../api/client';
import { connectWebSocket, disconnectWebSocket } from '../services/websocket';
import { registerPushToken } from '../services/pushRegistration';
import { setTokenGetter, notifyAuthLogin } from './authToken';

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

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  syncing: boolean;
  synced: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  email: null,
  syncing: false,
  synced: false,

  login: async (email: string, password: string) => {
    try {
      const res = await API.login(email, password);
      set({ token: res.token, userId: res.userId, email });
      await DB.setSetting('auth_token', res.token);
      await DB.setSetting('auth_email', email);
      connectWebSocket(res.token);
      registerPushToken();
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
      registerPushToken();
      notifyAuthLogin();
      syncSettingsFromBackend();
      return true;
    } catch {
      return false;
    }
  },

  logout: async () => {
    disconnectWebSocket();
    set({ token: null, userId: null, email: null, synced: false });
    await DB.setSetting('auth_token', '');
    await DB.setSetting('auth_email', '');
  },

  restoreSession: async () => {
    const token = await DB.getSetting('auth_token');
    const email = await DB.getSetting('auth_email');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1])) as { userId: string };
        set({ token, email, userId: payload.userId || null });
      } catch {
        set({ token, email, userId: null });
      }
      connectWebSocket(token);
      registerPushToken();
      syncSettingsFromBackend();
    }
  },
}));

configureClient({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => {
    useAuthStore.getState().logout();
  },
});

setTokenGetter(() => useAuthStore.getState().token);
