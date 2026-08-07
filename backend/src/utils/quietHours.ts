import { query } from '../db';

export const QUIET_HOURS_CACHE_TTL_MS = 30_000;

export const CRITICAL_EVENT_TYPES = new Set<string>(['offline', 'hot', 'share_rejection']);

export interface QuietHoursSettings {
  enabled: boolean;
  start: string;
  end: string;
  utcOffsetMinutes: number;
  allowCritical: boolean;
}

export const DEFAULT_QUIET_HOURS: QuietHoursSettings = {
  enabled: false,
  start: '22:00',
  end: '07:00',
  utcOffsetMinutes: 0,
  allowCritical: true,
};

export function parseTimeToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatMinutesToTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function minutesInWindow(
  nowMinutes: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  if (startMinutes === endMinutes) return false;
  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

export function localMinutesNow(utcOffsetMinutes: number, date: Date = new Date()): number {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (((utcMinutes + utcOffsetMinutes) % 1440) + 1440) % 1440;
}

export function isCriticalEvent(eventType: string): boolean {
  return CRITICAL_EVENT_TYPES.has(eventType);
}

const quietHoursCache = new Map<string, { data: QuietHoursSettings; ts: number }>();

export function clearQuietHoursCache(): void {
  quietHoursCache.clear();
}

export async function getQuietHoursSettings(userId: string): Promise<QuietHoursSettings> {
  const cached = quietHoursCache.get(userId);
  if (cached && Date.now() - cached.ts < QUIET_HOURS_CACHE_TTL_MS) {
    return cached.data;
  }
  let settings: QuietHoursSettings = { ...DEFAULT_QUIET_HOURS };
  try {
    const result = await query(
      `SELECT key, value FROM user_settings
       WHERE userId = $1 AND key IN ($2, $3, $4, $5, $6)`,
      [
        userId,
        'quiet_hours_enabled',
        'quiet_hours_start',
        'quiet_hours_end',
        'quiet_hours_utc_offset',
        'quiet_hours_allow_critical',
      ],
    );
    const values: Record<string, string> = {};
    for (const row of result.rows as Array<{ key: string; value: string }>) {
      values[row.key] = row.value;
    }
    settings = {
      enabled: values.quiet_hours_enabled === 'true',
      start: values.quiet_hours_start || DEFAULT_QUIET_HOURS.start,
      end: values.quiet_hours_end || DEFAULT_QUIET_HOURS.end,
      utcOffsetMinutes: Number(values.quiet_hours_utc_offset ?? 0) || 0,
      allowCritical: values.quiet_hours_allow_critical !== 'false',
    };
  } catch {
    // DB unavailable — fall through to defaults
  }
  quietHoursCache.set(userId, { data: settings, ts: Date.now() });
  return settings;
}

export async function isQuietHoursActive(
  userId: string,
  opts: { eventType?: string; now?: Date } = {},
): Promise<boolean> {
  const settings = await getQuietHoursSettings(userId);
  if (!settings.enabled) return false;

  const start = parseTimeToMinutes(settings.start);
  const end = parseTimeToMinutes(settings.end);
  if (start === null || end === null) return false;

  const nowMinutes = localMinutesNow(settings.utcOffsetMinutes, opts.now ?? new Date());
  if (!minutesInWindow(nowMinutes, start, end)) return false;

  if (opts.eventType && settings.allowCritical && isCriticalEvent(opts.eventType)) {
    return false;
  }
  return true;
}
