import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

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
}

const DEFAULT_RULE: MinerAlertRule = {
  enabled: true,
  tempthreshold: 70,
  hashratedroppercent: 50,
  offlinereminderminutes: 5,
  uptimethresholdhours: 24,
};

alertRulesRouter.get('/:minerId', async (req: AuthRequest, res) => {
  const minerId = req.params.minerId as string;
  if (!(await verifyMinerOwnership(minerId, req.userId as string))) {
    return res.status(404).json({ error: 'miner not found' });
  }
  const result = await query(
    'SELECT enabled, tempThreshold, hashrateDropPercent, offlineReminderMinutes, uptimeThresholdHours FROM miner_alert_rules WHERE userId = $1 AND minerId = $2',
    [req.userId as string, minerId],
  );
  if (result.rows.length === 0) {
    return res.json({ ...DEFAULT_RULE });
  }
  const row = result.rows[0] as MinerAlertRule;
  res.json({
    enabled: row.enabled,
    tempThreshold: row.tempthreshold,
    hashrateDropPercent: row.hashratedroppercent,
    offlineReminderMinutes: row.offlinereminderminutes,
    uptimeThresholdHours: row.uptimethresholdhours,
  });
});

alertRulesRouter.put('/:minerId', async (req: AuthRequest, res) => {
  const minerId = req.params.minerId as string;
  if (!(await verifyMinerOwnership(minerId, req.userId as string))) {
    return res.status(404).json({ error: 'miner not found' });
  }
  const {
    tempThreshold,
    hashrateDropPercent,
    offlineReminderMinutes,
    uptimeThresholdHours,
    enabled,
  } = req.body;
  await query(
    `INSERT INTO miner_alert_rules (userId, minerId, tempThreshold, hashrateDropPercent, offlineReminderMinutes, uptimeThresholdHours, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (userId, minerId) DO UPDATE SET
       tempThreshold = $3,
       hashrateDropPercent = $4,
       offlineReminderMinutes = $5,
       uptimeThresholdHours = $6,
       enabled = $7`,
    [
      req.userId as string,
      minerId,
      tempThreshold ?? 70,
      hashrateDropPercent ?? 50,
      offlineReminderMinutes ?? 5,
      uptimeThresholdHours ?? 24,
      enabled ?? true,
    ],
  );
  res.json({ ok: true });
});
