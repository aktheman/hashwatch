import * as DB from '../db/database';
import { checkForFirmwareUpdate } from './firmwareUpdate';
import { parseVersion, needsUpdate } from '../utils/version';
import { batchFlashOTA } from './otaFlash';
import { useMinerStore } from '../store/miners';

export interface FirmwareScheduleSettings {
  enabled: boolean;
  startHour: number;
  endHour: number;
  lastRunDay: string | null;
}

export interface ScheduleRunResult {
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: boolean;
  reason?: string;
}

const SETTINGS_KEY = 'firmware_auto_schedule';

export const DEFAULT_SCHEDULE: FirmwareScheduleSettings = {
  enabled: false,
  startHour: 0,
  endHour: 6,
  lastRunDay: null,
};

export const OFF_HOURS_PRESETS: Array<{ start: number; end: number; label: string }> = [
  { start: 0, end: 6, label: 'Midnight' },
  { start: 22, end: 6, label: 'Night' },
  { start: 0, end: 4, label: 'Deep Night' },
  { start: 12, end: 18, label: 'Afternoon' },
  { start: 18, end: 6, label: 'Evening' },
];

function clampHour(h: unknown): number {
  const n = Number(h);
  if (Number.isFinite(n) && n >= 0 && n <= 23) return Math.floor(n);
  return 0;
}

export async function getFirmwareScheduleSettings(): Promise<FirmwareScheduleSettings> {
  const raw = await DB.getSetting(SETTINGS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<FirmwareScheduleSettings>;
      return {
        ...DEFAULT_SCHEDULE,
        ...parsed,
        startHour: clampHour(parsed.startHour),
        endHour: clampHour(parsed.endHour),
        lastRunDay: typeof parsed.lastRunDay === 'string' ? parsed.lastRunDay : null,
      };
    } catch {
      return DEFAULT_SCHEDULE;
    }
  }
  return DEFAULT_SCHEDULE;
}

export async function setFirmwareScheduleSettings(
  settings: FirmwareScheduleSettings,
): Promise<void> {
  await DB.setSetting(SETTINGS_KEY, JSON.stringify(settings));
}

export function isInOffHours(
  settings: Pick<FirmwareScheduleSettings, 'startHour' | 'endHour'>,
  date: Date = new Date(),
): boolean {
  const hour = date.getHours();
  if (settings.startHour === settings.endHour) return hour === settings.startHour;
  if (settings.startHour < settings.endHour) {
    return hour >= settings.startHour && hour < settings.endHour;
  }
  return hour >= settings.startHour || hour < settings.endHour;
}

export function scheduleDateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export async function runScheduledFirmwareUpdate(
  date: Date = new Date(),
): Promise<ScheduleRunResult> {
  const settings = await getFirmwareScheduleSettings();
  if (!settings.enabled) {
    return { attempted: 0, succeeded: 0, failed: 0, skipped: true, reason: 'disabled' };
  }
  if (!isInOffHours(settings, date)) {
    return { attempted: 0, succeeded: 0, failed: 0, skipped: true, reason: 'not_off_hours' };
  }
  const todayKey = scheduleDateKey(date);
  if (settings.lastRunDay === todayKey) {
    return { attempted: 0, succeeded: 0, failed: 0, skipped: true, reason: 'already_ran' };
  }

  const latest = await checkForFirmwareUpdate('v0.0.0');
  if (!latest) {
    return { attempted: 0, succeeded: 0, failed: 0, skipped: true, reason: 'no_update' };
  }

  const miners = useMinerStore.getState().miners;
  const targets = miners.filter((m) => {
    if (!m.isOnline) return false;
    const current = parseVersion(m.info?.version ?? '');
    return current ? needsUpdate(current, latest.version) : false;
  });

  const results = await batchFlashOTA(targets, latest.downloadUrl, () => {}, undefined);
  const succeeded = results.filter((r) => r.success).length;
  await setFirmwareScheduleSettings({ ...settings, lastRunDay: todayKey });
  return {
    attempted: results.length,
    succeeded,
    failed: results.length - succeeded,
    skipped: false,
  };
}

export function __resetFirmwareScheduler(): void {}
