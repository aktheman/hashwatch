import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { log } from '../logger';

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

alertRulesRouter.get('/:minerId', async (req: AuthRequest, res) => {
  try {
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
  } catch (err: unknown) {
    log.error('Error fetching alert rule:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
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
      (!Number.isFinite(tempThreshold) || tempThreshold < 0 || tempThreshold > 200)
    ) {
      return res.status(400).json({ error: 'tempThreshold must be a number between 0 and 200' });
    }
    if (
      hashrateDropPercent !== undefined &&
      (!Number.isFinite(hashrateDropPercent) ||
        hashrateDropPercent < 0 ||
        hashrateDropPercent > 100)
    ) {
      return res
        .status(400)
        .json({ error: 'hashrateDropPercent must be a number between 0 and 100' });
    }
    if (
      offlineReminderMinutes !== undefined &&
      (!Number.isFinite(offlineReminderMinutes) ||
        offlineReminderMinutes < 0 ||
        offlineReminderMinutes > 1440)
    ) {
      return res
        .status(400)
        .json({ error: 'offlineReminderMinutes must be a number between 0 and 1440' });
    }
    if (
      uptimeThresholdHours !== undefined &&
      (!Number.isFinite(uptimeThresholdHours) ||
        uptimeThresholdHours < 0 ||
        uptimeThresholdHours > 8760)
    ) {
      return res
        .status(400)
        .json({ error: 'uptimeThresholdHours must be a number between 0 and 8760' });
    }
    if (
      shareRejectionPercent !== undefined &&
      (!Number.isFinite(shareRejectionPercent) ||
        shareRejectionPercent < 0 ||
        shareRejectionPercent > 100)
    ) {
      return res
        .status(400)
        .json({ error: 'shareRejectionPercent must be a number between 0 and 100' });
    }

    const existingResult = await query(
      'SELECT tempThreshold, hashrateDropPercent, offlineReminderMinutes, uptimeThresholdHours, shareRejectionPercent, enabled FROM miner_alert_rules WHERE userId = $1 AND minerId = $2',
      [req.userId as string, minerId],
    );
    const existing = existingResult.rows[0] as Partial<MinerAlertRule> | undefined;

    const merged = {
      tempThreshold: tempThreshold ?? existing?.tempthreshold ?? 70,
      hashrateDropPercent: hashrateDropPercent ?? existing?.hashratedroppercent ?? 50,
      offlineReminderMinutes: offlineReminderMinutes ?? existing?.offlinereminderminutes ?? 5,
      uptimeThresholdHours: uptimeThresholdHours ?? existing?.uptimethresholdhours ?? 24,
      shareRejectionPercent: shareRejectionPercent ?? existing?.sharerejectionpercent ?? 10,
      enabled: enabled ?? existing?.enabled ?? true,
    };

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
        merged.tempThreshold,
        merged.hashrateDropPercent,
        merged.offlineReminderMinutes,
        merged.uptimeThresholdHours,
        merged.shareRejectionPercent,
        merged.enabled,
      ],
    );
    res.json({ ok: true });
  } catch (err: unknown) {
    log.error('Error updating alert rule:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
