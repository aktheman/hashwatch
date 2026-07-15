import { AppState, AppStateStatus } from 'react-native';
import { getSetting } from '../db/database';
import { setThemeMode, getThemeMode } from '../theme';

const AUTO_THEME_CHECK_INTERVAL_MS = 5 * 60 * 1000;

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _appStateSub: { remove(): void } | null = null;
let _active = false;
let _darkRange: { start: number; end: number } | null = null;
let _fallbackMode: 'system' | 'light' = 'system';

function parseRange(raw: string): { start: number; end: number } | null {
  const m = raw.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const start = parseInt(m[1], 10);
  const end = parseInt(m[2], 10);
  if (start < 0 || start > 23 || end < 0 || end > 23 || start === end) return null;
  return { start, end };
}

function isDarkHour(hour: number, range: { start: number; end: number }): boolean {
  if (range.start < range.end) {
    return hour >= range.start && hour < range.end;
  }
  return hour >= range.start || hour < range.end;
}

async function evaluate(now?: Date) {
  if (!_active || !_darkRange) return;
  const hour = (now ?? new Date()).getHours();
  if (isDarkHour(hour, _darkRange)) {
    if (getThemeMode() !== 'dark') {
      setThemeMode('dark');
    }
  } else {
    const current = getThemeMode();
    if (current === 'dark') {
      setThemeMode(_fallbackMode);
    }
  }
}

function handleAppState(state: AppStateStatus) {
  if (state === 'active') {
    evaluate();
  }
}

export async function startAutoTheme(): Promise<void> {
  if (_active) return;
  const raw = await getSetting('auto_dark_hour');
  if (!raw) return;
  const range = parseRange(raw);
  if (!range) return;
  _darkRange = range;
  _active = true;

  const fallbackRaw = await getSetting('theme_mode');
  if (fallbackRaw === 'light') {
    _fallbackMode = 'light';
  } else {
    _fallbackMode = 'system';
  }

  evaluate();
  _intervalId = setInterval(() => evaluate(), AUTO_THEME_CHECK_INTERVAL_MS);
  if (_intervalId && typeof _intervalId === 'object' && 'unref' in _intervalId) {
    (_intervalId as NodeJS.Timeout).unref();
  }
  _appStateSub = AppState.addEventListener('change', handleAppState);
}

export function stopAutoTheme(): void {
  _active = false;
  _darkRange = null;
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  if (_appStateSub) {
    _appStateSub.remove();
    _appStateSub = null;
  }
}

export function isAutoThemeActive(): boolean {
  return _active;
}

export { parseRange, isDarkHour, evaluate as _evaluate };
