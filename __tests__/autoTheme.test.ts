import { getSetting } from '../src/db/database';
import { setThemeMode, getThemeMode } from '../src/theme';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.AppState = {
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    currentState: 'active',
  };
  return RN;
});

import {
  startAutoTheme,
  stopAutoTheme,
  isAutoThemeActive,
  parseRange,
  isDarkHour,
  _evaluate,
} from '../src/services/autoTheme';

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn(),
}));

jest.mock('../src/theme', () => {
  const actual = jest.requireActual('../src/theme');
  return {
    ...actual,
    setThemeMode: jest.fn(),
    getThemeMode: jest.fn(() => 'light'),
  };
});

beforeEach(() => {
  jest.useFakeTimers();
  (getSetting as jest.Mock).mockReset();
  (setThemeMode as unknown as jest.Mock).mockClear();
  (getThemeMode as unknown as jest.Mock).mockReturnValue('light');
  stopAutoTheme();
});

afterEach(() => {
  stopAutoTheme();
  jest.useRealTimers();
});

describe('parseRange', () => {
  it('parses normal range "18-23"', () => {
    expect(parseRange('18-23')).toEqual({ start: 18, end: 23 });
  });

  it('parses crossing-midnight range "22-6"', () => {
    expect(parseRange('22-6')).toEqual({ start: 22, end: 6 });
  });

  it('parses full-day range "0-0"', () => {
    expect(parseRange('0-0')).toBeNull();
  });

  it('returns null for invalid format', () => {
    expect(parseRange('abc')).toBeNull();
    expect(parseRange('')).toBeNull();
    expect(parseRange('18:00-23:00')).toBeNull();
  });

  it('returns null for out-of-range hours', () => {
    expect(parseRange('25-30')).toBeNull();
  });
});

describe('isDarkHour', () => {
  it('returns true within normal range', () => {
    expect(isDarkHour(19, { start: 18, end: 23 })).toBe(true);
  });

  it('returns false outside normal range', () => {
    expect(isDarkHour(12, { start: 18, end: 23 })).toBe(false);
  });

  it('returns true at start boundary', () => {
    expect(isDarkHour(18, { start: 18, end: 23 })).toBe(true);
  });

  it('returns false at end boundary (exclusive)', () => {
    expect(isDarkHour(23, { start: 18, end: 23 })).toBe(false);
  });

  it('returns true crossing midnight - evening', () => {
    expect(isDarkHour(22, { start: 22, end: 6 })).toBe(true);
  });

  it('returns true crossing midnight - early morning', () => {
    expect(isDarkHour(3, { start: 22, end: 6 })).toBe(true);
  });

  it('returns false crossing midnight - daytime', () => {
    expect(isDarkHour(12, { start: 22, end: 6 })).toBe(false);
  });

  it('returns true crossing midnight at end boundary (exclusive)', () => {
    expect(isDarkHour(6, { start: 22, end: 6 })).toBe(false);
  });
});

describe('isAutoThemeActive', () => {
  it('returns false initially', () => {
    expect(isAutoThemeActive()).toBe(false);
  });
});

describe('startAutoTheme / stopAutoTheme lifecycle', () => {
  it('does nothing when setting is empty', async () => {
    (getSetting as jest.Mock).mockResolvedValue(null);
    await startAutoTheme();
    expect(isAutoThemeActive()).toBe(false);
  });

  it('does nothing for invalid range', async () => {
    (getSetting as jest.Mock).mockResolvedValue('invalid');
    await startAutoTheme();
    expect(isAutoThemeActive()).toBe(false);
  });

  it('activates with valid range', async () => {
    (getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auto_dark_hour') return Promise.resolve('18-23');
      if (key === 'theme_mode') return Promise.resolve('system');
      return Promise.resolve(null);
    });
    await startAutoTheme();
    expect(isAutoThemeActive()).toBe(true);
  });

  it('stops cleanly', async () => {
    (getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auto_dark_hour') return Promise.resolve('18-23');
      return Promise.resolve(null);
    });
    await startAutoTheme();
    expect(isAutoThemeActive()).toBe(true);
    stopAutoTheme();
    expect(isAutoThemeActive()).toBe(false);
  });

  it('does not double-start', async () => {
    (getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auto_dark_hour') return Promise.resolve('18-23');
      return Promise.resolve(null);
    });
    await startAutoTheme();
    await startAutoTheme();
    expect(isAutoThemeActive()).toBe(true);
    stopAutoTheme();
  });
});

describe('evaluate (internal)', () => {
  it('forces dark mode during dark hours', async () => {
    (getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auto_dark_hour') return Promise.resolve('18-23');
      if (key === 'theme_mode') return Promise.resolve('system');
      return Promise.resolve(null);
    });
    (getThemeMode as unknown as jest.Mock).mockReturnValue('light');
    await startAutoTheme();
    (setThemeMode as unknown as jest.Mock).mockClear();
    (getThemeMode as unknown as jest.Mock).mockReturnValue('light');
    await _evaluate(new Date('2026-06-26T19:00:00'));
    expect(setThemeMode).toHaveBeenCalledWith('dark');
  });

  it('restores system mode outside dark hours', async () => {
    (getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auto_dark_hour') return Promise.resolve('18-23');
      if (key === 'theme_mode') return Promise.resolve('system');
      return Promise.resolve(null);
    });
    await startAutoTheme();
    (setThemeMode as unknown as jest.Mock).mockClear();
    (getThemeMode as unknown as jest.Mock).mockReturnValue('dark');
    await _evaluate(new Date('2026-06-26T10:00:00'));
    expect(setThemeMode).toHaveBeenCalledWith('system');
  });

  it('restores light mode when fallback is light', async () => {
    (getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auto_dark_hour') return Promise.resolve('18-23');
      if (key === 'theme_mode') return Promise.resolve('light');
      return Promise.resolve(null);
    });
    await startAutoTheme();
    (setThemeMode as unknown as jest.Mock).mockClear();
    (getThemeMode as unknown as jest.Mock).mockReturnValue('dark');
    await _evaluate(new Date('2026-06-26T10:00:00'));
    expect(setThemeMode).toHaveBeenCalledWith('light');
  });

  it('handles crossing-midnight range', async () => {
    (getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auto_dark_hour') return Promise.resolve('22-6');
      if (key === 'theme_mode') return Promise.resolve('system');
      return Promise.resolve(null);
    });
    await startAutoTheme();
    (setThemeMode as unknown as jest.Mock).mockClear();
    (getThemeMode as unknown as jest.Mock).mockReturnValue('light');
    await _evaluate(new Date('2026-06-26T03:00:00'));
    expect(setThemeMode).toHaveBeenCalledWith('dark');
  });

  it('does nothing when not active', async () => {
    await _evaluate(new Date('2026-06-26T19:00:00'));
    expect(setThemeMode).not.toHaveBeenCalled();
  });

  it('does not set theme if already correct', async () => {
    (getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'auto_dark_hour') return Promise.resolve('18-23');
      if (key === 'theme_mode') return Promise.resolve('system');
      return Promise.resolve(null);
    });
    await startAutoTheme();
    (setThemeMode as unknown as jest.Mock).mockClear();
    (getThemeMode as unknown as jest.Mock).mockReturnValue('dark');
    await _evaluate(new Date('2026-06-26T19:00:00'));
    expect(setThemeMode).not.toHaveBeenCalled();
  });
});
