import { create } from 'zustand';
import * as DB from '../db/database';
import { NotificationThresholds, DEFAULT_THRESHOLDS } from '../services/notifications';
import { putQuietHours } from '../api/client';

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
  quietHoursEnabled: boolean;
  quietHoursAllowCritical: boolean;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateThresholds: (patch: Partial<NotificationThresholds>) => void;
  toggleChannel: (channel: keyof NotificationChannels) => void;
  setQuietHours: (start: number, end: number) => void;
  setQuietHoursEnabled: (enabled: boolean) => void;
  setQuietHoursAllowCritical: (allowCritical: boolean) => void;
}

const STORAGE_KEY = 'hashwatch_notification_settings';

const QUIET_HOURS_ENABLED_KEY = 'quiet_hours_enabled';
const QUIET_HOURS_START_KEY = 'quiet_hours_start';
const QUIET_HOURS_END_KEY = 'quiet_hours_end';
const QUIET_HOURS_CRITICAL_KEY = 'quiet_hours_allow_critical';

function formatTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function currentUtcOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

async function syncQuietHoursToBackend(state: {
  quietHoursStart: number;
  quietHoursEnd: number;
  quietHoursEnabled: boolean;
  quietHoursAllowCritical: boolean;
}): Promise<void> {
  const { useAuthStore } = await import('./auth');
  if (!useAuthStore.getState().token) return;
  try {
    await putQuietHours({
      enabled: state.quietHoursEnabled,
      start: formatTime(state.quietHoursStart),
      end: formatTime(state.quietHoursEnd),
      utcOffsetMinutes: currentUtcOffsetMinutes(),
      allowCritical: state.quietHoursAllowCritical,
    });
  } catch {
    // offline — server enforcement will catch up on next change
  }
}

function persistQuietHours(state: {
  quietHoursStart: number;
  quietHoursEnd: number;
  quietHoursEnabled: boolean;
  quietHoursAllowCritical: boolean;
}): void {
  void DB.setSetting(QUIET_HOURS_ENABLED_KEY, state.quietHoursEnabled ? 'true' : 'false');
  void DB.setSetting(QUIET_HOURS_START_KEY, formatTime(state.quietHoursStart));
  void DB.setSetting(QUIET_HOURS_END_KEY, formatTime(state.quietHoursEnd));
  void DB.setSetting(QUIET_HOURS_CRITICAL_KEY, state.quietHoursAllowCritical ? 'true' : 'false');
}

export const useNotificationSettingsStore = create<NotificationSettingsState>((set) => ({
  thresholds: { ...DEFAULT_THRESHOLDS },
  channels: { push: true, email: false, webhook: false },
  quietHoursStart: 22,
  quietHoursEnd: 7,
  quietHoursEnabled: false,
  quietHoursAllowCritical: true,
  loaded: false,

  loadSettings: async () => {
    try {
      const raw = await DB.getSetting(STORAGE_KEY);
      const enabledRaw = await DB.getSetting(QUIET_HOURS_ENABLED_KEY);
      const criticalRaw = await DB.getSetting(QUIET_HOURS_CRITICAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          thresholds: { ...DEFAULT_THRESHOLDS, ...parsed.thresholds },
          channels: { push: true, email: false, webhook: false, ...parsed.channels },
          quietHoursStart: parsed.quietHoursStart ?? 22,
          quietHoursEnd: parsed.quietHoursEnd ?? 7,
          quietHoursEnabled: parsed.quietHoursEnabled ?? enabledRaw === 'true',
          quietHoursAllowCritical: parsed.quietHoursAllowCritical ?? criticalRaw !== 'false',
          loaded: true,
        });
      } else {
        set({
          quietHoursEnabled: enabledRaw === 'true',
          quietHoursAllowCritical: criticalRaw !== 'false',
          loaded: true,
        });
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
      const next = { ...s, quietHoursStart: start, quietHoursEnd: end };
      persistSettings(next);
      persistQuietHours(next);
      void syncQuietHoursToBackend(next);
      return { quietHoursStart: start, quietHoursEnd: end };
    });
  },

  setQuietHoursEnabled: (enabled) => {
    set((s) => {
      const next = { ...s, quietHoursEnabled: enabled };
      persistSettings(next);
      persistQuietHours(next);
      void syncQuietHoursToBackend(next);
      return { quietHoursEnabled: enabled };
    });
  },

  setQuietHoursAllowCritical: (allowCritical) => {
    set((s) => {
      const next = { ...s, quietHoursAllowCritical: allowCritical };
      persistSettings(next);
      persistQuietHours(next);
      void syncQuietHoursToBackend(next);
      return { quietHoursAllowCritical: allowCritical };
    });
  },
}));

function persistSettings(state: {
  thresholds: NotificationThresholds;
  channels: NotificationChannels;
  quietHoursStart: number;
  quietHoursEnd: number;
  quietHoursEnabled: boolean;
  quietHoursAllowCritical: boolean;
}): void {
  const data = {
    thresholds: state.thresholds,
    channels: state.channels,
    quietHoursStart: state.quietHoursStart,
    quietHoursEnd: state.quietHoursEnd,
    quietHoursEnabled: state.quietHoursEnabled,
    quietHoursAllowCritical: state.quietHoursAllowCritical,
  };
  DB.setSetting(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
}
