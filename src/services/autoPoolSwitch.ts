import { Miner } from '../types';
import { recommendPools, analyzePoolPerformance } from '../utils/poolRecommendation';
import { getSetting, setSetting } from '../db/database';
import { BitAxeClient } from '../api/bitaxe';

const LAST_SWITCH_KEY = 'auto_pool_last_switch';

export async function shouldAutoSwitch(): Promise<boolean> {
  const enabled = await getSetting('auto_pool_switch');
  return enabled === 'true';
}

const POOL_PORT_MAP: Record<string, number> = {
  'solo.ckpool.org': 3333,
  'stratum.slushpool.com': 3333,
  'pool.ckpool.org': 3333,
  'stratum.luckpool.net': 3333,
  'pool.braiins.com': 3333,
  'ss.antpool.com': 3333,
};

export async function performAutoSwitch(
  miners: Miner[],
): Promise<{ minerId: string; from: string; to: string }[]> {
  if (!(await shouldAutoSwitch())) return [];

  const changes: { minerId: string; from: string; to: string }[] = [];
  const recommendations = recommendPools(miners);
  if (recommendations.length === 0) return [];

  const poolStats = analyzePoolPerformance(miners);
  const worstPools = Object.entries(poolStats)
    .filter(([, stats]) => stats.avgRejectionRate >= 0.1)
    .sort((a, b) => b[1].avgRejectionRate - a[1].avgRejectionRate);

  if (worstPools.length === 0) return [];

  const bestRec = recommendations[0];
  if (!bestRec) return [];

  const targetPool = bestRec.pool;
  const targetPort = POOL_PORT_MAP[targetPool] ?? 3333;

  for (const [poolKey] of worstPools) {
    const affectedMiners = miners.filter((m) => {
      const minerPool = m.status?.pool ?? '';
      const stripped = minerPool
        .replace(/^stratum\+tcp:\/\//, '')
        .replace(/^stratum\+ssl:\/\//, '');
      const host = stripped.split(':')[0] || stripped;
      return host === poolKey || host.endsWith('.' + poolKey);
    });

    for (const miner of affectedMiners) {
      if (!miner.isOnline || !miner.status) continue;

      const currentPool = miner.status.pool
        .replace(/^stratum\+tcp:\/\//, '')
        .replace(/^stratum\+ssl:\/\//, '')
        .split(':')[0];

      if (currentPool === targetPool) continue;

      const client = new BitAxeClient(
        miner.ip,
        miner.port,
        miner.apiPath || undefined,
        miner.statusPath || undefined,
      );

      const user = miner.status.poolUser;
      const ok = await client.setPool(targetPool, targetPort, user);
      if (ok) {
        changes.push({
          minerId: miner.id,
          from: currentPool,
          to: targetPool,
        });
      }
    }
  }

  if (changes.length > 0) {
    await setSetting(LAST_SWITCH_KEY, String(Date.now()));
  }

  return changes;
}

export async function getLastSwitchTimestamp(): Promise<number | null> {
  const raw = await getSetting(LAST_SWITCH_KEY);
  if (!raw) return null;
  const ts = parseInt(raw, 10);
  return isNaN(ts) ? null : ts;
}
