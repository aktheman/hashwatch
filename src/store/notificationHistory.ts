import { create } from 'zustand';
import * as DB from '../db/database';
import { fetchNotificationHistory, syncNotificationHistory } from '../api/client';

export interface PushNotificationEntry {
  id: string;
  token: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sentAt: number;
  status: 'sent' | 'failed';
}

interface NotificationHistoryState {
  history: PushNotificationEntry[];
  syncing: boolean;
  addEntry: (entry: Omit<PushNotificationEntry, 'id' | 'sentAt'>) => void;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  syncFromBackend: () => Promise<void>;
  syncToBackend: () => Promise<void>;
}

const STORAGE_KEY = 'hashwatch_notification_history';

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useNotificationHistoryStore = create<NotificationHistoryState>((set, get) => ({
  history: [],
  syncing: false,

  loadHistory: async () => {
    try {
      const stored = await DB.getSetting(STORAGE_KEY);
      if (stored) {
        const parsed: PushNotificationEntry[] = JSON.parse(stored);
        set({ history: parsed });
      }
    } catch {
      // best-effort
    }
  },

  addEntry: (entry) => {
    const newEntry: PushNotificationEntry = {
      ...entry,
      id: generateId(),
      sentAt: Date.now(),
    };
    set((s) => {
      const history = [newEntry, ...s.history].slice(0, 200);
      DB.setSetting(STORAGE_KEY, JSON.stringify(history)).catch(() => {});
      return { history };
    });
  },

  clearHistory: async () => {
    await DB.setSetting(STORAGE_KEY, JSON.stringify([]));
    set({ history: [] });
  },

  syncFromBackend: async () => {
    set({ syncing: true });
    try {
      const remote = await fetchNotificationHistory();
      if (remote.length === 0) return;
      const local = get().history;
      const localKeys = new Set(local.map((e) => `${e.title}:${e.body}:${e.sentAt}`));
      const merged = [...local];
      for (const r of remote) {
        const key = `${r.title}:${r.body}:${r.sentat}`;
        if (!localKeys.has(key)) {
          merged.push({
            id: generateId(),
            token: r.token,
            title: r.title,
            body: r.body,
            data: {},
            sentAt: r.sentat,
            status: r.status as 'sent' | 'failed',
          });
        }
      }
      merged.sort((a, b) => b.sentAt - a.sentAt);
      set({ history: merged });
      DB.setSetting(STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
    } catch {
      // best-effort
    } finally {
      set({ syncing: false });
    }
  },

  syncToBackend: async () => {
    const entries = get().history.map((e) => ({
      token: e.token,
      title: e.title,
      body: e.body,
      sentAt: e.sentAt,
      status: e.status,
    }));
    if (entries.length === 0) return;
    try {
      await syncNotificationHistory(entries);
    } catch {
      // best-effort
    }
  },
}));
