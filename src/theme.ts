import { useSyncExternalStore } from 'react';
import { useColorScheme, Platform } from 'react-native';

export type Theme = typeof darkTheme;

export const darkTheme = {
  bg: '#0A0A1A',
  surface: '#13132B',
  surfaceLight: '#1A1A3E',
  border: '#1E1E42',
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#4F46E5',
  accent: '#3B82F6',
  success: '#10B981',
  successLight: '#34D399',
  danger: '#EF4444',
  dangerLight: '#F87171',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  info: '#06B6D4',
  text: '#FFFFFF',
  textDim: '#8B8FA3',
  textMuted: '#5C5F7A',
  glow: 'rgba(108, 99, 255, 0.3)',
  glowSuccess: 'rgba(16, 185, 129, 0.3)',
  glowDanger: 'rgba(239, 68, 68, 0.3)',
  glowWarning: 'rgba(245, 158, 11, 0.3)',
};

export const neonTheme: Theme = {
  bg: '#08080F',
  surface: '#0F0A20',
  surfaceLight: '#1A1035',
  border: '#2A1550',
  primary: '#00FFFF',
  primaryLight: '#66FFFF',
  primaryDark: '#00CCCC',
  accent: '#FF00FF',
  success: '#00FF88',
  successLight: '#66FFBB',
  danger: '#FF3366',
  dangerLight: '#FF6699',
  warning: '#FFCC00',
  warningLight: '#FFDD44',
  info: '#00DDFF',
  text: '#E0E0FF',
  textDim: '#8888BB',
  textMuted: '#555588',
  glow: 'rgba(0, 255, 255, 0.3)',
  glowSuccess: 'rgba(0, 255, 136, 0.25)',
  glowDanger: 'rgba(255, 51, 102, 0.25)',
  glowWarning: 'rgba(255, 204, 0, 0.25)',
};

export const matrixTheme: Theme = {
  bg: '#000000',
  surface: '#0A1A0A',
  surfaceLight: '#0F2A0F',
  border: '#1A3A1A',
  primary: '#00FF41',
  primaryLight: '#33FF77',
  primaryDark: '#00CC33',
  accent: '#00CC66',
  success: '#00FF41',
  successLight: '#33FF77',
  danger: '#FF3333',
  dangerLight: '#FF6666',
  warning: '#FFD700',
  warningLight: '#FFE44D',
  info: '#00CCCC',
  text: '#00FF41',
  textDim: '#008800',
  textMuted: '#005500',
  glow: 'rgba(0, 255, 65, 0.25)',
  glowSuccess: 'rgba(0, 255, 65, 0.25)',
  glowDanger: 'rgba(255, 51, 51, 0.25)',
  glowWarning: 'rgba(255, 215, 0, 0.25)',
};

export const stratumTheme: Theme = {
  bg: '#0C0907',
  surface: '#171310',
  surfaceLight: '#201C18',
  border: '#2C2722',
  primary: '#FF8C00',
  primaryLight: '#FFAA33',
  primaryDark: '#CC7000',
  accent: '#00B4D8',
  success: '#10B981',
  successLight: '#34D399',
  danger: '#EF4444',
  dangerLight: '#F87171',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  info: '#38BDF8',
  text: '#F0ECE6',
  textDim: '#A0988E',
  textMuted: '#706860',
  glow: 'rgba(255, 140, 0, 0.18)',
  glowSuccess: 'rgba(16, 185, 129, 0.18)',
  glowDanger: 'rgba(239, 68, 68, 0.18)',
  glowWarning: 'rgba(245, 158, 11, 0.18)',
};

export const crimsonTheme: Theme = {
  bg: '#0F0505',
  surface: '#1A0A0A',
  surfaceLight: '#2A1010',
  border: '#3A1515',
  primary: '#FF1A4A',
  primaryLight: '#FF4D73',
  primaryDark: '#CC0033',
  accent: '#8B0000',
  success: '#10B981',
  successLight: '#34D399',
  danger: '#EF4444',
  dangerLight: '#F87171',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  info: '#FF6B8A',
  text: '#F5E6E6',
  textDim: '#A88080',
  textMuted: '#705050',
  glow: 'rgba(255, 26, 74, 0.25)',
  glowSuccess: 'rgba(16, 185, 129, 0.25)',
  glowDanger: 'rgba(239, 68, 68, 0.25)',
  glowWarning: 'rgba(245, 158, 11, 0.25)',
};

export const oceanTheme: Theme = {
  bg: '#050B14',
  surface: '#0A1628',
  surfaceLight: '#10203A',
  border: '#1A2D4A',
  primary: '#00B4D8',
  primaryLight: '#48CAE4',
  primaryDark: '#0096C7',
  accent: '#0077B6',
  success: '#00B981',
  successLight: '#34D399',
  danger: '#EF4444',
  dangerLight: '#F87171',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  info: '#90E0EF',
  text: '#E0EDF5',
  textDim: '#8098B0',
  textMuted: '#506880',
  glow: 'rgba(0, 180, 216, 0.25)',
  glowSuccess: 'rgba(0, 185, 129, 0.25)',
  glowDanger: 'rgba(239, 68, 68, 0.25)',
  glowWarning: 'rgba(245, 158, 11, 0.25)',
};

export const lavenderTheme: Theme = {
  bg: '#0E0A1F',
  surface: '#181230',
  surfaceLight: '#221A40',
  border: '#2D2250',
  primary: '#B388FF',
  primaryLight: '#CCAAFF',
  primaryDark: '#9966FF',
  accent: '#7C4DFF',
  success: '#10B981',
  successLight: '#34D399',
  danger: '#EF4444',
  dangerLight: '#F87171',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  info: '#D1B3FF',
  text: '#EDE5F5',
  textDim: '#9A88B8',
  textMuted: '#6A5888',
  glow: 'rgba(179, 136, 255, 0.25)',
  glowSuccess: 'rgba(16, 185, 129, 0.25)',
  glowDanger: 'rgba(239, 68, 68, 0.25)',
  glowWarning: 'rgba(245, 158, 11, 0.25)',
};

export const midnightTheme: Theme = {
  bg: '#060612',
  surface: '#0C0C24',
  surfaceLight: '#14143A',
  border: '#1C1C4A',
  primary: '#4488FF',
  primaryLight: '#66AAFF',
  primaryDark: '#2266DD',
  accent: '#00B4D8',
  success: '#10B981',
  successLight: '#34D399',
  danger: '#EF4444',
  dangerLight: '#F87171',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  info: '#88BBFF',
  text: '#DEE5F0',
  textDim: '#7888A8',
  textMuted: '#485878',
  glow: 'rgba(68, 136, 255, 0.25)',
  glowSuccess: 'rgba(16, 185, 129, 0.25)',
  glowDanger: 'rgba(239, 68, 68, 0.25)',
  glowWarning: 'rgba(245, 158, 11, 0.25)',
};

export const nordTheme: Theme = {
  bg: '#2E3440',
  surface: '#3B4252',
  surfaceLight: '#434C5E',
  border: '#4C566A',
  primary: '#88C0D0',
  primaryLight: '#8FBCBB',
  primaryDark: '#5E81AC',
  accent: '#81A1C1',
  success: '#A3BE8C',
  successLight: '#B4D8A0',
  danger: '#BF616A',
  dangerLight: '#D08770',
  warning: '#EBCB8B',
  warningLight: '#D8DEE9',
  info: '#5E81AC',
  text: '#ECEFF4',
  textDim: '#A0AABF',
  textMuted: '#616E88',
  glow: 'rgba(136, 192, 208, 0.2)',
  glowSuccess: 'rgba(163, 190, 140, 0.2)',
  glowDanger: 'rgba(191, 97, 106, 0.2)',
  glowWarning: 'rgba(235, 203, 139, 0.2)',
};

export const draculaTheme: Theme = {
  bg: '#282A36',
  surface: '#343746',
  surfaceLight: '#3E4155',
  border: '#44475A',
  primary: '#FF79C6',
  primaryLight: '#FF92D0',
  primaryDark: '#BD93F9',
  accent: '#BD93F9',
  success: '#50FA7B',
  successLight: '#69FF97',
  danger: '#FF5555',
  dangerLight: '#FF6E6E',
  warning: '#F1FA8C',
  warningLight: '#F4F4A8',
  info: '#8BE9FD',
  text: '#F8F8F2',
  textDim: '#BFBFBF',
  textMuted: '#6272A4',
  glow: 'rgba(255, 121, 198, 0.25)',
  glowSuccess: 'rgba(80, 250, 123, 0.25)',
  glowDanger: 'rgba(255, 85, 85, 0.25)',
  glowWarning: 'rgba(241, 250, 140, 0.25)',
};

export const catppuccinTheme: Theme = {
  bg: '#1E1E2E',
  surface: '#313244',
  surfaceLight: '#45475A',
  border: '#585B70',
  primary: '#CBA6F7',
  primaryLight: '#D4BFFF',
  primaryDark: '#B4BEFE',
  accent: '#F5C2E7',
  success: '#A6E3A1',
  successLight: '#BDFBC8',
  danger: '#F38BA8',
  dangerLight: '#F5A0BC',
  warning: '#F9E2AF',
  warningLight: '#FDF0D5',
  info: '#89DCEB',
  text: '#CDD6F4',
  textDim: '#A6ADC8',
  textMuted: '#6C7086',
  glow: 'rgba(203, 166, 247, 0.2)',
  glowSuccess: 'rgba(166, 227, 161, 0.2)',
  glowDanger: 'rgba(243, 139, 168, 0.2)',
  glowWarning: 'rgba(249, 226, 175, 0.2)',
};

export const rosepineTheme: Theme = {
  bg: '#191724',
  surface: '#1F1D2E',
  surfaceLight: '#26233A',
  border: '#393552',
  primary: '#EB6F92',
  primaryLight: '#F2A0B8',
  primaryDark: '#C4A0D0',
  accent: '#31748F',
  success: '#9CCFD8',
  successLight: '#B4E4EC',
  danger: '#EB6F92',
  dangerLight: '#F2A0B8',
  warning: '#F6C177',
  warningLight: '#F9DCA8',
  info: '#9CCFD8',
  text: '#E0DEF4',
  textDim: '#908CAA',
  textMuted: '#6E6A86',
  glow: 'rgba(235, 111, 146, 0.2)',
  glowSuccess: 'rgba(156, 207, 216, 0.2)',
  glowDanger: 'rgba(235, 111, 146, 0.2)',
  glowWarning: 'rgba(246, 193, 119, 0.2)',
};

export const lightTheme: Theme = {
  bg: '#F8F9FC',
  surface: '#FFFFFF',
  surfaceLight: '#F0F1F7',
  border: '#DEE0EC',
  primary: '#5B52E6',
  primaryLight: '#7C75FF',
  primaryDark: '#4F46E5',
  accent: '#2563EB',
  success: '#059669',
  successLight: '#34D399',
  danger: '#DC2626',
  dangerLight: '#F87171',
  warning: '#D97706',
  warningLight: '#FBBF24',
  info: '#0891B2',
  text: '#16162E',
  textDim: '#6D6D89',
  textMuted: '#9898B2',
  glow: 'rgba(91, 82, 230, 0.12)',
  glowSuccess: 'rgba(5, 150, 105, 0.12)',
  glowDanger: 'rgba(220, 38, 38, 0.12)',
  glowWarning: 'rgba(217, 119, 6, 0.12)',
};

let _current: Theme = darkTheme;
let _mode:
  | 'dark'
  | 'light'
  | 'system'
  | 'matrix'
  | 'neon'
  | '5tratum'
  | 'crimson'
  | 'ocean'
  | 'lavender'
  | 'midnight'
  | 'nord'
  | 'dracula'
  | 'catppuccin'
  | 'rosepine' = 'dark';
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return _current;
}

export function setTheme(t: Theme) {
  _current = t;
  if (t === matrixTheme) _mode = 'matrix';
  else if (t === neonTheme) _mode = 'neon';
  else if (t === stratumTheme) _mode = '5tratum';
  else if (t === crimsonTheme) _mode = 'crimson';
  else if (t === oceanTheme) _mode = 'ocean';
  else if (t === lavenderTheme) _mode = 'lavender';
  else if (t === midnightTheme) _mode = 'midnight';
  else if (t === nordTheme) _mode = 'nord';
  else if (t === draculaTheme) _mode = 'dracula';
  else if (t === catppuccinTheme) _mode = 'catppuccin';
  else if (t === rosepineTheme) _mode = 'rosepine';
  else _mode = t === darkTheme ? 'dark' : 'light';
  listeners.forEach((cb) => cb());
}

export function setThemeMode(
  mode:
    | 'dark'
    | 'light'
    | 'system'
    | 'matrix'
    | 'neon'
    | '5tratum'
    | 'crimson'
    | 'ocean'
    | 'lavender'
    | 'midnight'
    | 'nord'
    | 'dracula'
    | 'catppuccin'
    | 'rosepine',
) {
  _mode = mode;
  applyMode();
}

export function getThemeMode():
  | 'dark'
  | 'light'
  | 'system'
  | 'matrix'
  | 'neon'
  | '5tratum'
  | 'crimson'
  | 'ocean'
  | 'lavender'
  | 'midnight'
  | 'nord'
  | 'dracula'
  | 'catppuccin'
  | 'rosepine' {
  return _mode;
}

export function getTheme() {
  return _current;
}

function applyMode() {
  if (_mode === 'matrix') {
    _current = matrixTheme;
  } else if (_mode === 'neon') {
    _current = neonTheme;
  } else if (_mode === '5tratum') {
    _current = stratumTheme;
  } else if (_mode === 'crimson') {
    _current = crimsonTheme;
  } else if (_mode === 'ocean') {
    _current = oceanTheme;
  } else if (_mode === 'lavender') {
    _current = lavenderTheme;
  } else if (_mode === 'midnight') {
    _current = midnightTheme;
  } else if (_mode === 'nord') {
    _current = nordTheme;
  } else if (_mode === 'dracula') {
    _current = draculaTheme;
  } else if (_mode === 'catppuccin') {
    _current = catppuccinTheme;
  } else if (_mode === 'rosepine') {
    _current = rosepineTheme;
  } else if (_mode === 'system') {
    const prefersDark =
      Platform.OS === 'web'
        ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
        : false;
    _current = prefersDark ? darkTheme : lightTheme;
  } else {
    _current = _mode === 'dark' ? darkTheme : lightTheme;
  }
  listeners.forEach((cb) => cb());
}

export function useTheme(): Theme {
  const system = useColorScheme();
  useSyncExternalStore(
    (cb) => {
      if (_mode !== 'system') return () => {};
      if (Platform.OS === 'web') {
        const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
        if (!mq) return () => {};
        mq.addEventListener('change', cb);
        return () => mq.removeEventListener('change', cb);
      }
      return () => {};
    },
    getSnapshot,
    getSnapshot,
  );
  if (_mode === 'system' && system) {
    _current = system === 'dark' ? darkTheme : lightTheme;
  }
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const theme = new Proxy({} as Theme, {
  get(_target, prop: string) {
    return (_current as Record<string, unknown>)[prop];
  },
});

let scheduleTimerId: ReturnType<typeof setTimeout> | null = null;
let scheduledMode: 'dark' | 'light' | null = null;

export function scheduleThemeSwitch(hour: number, mode: 'dark' | 'light') {
  if (scheduleTimerId !== null) {
    clearTimeout(scheduleTimerId);
    scheduleTimerId = null;
  }
  if (scheduledMode === mode) return;
  scheduledMode = mode;

  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const msUntil = target.getTime() - now.getTime();

  scheduleTimerId = setTimeout(() => {
    setThemeMode(mode === 'dark' ? 'dark' : 'light');
    scheduleTimerId = null;
    scheduledMode = null;
    scheduleThemeSwitch(hour, mode);
  }, msUntil);
}

export function clearThemeSchedule() {
  if (scheduleTimerId !== null) {
    clearTimeout(scheduleTimerId);
    scheduleTimerId = null;
  }
  scheduledMode = null;
}

export const THEME_MAP: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme,
  neon: neonTheme,
  matrix: matrixTheme,
  '5tratum': stratumTheme,
  crimson: crimsonTheme,
  ocean: oceanTheme,
  lavender: lavenderTheme,
  midnight: midnightTheme,
  nord: nordTheme,
  dracula: draculaTheme,
  catppuccin: catppuccinTheme,
  rosepine: rosepineTheme,
};

export const THEME_ORDER: string[] = [
  'system',
  'dark',
  'light',
  'neon',
  'matrix',
  '5tratum',
  'crimson',
  'ocean',
  'lavender',
  'midnight',
  'nord',
  'dracula',
  'catppuccin',
  'rosepine',
];

export const THEME_EMOJIS: Record<string, string> = {
  system: '🔄',
  dark: '🌙',
  light: '☀',
  neon: '💜',
  matrix: '💚',
  '5tratum': '🔶',
  crimson: '🔴',
  ocean: '🌊',
  lavender: '🌸',
  midnight: '🌃',
  nord: '❄️',
  dracula: '🧛',
  catppuccin: '🐱',
  rosepine: '🌲',
};

export function buildThemeFromColors(colors: Partial<Theme>): Theme {
  const base = darkTheme;
  return {
    bg: colors.bg ?? base.bg,
    surface: colors.surface ?? base.surface,
    surfaceLight: colors.surfaceLight ?? base.surfaceLight,
    border: colors.border ?? base.border,
    primary: colors.primary ?? base.primary,
    primaryLight: colors.primaryLight ?? base.primaryLight,
    primaryDark: colors.primaryDark ?? base.primaryDark,
    accent: colors.accent ?? base.accent,
    success: colors.success ?? base.success,
    successLight: colors.successLight ?? base.successLight,
    danger: colors.danger ?? base.danger,
    dangerLight: colors.dangerLight ?? base.dangerLight,
    warning: colors.warning ?? base.warning,
    warningLight: colors.warningLight ?? base.warningLight,
    info: colors.info ?? base.info,
    text: colors.text ?? base.text,
    textDim: colors.textDim ?? base.textDim,
    textMuted: colors.textMuted ?? base.textMuted,
    glow: colors.glow ?? base.glow,
    glowSuccess: colors.glowSuccess ?? base.glowSuccess,
    glowDanger: colors.glowDanger ?? base.glowDanger,
    glowWarning: colors.glowWarning ?? base.glowWarning,
  };
}
