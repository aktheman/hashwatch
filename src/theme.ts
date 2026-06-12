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
let _mode: 'dark' | 'light' | 'system' = 'dark';
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
  _mode = t === darkTheme ? 'dark' : 'light';
  listeners.forEach((cb) => cb());
}

export function setThemeMode(mode: 'dark' | 'light' | 'system') {
  _mode = mode;
  applyMode();
}

export function getThemeMode(): 'dark' | 'light' | 'system' {
  return _mode;
}

export function getTheme() {
  return _current;
}

function applyMode() {
  const prefersDark =
    _mode === 'dark' ||
    (_mode === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  _current = prefersDark ? darkTheme : lightTheme;
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
  get(_target, prop) {
    return (_current as any)[prop];
  },
});
