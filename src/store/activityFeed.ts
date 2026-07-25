import { create } from 'zustand';

export type ActivityType =
  | 'miner_online'
  | 'miner_offline'
  | 'alert_fired'
  | 'firmware_updated'
  | 'group_changed'
  | 'wallet_changed'
  | 'settings_changed'
  | 'team_member_joined'
  | 'team_member_left'
  | 'maintenance_scheduled'
  | 'maintenance_completed'
  | 'pool_switched'
  | 'miner_added'
  | 'miner_removed';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  minerId?: string;
  minerName?: string;
  title: string;
  description: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  metadata?: Record<string, string>;
}

interface ActivityFeedState {
  events: ActivityEvent[];
  addEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearEvents: () => void;
  getUnreadCount: () => number;
  getByMiner: (minerId: string) => ActivityEvent[];
}

const MAX_EVENTS = 500;

export const useActivityFeedStore = create<ActivityFeedState>((set, get) => ({
  events: [],

  addEvent: (event) => {
    const newEvent: ActivityEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };
    set((state) => ({
      events: [newEvent, ...state.events].slice(0, MAX_EVENTS),
    }));
  },

  markRead: (id) => {
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? { ...e, read: true } : e)),
    }));
  },

  markAllRead: () => {
    set((state) => ({
      events: state.events.map((e) => ({ ...e, read: true })),
    }));
  },

  clearEvents: () => set({ events: [] }),

  getUnreadCount: () => get().events.filter((e) => !e.read).length,

  getByMiner: (minerId) => get().events.filter((e) => e.minerId === minerId),
}));
