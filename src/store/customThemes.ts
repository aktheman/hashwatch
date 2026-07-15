import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { Theme } from '../theme';
import { buildThemeFromColors } from '../theme';

export interface CustomTheme {
  id: number;
  name: string;
  colors: Partial<Theme>;
  createdAt: string;
  updatedAt: string;
}

interface CustomThemesState {
  themes: CustomTheme[];
  loading: boolean;
  load: () => Promise<void>;
  create: (name: string, colors: Partial<Theme>) => Promise<CustomTheme | null>;
  update: (id: number, data: { name?: string; colors?: Partial<Theme> }) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useCustomThemesStore = create<CustomThemesState>((set, get) => ({
  themes: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const res = await apiClient.get('/custom-themes');
      set({ themes: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  create: async (name, colors) => {
    try {
      const res = await apiClient.post('/custom-themes', { name, colors });
      set({ themes: [res.data, ...get().themes] });
      return res.data;
    } catch {
      return null;
    }
  },

  update: async (id, data) => {
    try {
      const res = await apiClient.put(`/custom-themes/${id}`, data);
      set({
        themes: get().themes.map((t) => (t.id === id ? res.data : t)),
      });
    } catch {
      // silent
    }
  },

  remove: async (id) => {
    try {
      await apiClient.delete(`/custom-themes/${id}`);
      set({ themes: get().themes.filter((t) => t.id !== id) });
    } catch {
      // silent
    }
  },
}));

export function customThemeToTheme(ct: CustomTheme): Theme {
  return buildThemeFromColors(ct.colors);
}
