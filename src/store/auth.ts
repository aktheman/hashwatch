import { create } from 'zustand';
import * as DB from '../db/database';
import * as API from '../api/client';

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

export const useAuthStore = create<AuthState>((set, get) => ({
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
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    set({ token: null, userId: null, email: null, synced: false });
    DB.setSetting('auth_token', '');
    DB.setSetting('auth_email', '');
  },

  restoreSession: async () => {
    const token = await DB.getSetting('auth_token');
    const email = await DB.getSetting('auth_email');
    if (token) {
      set({ token, email, userId: null });
    }
  },
}));
