import { THEME_MAP, Theme } from '../theme';
import type { CustomTheme } from '../store/customThemes';
import { Platform } from 'react-native';

export interface ThemeExport {
  name: string;
  version: 1;
  colors: Partial<Theme>;
  author?: string;
}

export function exportThemeAsJSON(ct: CustomTheme): string {
  const exported: ThemeExport = {
    name: ct.name,
    version: 1,
    colors: ct.colors,
  };
  return JSON.stringify(exported, null, 2);
}

export function exportBuiltInThemeAsJSON(mode: string): string | null {
  const t = THEME_MAP[mode];
  if (!t) return null;
  const exported: ThemeExport = {
    name: mode,
    version: 1,
    colors: { ...t },
  };
  return JSON.stringify(exported, null, 2);
}

export function importThemeFromJSON(json: string): { name: string; colors: Partial<Theme> } | null {
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object') return null;
    if (!data.colors || typeof data.colors !== 'object') return null;
    if (!data.name || typeof data.name !== 'string') {
      data.name = 'Imported Theme';
    }
    return {
      name: String(data.name).slice(0, 100),
      colors: data.colors,
    };
  } catch {
    return null;
  }
}

export async function copyThemeToClipboard(ct: CustomTheme): Promise<boolean> {
  const json = exportThemeAsJSON(ct);
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(json);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function pasteThemeFromClipboard(): Promise<{
  name: string;
  colors: Partial<Theme>;
} | null> {
  if (Platform.OS === 'web') {
    try {
      const text = await navigator.clipboard.readText();
      return importThemeFromJSON(text);
    } catch {
      return null;
    }
  }
  return null;
}
