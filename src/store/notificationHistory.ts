import { create } from 'zustand';
import * as DB from '../db/database';

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
  addEntry: (entry: Omit<PushNotificationEntry, 'id' | 'sentAt'>) => void;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

const STORAGE_KEY = 'hashwatch_notification_history';

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useNotificationHistoryStore = create<NotificationHistoryState>((set) => ({
  history: [],

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
}));
