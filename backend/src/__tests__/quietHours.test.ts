const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));

import {
  parseTimeToMinutes,
  formatMinutesToTime,
  minutesInWindow,
  localMinutesNow,
  isCriticalEvent,
  isQuietHoursActive,
  getQuietHoursSettings,
  clearQuietHoursCache,
  DEFAULT_QUIET_HOURS,
} from '../utils/quietHours';

beforeEach(() => {
  jest.clearAllMocks();
  clearQuietHoursCache();
});

describe('parseTimeToMinutes', () => {
  it('parses valid times', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('22:30')).toBe(22 * 60 + 30);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('rejects invalid times', () => {
    expect(parseTimeToMinutes('24:00')).toBeNull();
    expect(parseTimeToMinutes('12:60')).toBeNull();
    expect(parseTimeToMinutes('abc')).toBeNull();
    expect(parseTimeToMinutes('')).toBeNull();
  });
});

describe('formatMinutesToTime', () => {
  it('formats minutes as HH:MM', () => {
    expect(formatMinutesToTime(0)).toBe('00:00');
    expect(formatMinutesToTime(1350)).toBe('22:30');
    expect(formatMinutesToTime(1440)).toBe('00:00');
    expect(formatMinutesToTime(-30)).toBe('23:30');
  });
});

describe('minutesInWindow', () => {
  it('handles a same-day window', () => {
    expect(minutesInWindow(10 * 60, 8 * 60, 18 * 60)).toBe(true);
    expect(minutesInWindow(19 * 60, 8 * 60, 18 * 60)).toBe(false);
  });

  it('handles an overnight window', () => {
    expect(minutesInWindow(23 * 60, 22 * 60, 7 * 60)).toBe(true);
    expect(minutesInWindow(2 * 60, 22 * 60, 7 * 60)).toBe(true);
    expect(minutesInWindow(12 * 60, 22 * 60, 7 * 60)).toBe(false);
  });

  it('treats equal start/end as no window', () => {
    expect(minutesInWindow(12 * 60, 12 * 60, 12 * 60)).toBe(false);
  });
});

describe('localMinutesNow', () => {
  it('applies the UTC offset', () => {
    const date = new Date('2026-08-07T22:30:00Z');
    expect(localMinutesNow(120, date)).toBe(30);
    expect(localMinutesNow(-120, date)).toBe(22 * 60 + 30 - 120);
  });

  it('wraps around midnight', () => {
    const date = new Date('2026-08-07T23:30:00Z');
    expect(localMinutesNow(120, date)).toBe(90);
  });
});

describe('isCriticalEvent', () => {
  it('classifies critical and non-critical events', () => {
    expect(isCriticalEvent('offline')).toBe(true);
    expect(isCriticalEvent('hot')).toBe(true);
    expect(isCriticalEvent('share_rejection')).toBe(true);
    expect(isCriticalEvent('online')).toBe(false);
    expect(isCriticalEvent('team_join')).toBe(false);
  });
});

describe('getQuietHoursSettings', () => {
  it('returns defaults when nothing is stored', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const settings = await getQuietHoursSettings('u1');
    expect(settings).toEqual(DEFAULT_QUIET_HOURS);
  });

  it('parses stored values', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { key: 'quiet_hours_enabled', value: 'true' },
        { key: 'quiet_hours_start', value: '21:30' },
        { key: 'quiet_hours_end', value: '06:00' },
        { key: 'quiet_hours_utc_offset', value: '120' },
        { key: 'quiet_hours_allow_critical', value: 'false' },
      ],
    });
    const settings = await getQuietHoursSettings('u1');
    expect(settings).toEqual({
      enabled: true,
      start: '21:30',
      end: '06:00',
      utcOffsetMinutes: 120,
      allowCritical: false,
    });
  });

  it('caches the result', async () => {
    mockQuery.mockResolvedValue({ rows: [{ key: 'quiet_hours_enabled', value: 'true' }] });
    await getQuietHoursSettings('u1');
    await getQuietHoursSettings('u1');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});

describe('isQuietHoursActive', () => {
  const now = (h: number, m: number) => {
    const d = new Date('2026-08-07T00:00:00Z');
    d.setUTCHours(h, m, 0, 0);
    return d;
  };

  function withEnabled() {
    mockQuery.mockResolvedValue({
      rows: [
        { key: 'quiet_hours_enabled', value: 'true' },
        { key: 'quiet_hours_start', value: '22:00' },
        { key: 'quiet_hours_end', value: '07:00' },
        { key: 'quiet_hours_utc_offset', value: '0' },
        { key: 'quiet_hours_allow_critical', value: 'true' },
      ],
    });
  }

  it('returns false when quiet hours are disabled', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ key: 'quiet_hours_enabled', value: 'false' }],
    });
    expect(await isQuietHoursActive('u1', { now: now(23, 0) })).toBe(false);
  });

  it('returns true inside the window', async () => {
    withEnabled();
    expect(await isQuietHoursActive('u1', { now: now(23, 0) })).toBe(true);
    expect(await isQuietHoursActive('u1', { now: now(3, 30) })).toBe(true);
  });

  it('returns false outside the window', async () => {
    withEnabled();
    expect(await isQuietHoursActive('u1', { now: now(12, 0) })).toBe(false);
  });

  it('allows critical events when allowCritical is on', async () => {
    withEnabled();
    expect(await isQuietHoursActive('u1', { now: now(23, 0), eventType: 'offline' })).toBe(false);
  });

  it('suppresses critical events when allowCritical is off', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { key: 'quiet_hours_enabled', value: 'true' },
        { key: 'quiet_hours_start', value: '22:00' },
        { key: 'quiet_hours_end', value: '07:00' },
        { key: 'quiet_hours_allow_critical', value: 'false' },
      ],
    });
    expect(await isQuietHoursActive('u1', { now: now(23, 0), eventType: 'offline' })).toBe(true);
  });

  it('suppresses non-critical events regardless of allowCritical', async () => {
    withEnabled();
    expect(await isQuietHoursActive('u1', { now: now(23, 0), eventType: 'online' })).toBe(true);
  });
});
