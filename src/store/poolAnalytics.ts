import { create } from 'zustand';
import * as API from '../api/client';

export interface PoolAnalyticsState {
  stats: API.PoolAnalyticsStats[];
  config: API.PoolConfig[];
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
  saveConfig: (config: { provider: string; apiKey: string; poolUser: string }) => Promise<void>;
  loadConfig: () => Promise<void>;
}

export const usePoolAnalyticsStore = create<PoolAnalyticsState>((set) => ({
  stats: [],
  config: [],
  loading: false,
  error: null,

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const result = await API.fetchPoolAnalytics();
      set({ stats: result.stats, config: result.configs, loading: false });
    } catch {
      set({ loading: false, error: 'fetchError' });
    }
  },

  saveConfig: async (config) => {
    try {
      const saved = await API.savePoolConfig(config);
      set((state) => ({ config: [...state.config, saved] }));
    } catch {
      set({ error: 'configSaveError' });
    }
  },

  loadConfig: async () => {
    try {
      const configs = await API.fetchPoolConfigs();
      set({ config: configs });
    } catch {
      set({ error: 'configLoadError' });
    }
  },
}));
