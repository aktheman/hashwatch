import { create } from 'zustand';
import * as DB from '../db/database';
import { NotificationThresholds, DEFAULT_THRESHOLDS } from '../services/notifications';

interface NotificationChannels {
  push: boolean;
  email: boolean;
  webhook: boolean;
}

interface NotificationSettingsState {
  thresholds: NotificationThresholds;
  channels: NotificationChannels;
  quietHoursStart: number;
  quietHoursEnd: number;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateThresholds: (patch: Partial<NotificationThresholds>) => void;
  toggleChannel: (channel: keyof NotificationChannels) => void;
  setQuietHours: (start: number, end: number) => void;
}

const STORAGE_KEY = 'hashwatch_notification_settings';

export const useNotificationSettingsStore = create<NotificationSettingsState>((set) => ({
  thresholds: { ...DEFAULT_THRESHOLDS },
  channels: { push: true, email: false, webhook: false },
  quietHoursStart: 22,
  quietHoursEnd: 7,
  loaded: false,

  loadSettings: async () => {
    try {
      const raw = await DB.getSetting(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          thresholds: { ...DEFAULT_THRESHOLDS, ...parsed.thresholds },
          channels: { push: true, email: false, webhook: false, ...parsed.channels },
          quietHoursStart: parsed.quietHoursStart ?? 22,
          quietHoursEnd: parsed.quietHoursEnd ?? 7,
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  updateThresholds: (patch) => {
    set((s) => {
      const thresholds = { ...s.thresholds, ...patch };
      persistSettings({ ...s, thresholds });
      return { thresholds };
    });
  },

  toggleChannel: (channel) => {
    set((s) => {
      const channels = { ...s.channels, [channel]: !s.channels[channel] };
      persistSettings({ ...s, channels });
      return { channels };
    });
  },

  setQuietHours: (start, end) => {
    set((s) => {
      persistSettings({ ...s, quietHoursStart: start, quietHoursEnd: end });
      return { quietHoursStart: start, quietHoursEnd: end };
    });
  },
}));

function persistSettings(state: {
  thresholds: NotificationThresholds;
  channels: NotificationChannels;
  quietHoursStart: number;
  quietHoursEnd: number;
}): void {
  const data = {
    thresholds: state.thresholds,
    channels: state.channels,
    quietHoursStart: state.quietHoursStart,
    quietHoursEnd: state.quietHoursEnd,
  };
  DB.setSetting(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
}
