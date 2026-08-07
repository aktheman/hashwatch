import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';
import { query } from '../db';
import { getQuietHoursSettings, clearQuietHoursCache } from '../utils/quietHours';

export const quietHoursRouter = Router();
quietHoursRouter.use(authMiddleware);

const timePattern = /^(\d{1,2}):(\d{2})$/;

const quietHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().refine((value) => {
    const m = timePattern.exec(value);
    if (!m) return false;
    return Number(m[1]) <= 23 && Number(m[2]) <= 59;
  }, 'start must be HH:MM'),
  end: z.string().refine((value) => {
    const m = timePattern.exec(value);
    if (!m) return false;
    return Number(m[1]) <= 23 && Number(m[2]) <= 59;
  }, 'end must be HH:MM'),
  utcOffsetMinutes: z.number().int().min(-840).max(840),
  allowCritical: z.boolean(),
});

const QUIET_HOURS_KEYS = [
  'quiet_hours_enabled',
  'quiet_hours_start',
  'quiet_hours_end',
  'quiet_hours_utc_offset',
  'quiet_hours_allow_critical',
] as const;

quietHoursRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const settings = await getQuietHoursSettings(req.userId as string);
    res.json(settings);
  } catch (err: unknown) {
    log.error('Error fetching quiet hours:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

quietHoursRouter.put('/', async (req: AuthRequest, res) => {
  try {
    const parsed = quietHoursSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' });
    }
    const { enabled, start, end, utcOffsetMinutes, allowCritical } = parsed.data;
    const values: Record<(typeof QUIET_HOURS_KEYS)[number], string> = {
      quiet_hours_enabled: String(enabled),
      quiet_hours_start: start,
      quiet_hours_end: end,
      quiet_hours_utc_offset: String(utcOffsetMinutes),
      quiet_hours_allow_critical: String(allowCritical),
    };
    for (const key of QUIET_HOURS_KEYS) {
      await query(
        `INSERT INTO user_settings (userId, key, value)
         VALUES ($1, $2, $3)
         ON CONFLICT (userId, key) DO UPDATE SET value = EXCLUDED.value`,
        [req.userId, key, values[key]],
      );
    }
    clearQuietHoursCache();
    res.json({ enabled, start, end, utcOffsetMinutes, allowCritical });
  } catch (err: unknown) {
    log.error('Error updating quiet hours:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
