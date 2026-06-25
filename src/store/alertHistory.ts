import { create } from 'zustand';
import * as DB from '../db/database';

export interface AlertEvent {
  id: string;
  minerId: string;
  minerName: string;
  type: string;
  title: string;
  timestamp: number;
  read: boolean;
}

interface AlertHistoryState {
  events: AlertEvent[];
  addEvent: (event: Omit<AlertEvent, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  loadEvents: () => Promise<void>;
}

const STORAGE_KEY = 'hashwatch_alert_history';

function generateId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useAlertHistoryStore = create<AlertHistoryState>((set) => ({
  events: [],

  loadEvents: async () => {
    try {
      const stored = await DB.getSetting(STORAGE_KEY);
      if (stored) {
        const parsed: AlertEvent[] = JSON.parse(stored);
        set({ events: parsed });
      }
    } catch {
      // best-effort
    }
  },

  addEvent: (event) => {
    const newEvent: AlertEvent = {
      ...event,
      id: generateId(),
      timestamp: Date.now(),
      read: false,
    };
    set((s) => {
      const events = [newEvent, ...s.events];
      DB.setSetting(STORAGE_KEY, JSON.stringify(events)).catch(() => {});
      return { events };
    });
  },

  markRead: (id) => {
    set((s) => {
      const events = s.events.map((e) => (e.id === id ? { ...e, read: true } : e));
      DB.setSetting(STORAGE_KEY, JSON.stringify(events)).catch(() => {});
      return { events };
    });
  },

  markAllRead: () => {
    set((s) => {
      const events = s.events.map((e) => ({ ...e, read: true }));
      DB.setSetting(STORAGE_KEY, JSON.stringify(events)).catch(() => {});
      return { events };
    });
  },

  clearAll: () => {
    set({ events: [] });
    DB.setSetting(STORAGE_KEY, JSON.stringify([])).catch(() => {});
  },
}));
