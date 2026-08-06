import { create } from 'zustand';
import { fetchActivityFeed, markActivityRead, markAllActivityRead } from '../api/client';

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
  | 'team_invite'
  | 'maintenance_scheduled'
  | 'maintenance_completed'
  | 'pool_switched'
  | 'miner_added'
  | 'miner_removed'
  | 'miner_shared'
  | 'miner_unshared';

export const TEAM_ACTIVITY_TYPES: ActivityType[] = [
  'team_member_joined',
  'team_member_left',
  'team_invite',
  'miner_shared',
  'miner_unshared',
];

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
  syncing: boolean;
  addEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearEvents: () => void;
  syncFromBackend: () => Promise<void>;
  getUnreadCount: () => number;
  getTeamUnreadCount: () => number;
  markTeamEventsRead: () => void;
  getByMiner: (minerId: string) => ActivityEvent[];
}

const MAX_EVENTS = 500;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useActivityFeedStore = create<ActivityFeedState>((set, get) => ({
  events: [],
  syncing: false,

  addEvent: (event) => {
    const newEvent: ActivityEvent = {
      ...event,
      id: generateId(),
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
    markActivityRead(id).catch(() => {});
  },

  markAllRead: () => {
    set((state) => ({
      events: state.events.map((e) => ({ ...e, read: true })),
    }));
    markAllActivityRead().catch(() => {});
  },

  clearEvents: () => set({ events: [] }),

  syncFromBackend: async () => {
    set({ syncing: true });
    try {
      const remote = await fetchActivityFeed(200);
      if (remote.length === 0) return;
      const local = get().events;
      const localIds = new Set(local.map((e) => e.id));
      const localKeys = new Set(local.map((e) => `${e.title}:${e.timestamp}`));
      const merged = [...local];
      for (const r of remote) {
        if (localIds.has(r.id)) continue;
        const key = `${r.title}:${r.timestamp}`;
        if (localKeys.has(key)) continue;
        merged.push({
          id: r.id,
          type: r.type as ActivityType,
          title: r.title,
          description: r.description ?? '',
          timestamp: r.timestamp,
          severity: r.severity,
          read: r.read,
          minerId: r.minerId,
          metadata: (r.metadata ?? {}) as Record<string, string>,
        });
      }
      merged.sort((a, b) => b.timestamp - a.timestamp);
      set({ events: merged.slice(0, MAX_EVENTS) });
    } catch {
      // best-effort
    } finally {
      set({ syncing: false });
    }
  },

  getUnreadCount: () => get().events.filter((e) => !e.read).length,

  getTeamUnreadCount: () =>
    get().events.filter((e) => TEAM_ACTIVITY_TYPES.includes(e.type) && !e.read).length,

  markTeamEventsRead: () => {
    const ids = get()
      .events.filter((e) => TEAM_ACTIVITY_TYPES.includes(e.type) && !e.read)
      .map((e) => e.id);
    if (ids.length === 0) return;
    set((state) => ({
      events: state.events.map((e) =>
        TEAM_ACTIVITY_TYPES.includes(e.type) ? { ...e, read: true } : e,
      ),
    }));
    ids.forEach((id) => markActivityRead(id).catch(() => {}));
  },

  getByMiner: (minerId) => get().events.filter((e) => e.minerId === minerId),
}));
