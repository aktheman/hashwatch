import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

export const alertRulesRouter = Router();
alertRulesRouter.use(authMiddleware);

async function verifyMinerOwnership(minerId: string, userId: string): Promise<boolean> {
  const result = await query('SELECT id FROM miners WHERE id = $1 AND userId = $2', [
    minerId,
    userId,
  ]);
  return result.rows.length > 0;
}

export interface MinerAlertRule {
  enabled: boolean;
  tempthreshold: number;
  hashratedroppercent: number;
  offlinereminderminutes: number;
  uptimethresholdhours: number;
  sharerejectionpercent: number;
}

const DEFAULT_RULE: MinerAlertRule = {
  enabled: true,
  tempthreshold: 70,
  hashratedroppercent: 50,
  offlinereminderminutes: 5,
  uptimethresholdhours: 24,
  sharerejectionpercent: 10,
};

alertRulesRouter.get('/:minerId', async (req: AuthRequest, res) => {
  const minerId = req.params.minerId as string;
  if (!(await verifyMinerOwnership(minerId, req.userId as string))) {
    return res.status(404).json({ error: 'miner not found' });
  }
  const result = await query(
    'SELECT enabled, tempThreshold, hashrateDropPercent, offlineReminderMinutes, uptimeThresholdHours, shareRejectionPercent FROM miner_alert_rules WHERE userId = $1 AND minerId = $2',
    [req.userId as string, minerId],
  );
  if (result.rows.length === 0) {
    return res.json({
      enabled: true,
      tempThreshold: 70,
      hashrateDropPercent: 50,
      offlineReminderMinutes: 5,
      uptimeThresholdHours: 24,
      shareRejectionPercent: 10,
    });
  }
  const row = result.rows[0] as MinerAlertRule;
  res.json({
    enabled: row.enabled,
    tempThreshold: row.tempthreshold,
    hashrateDropPercent: row.hashratedroppercent,
    offlineReminderMinutes: row.offlinereminderminutes,
    uptimeThresholdHours: row.uptimethresholdhours,
    shareRejectionPercent: row.sharerejectionpercent,
  });
});

alertRulesRouter.put('/:minerId', async (req: AuthRequest, res) => {
  try {
    const minerId = req.params.minerId as string;
    if (!(await verifyMinerOwnership(minerId, req.userId as string))) {
      return res.status(404).json({ error: 'miner not found' });
    }
    const {
      tempThreshold,
      hashrateDropPercent,
      offlineReminderMinutes,
      uptimeThresholdHours,
      shareRejectionPercent,
      enabled,
    } = req.body;

    if (
      tempThreshold !== undefined &&
      (typeof tempThreshold !== 'number' || tempThreshold < 0 || tempThreshold > 200)
    ) {
      return res.status(400).json({ error: 'tempThreshold must be a number between 0 and 200' });
    }
    if (
      hashrateDropPercent !== undefined &&
      (typeof hashrateDropPercent !== 'number' ||
        hashrateDropPercent < 0 ||
        hashrateDropPercent > 100)
    ) {
      return res
        .status(400)
        .json({ error: 'hashrateDropPercent must be a number between 0 and 100' });
    }
    if (
      offlineReminderMinutes !== undefined &&
      (typeof offlineReminderMinutes !== 'number' ||
        offlineReminderMinutes < 0 ||
        offlineReminderMinutes > 1440)
    ) {
      return res
        .status(400)
        .json({ error: 'offlineReminderMinutes must be a number between 0 and 1440' });
    }
    if (
      uptimeThresholdHours !== undefined &&
      (typeof uptimeThresholdHours !== 'number' ||
        uptimeThresholdHours < 0 ||
        uptimeThresholdHours > 8760)
    ) {
      return res
        .status(400)
        .json({ error: 'uptimeThresholdHours must be a number between 0 and 8760' });
    }
    if (
      shareRejectionPercent !== undefined &&
      (typeof shareRejectionPercent !== 'number' ||
        shareRejectionPercent < 0 ||
        shareRejectionPercent > 100)
    ) {
      return res
        .status(400)
        .json({ error: 'shareRejectionPercent must be a number between 0 and 100' });
    }

    await query(
      `INSERT INTO miner_alert_rules (userId, minerId, tempThreshold, hashrateDropPercent, offlineReminderMinutes, uptimeThresholdHours, shareRejectionPercent, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (userId, minerId) DO UPDATE SET
         tempThreshold = $3,
         hashrateDropPercent = $4,
         offlineReminderMinutes = $5,
         uptimeThresholdHours = $6,
         shareRejectionPercent = $7,
         enabled = $8`,
      [
        req.userId as string,
        minerId,
        tempThreshold ?? 70,
        hashrateDropPercent ?? 50,
        offlineReminderMinutes ?? 5,
        uptimeThresholdHours ?? 24,
        shareRejectionPercent ?? 10,
        enabled ?? true,
      ],
    );
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error updating alert rule:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
