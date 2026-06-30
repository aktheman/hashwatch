import { create } from 'zustand';
import * as DB from '../db/database';
import { fetchAlertHistory, syncAlertsToBackend } from '../api/client';

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
  syncing: boolean;
  addEvent: (event: Omit<AlertEvent, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  loadEvents: () => Promise<void>;
  syncFromBackend: () => Promise<void>;
  syncToBackend: () => Promise<void>;
}

const STORAGE_KEY = 'hashwatch_alert_history';

function generateId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useAlertHistoryStore = create<AlertHistoryState>((set, get) => ({
  events: [],
  syncing: false,

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

  syncFromBackend: async () => {
    set({ syncing: true });
    try {
      const remote = await fetchAlertHistory();
      if (remote.length === 0) return;
      const local = get().events;
      const localKeys = new Set(local.map((e) => `${e.minerId}:${e.type}:${e.timestamp}`));
      const merged = [...local];
      for (const r of remote) {
        const key = `${r.minerid}:${r.eventtype}:${r.timestamp}`;
        if (!localKeys.has(key)) {
          merged.push({
            id: generateId(),
            minerId: r.minerid,
            minerName: '',
            type: r.eventtype,
            title: r.title,
            timestamp: r.timestamp,
            read: r.read,
          });
        }
      }
      merged.sort((a, b) => b.timestamp - a.timestamp);
      set({ events: merged });
      DB.setSetting(STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
    } catch {
      // best-effort
    } finally {
      set({ syncing: false });
    }
  },

  syncToBackend: async () => {
    const events = get()
      .events.filter((e) => !e.read)
      .map((e) => ({
        minerId: e.minerId,
        eventType: e.type,
        title: e.title,
        timestamp: e.timestamp,
        read: e.read,
      }));
    if (events.length === 0) return;
    try {
      await syncAlertsToBackend(events);
    } catch {
      // best-effort
    }
  },
}));
