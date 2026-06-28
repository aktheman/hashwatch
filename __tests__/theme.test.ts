import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.useColorScheme = jest.fn(() => 'light');
  return RN;
});
import {
  setTheme,
  getTheme,
  setThemeMode,
  getThemeMode,
  useTheme,
  scheduleThemeSwitch,
  clearThemeSchedule,
  theme,
  darkTheme,
  lightTheme,
  neonTheme,
  matrixTheme,
  stratumTheme,
} from '../src/theme';

beforeEach(() => {
  setTheme(darkTheme);
});

describe('setTheme / getTheme', () => {
  it('starts with dark theme', () => {
    const t = getTheme();
    expect(t.bg).toBe(darkTheme.bg);
  });

  it('switches to light theme', () => {
    setTheme(lightTheme);
    const t = getTheme();
    expect(t.bg).toBe(lightTheme.bg);
    expect(t.text).toBe(lightTheme.text);
  });

  it('switches back to dark theme', () => {
    setTheme(lightTheme);
    setTheme(darkTheme);
    expect(getTheme().bg).toBe(darkTheme.bg);
  });

  it('switches to neon theme', () => {
    setTheme(neonTheme);
    expect(getTheme().bg).toBe(neonTheme.bg);
    expect(getTheme().primary).toBe(neonTheme.primary);
  });

  it('switches to matrix theme', () => {
    setTheme(matrixTheme);
    expect(getTheme().bg).toBe(matrixTheme.bg);
    expect(getTheme().primary).toBe(matrixTheme.primary);
  });

  it('switches to stratum theme', () => {
    setTheme(stratumTheme);
    expect(getTheme().bg).toBe(stratumTheme.bg);
    expect(getTheme().primary).toBe(stratumTheme.primary);
  });
});

describe('setThemeMode / getThemeMode', () => {
  it('returns default mode as dark', () => {
    expect(getThemeMode()).toBe('dark');
  });

  it('mode stays dark after setTheme(darkTheme)', () => {
    setTheme(darkTheme);
    expect(getThemeMode()).toBe('dark');
  });

  it('mode is light after setTheme(lightTheme)', () => {
    setTheme(lightTheme);
    expect(getThemeMode()).toBe('light');
  });

  it('mode is matrix after setTheme(matrixTheme)', () => {
    setTheme(matrixTheme);
    expect(getThemeMode()).toBe('matrix');
  });

  it('mode is neon after setTheme(neonTheme)', () => {
    setTheme(neonTheme);
    expect(getThemeMode()).toBe('neon');
  });

  it('mode is 5tratum after setTheme(stratumTheme)', () => {
    setTheme(stratumTheme);
    expect(getThemeMode()).toBe('5tratum');
  });

  it('applies the correct theme via setThemeMode', () => {
    setThemeMode('neon');
    expect(getTheme().bg).toBe(neonTheme.bg);
    expect(getThemeMode()).toBe('neon');
  });

  it('setThemeMode matrix applies matrix theme', () => {
    setThemeMode('matrix');
    expect(getTheme().bg).toBe(matrixTheme.bg);
  });

  it('setThemeMode 5tratum applies stratum theme', () => {
    setThemeMode('5tratum');
    expect(getTheme().bg).toBe(stratumTheme.bg);
  });

  it('setThemeMode light applies light theme', () => {
    setThemeMode('light');
    expect(getTheme().bg).toBe(lightTheme.bg);
  });

  it('setThemeMode dark applies dark theme', () => {
    setThemeMode('light');
    setThemeMode('dark');
    expect(getTheme().bg).toBe(darkTheme.bg);
  });

  it('setThemeMode system on non-web uses light theme (no matchMedia)', () => {
    setThemeMode('system');
    expect(getTheme().bg).toBe(lightTheme.bg);
  });
});

describe('system mode on web platform', () => {
  const origOS = Platform.OS;
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true, writable: true });
    setTheme(darkTheme);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: origOS, configurable: true, writable: true });
    delete (globalThis as any).window;
    setThemeMode('dark');
  });

  it('setThemeMode system on web with dark preference applies darkTheme', () => {
    (globalThis as any).window = {
      matchMedia: jest.fn().mockReturnValue({ matches: true }),
    };
    setThemeMode('system');
    expect(getTheme().bg).toBe(darkTheme.bg);
  });

  it('setThemeMode system on web with light preference applies lightTheme', () => {
    (globalThis as any).window = {
      matchMedia: jest.fn().mockReturnValue({ matches: false }),
    };
    setThemeMode('system');
    expect(getTheme().bg).toBe(lightTheme.bg);
  });
});

describe('theme Proxy', () => {
  it('returns current theme property via Proxy', () => {
    setTheme(neonTheme);
    expect(theme.bg).toBe(neonTheme.bg);
    expect(theme.primary).toBe(neonTheme.primary);
    expect(theme.text).toBe(neonTheme.text);
  });

  it('returns updated value when theme changes', () => {
    expect(theme.bg).toBe(darkTheme.bg);
    setTheme(lightTheme);
    expect(theme.bg).toBe(lightTheme.bg);
  });
});

describe('scheduleThemeSwitch / clearThemeSchedule', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-26T10:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
    clearThemeSchedule();
    setThemeMode('dark');
  });

  it('schedules a theme switch for a future hour', () => {
    scheduleThemeSwitch(14, 'light');
    jest.advanceTimersByTime(4 * 3600 * 1000 - 1);
    expect(getThemeMode()).toBe('dark');
    jest.advanceTimersByTime(1);
    expect(getThemeMode()).toBe('light');
  });

  it('schedules for next day when hour has passed today', () => {
    scheduleThemeSwitch(8, 'light');
    jest.advanceTimersByTime(22 * 3600 * 1000);
    expect(getThemeMode()).toBe('light');
  });

  it('clearThemeSchedule cancels pending switch', () => {
    scheduleThemeSwitch(14, 'light');
    clearThemeSchedule();
    jest.advanceTimersByTime(4 * 3600 * 1000);
    expect(getThemeMode()).toBe('dark');
  });

  it('clearThemeSchedule is safe when no timer is active', () => {
    expect(() => clearThemeSchedule()).not.toThrow();
  });

  it('does not schedule duplicate mode', () => {
    scheduleThemeSwitch(14, 'dark');
    const timerId = setTimeout(jest.fn(), 10000);
    jest.advanceTimersByTime(4 * 3600 * 1000);
    expect(getThemeMode()).toBe('dark');
    clearTimeout(timerId);
  });

  it('reschedules after switching (recursive call)', () => {
    scheduleThemeSwitch(14, 'light');
    jest.advanceTimersByTime(4 * 3600 * 1000);
    expect(getThemeMode()).toBe('light');
    jest.advanceTimersByTime(24 * 3600 * 1000 - 1);
    expect(getThemeMode()).toBe('light');
  });
});

describe('useTheme hook', () => {
  afterEach(() => {
    setThemeMode('dark');
  });

  it('returns dark theme by default (mode is dark)', async () => {
    setThemeMode('dark');
    const { result } = await renderHook(() => useTheme());
    expect(result.current.bg).toBe(darkTheme.bg);
  });

  it('returns light theme when mode is light', async () => {
    setThemeMode('light');
    const { result } = await renderHook(() => useTheme());
    expect(result.current.bg).toBe(lightTheme.bg);
  });
});

describe('useTheme system mode with Platform.OS override', () => {
  const origOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: origOS, configurable: true, writable: true });
    delete (globalThis as Record<string, unknown>).window;
    setThemeMode('dark');
  });

  it('sets theme based on system color scheme when mode is system on non-web', async () => {
    setThemeMode('system');
    const { result } = await renderHook(() => useTheme());
    expect(result.current.bg).toBe(lightTheme.bg);
  });

  it('calls matchMedia.addEventListener on web with system mode', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true, writable: true });
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    (globalThis as any).window = {
      matchMedia: jest
        .fn()
        .mockReturnValue({ matches: false, addEventListener, removeEventListener }),
    };
    setThemeMode('system');
    await renderHook(() => useTheme());
    const mqArg = (globalThis as any).window.matchMedia.mock.calls[0][0];
    expect(mqArg).toBe('(prefers-color-scheme: dark)');
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('returns empty cleanup when matchMedia is absent on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true, writable: true });
    (globalThis as any).window = {};
    setThemeMode('system');
    const { result } = await renderHook(() => useTheme());
    expect(result.current.bg).toBe(lightTheme.bg);
  });
});
