import { useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';

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
let _mode: 'dark' | 'light' | 'system' | 'matrix' | 'neon' = 'dark';
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
  else _mode = t === darkTheme ? 'dark' : 'light';
  listeners.forEach((cb) => cb());
}

export function setThemeMode(mode: 'dark' | 'light' | 'system' | 'matrix' | 'neon') {
  _mode = mode;
  applyMode();
}

export function getThemeMode(): 'dark' | 'light' | 'system' | 'matrix' | 'neon' {
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
  } else {
    const prefersDark =
      _mode === 'dark' ||
      (_mode === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    _current = prefersDark ? darkTheme : lightTheme;
  }
  listeners.forEach((cb) => cb());
}

export function useTheme(): Theme {
  const system = useColorScheme();
  useSyncExternalStore(
    (cb) => {
      if (_mode !== 'system') return () => {};
      const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
      if (!mq) return () => {};
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
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
