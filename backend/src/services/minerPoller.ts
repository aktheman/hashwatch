import { query } from '../db';
import { checkMinerStatus } from './minerMonitor';
import { broadcast } from '../ws';

interface MinerRow {
  id: string;
  userid: string;
  name: string;
  ip: string;
  port: number;
}

const POLL_INTERVAL = 60_000;
const TIMEOUT = 5000;

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT).unref();
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function extractPool(info: unknown, status: unknown): string | null {
  const infoObj = info as Record<string, unknown> | null;
  const statusObj = status as Record<string, unknown> | null;
  const fromStatus = typeof statusObj?.pool === 'string' && statusObj.pool ? statusObj.pool : null;
  const fromInfo = typeof infoObj?.pool === 'string' && infoObj.pool ? infoObj.pool : null;
  const fromStratum =
    (typeof statusObj?.stratumURL === 'string' && statusObj.stratumURL) ||
    (typeof infoObj?.stratumURL === 'string' && infoObj.stratumURL);
  return fromStatus || fromInfo || fromStratum || null;
}

async function pollMiner(miner: MinerRow): Promise<void> {
  const infoUrl = `http://${miner.ip}:${miner.port}/api/system/info`;
  const statusUrl = `http://${miner.ip}:${miner.port}/api/system/status`;
  const [infoData, statusData] = await Promise.all([fetchJson(infoUrl), fetchJson(statusUrl)]);
  const isOnline = !!infoData || !!statusData;
  const status = statusData as Record<string, unknown> | null;
  const info = infoData as Record<string, unknown> | null;
  const temperature =
    typeof status?.temperature === 'number'
      ? status.temperature
      : typeof info?.temperature === 'number'
        ? info.temperature
        : 0;
  const hashRate =
    typeof status?.hashRate === 'number'
      ? status.hashRate
      : typeof info?.hashRate === 'number'
        ? info.hashRate
        : 0;
  const pool = extractPool(info, status);

  checkMinerStatus(
    miner.userid,
    miner.id,
    miner.name,
    miner.ip,
    isOnline,
    temperature,
    hashRate,
    pool,
  );

  if (isOnline) {
    broadcast(miner.userid, {
      type: 'miner_update',
      miner: {
        id: miner.id,
        isOnline: true,
        lastSeen: Date.now(),
        status: {
          hashRate:
            (statusData as Record<string, unknown>)?.hashRate ??
            (infoData as Record<string, unknown>)?.hashRate ??
            0,
          hashRateUnit: (statusData as Record<string, unknown>)?.hashRateUnit ?? 'MH/s',
          temperature,
          vrTemp: (statusData as Record<string, unknown>)?.vrTemp ?? 0,
          voltage: (statusData as Record<string, unknown>)?.voltage ?? 0,
          current: (statusData as Record<string, unknown>)?.current ?? 0,
          power: (statusData as Record<string, unknown>)?.power ?? 0,
          sharesAccepted: (statusData as Record<string, unknown>)?.sharesAccepted ?? 0,
          sharesRejected: (statusData as Record<string, unknown>)?.sharesRejected ?? 0,
          bestDiff: ((statusData as Record<string, unknown>)?.bestDiff as string | undefined) ?? '',
          bestSessionDiff:
            ((statusData as Record<string, unknown>)?.bestSessionDiff as string | undefined) ?? '',
          uptimeSeconds: (statusData as Record<string, unknown>)?.uptimeSeconds ?? 0,
          coreVoltage: (statusData as Record<string, unknown>)?.coreVoltage ?? 0,
          frequency: (statusData as Record<string, unknown>)?.frequency ?? 0,
          fanSpeed: (statusData as Record<string, unknown>)?.fanSpeed ?? 0,
          fanRpm: (statusData as Record<string, unknown>)?.fanRpm ?? 0,
          pool: pool ?? '',
          poolPort: (statusData as Record<string, unknown>)?.poolPort ?? 0,
          poolUser: ((statusData as Record<string, unknown>)?.poolUser as string | undefined) ?? '',
          poolResponseTime: (statusData as Record<string, unknown>)?.poolResponseTime ?? 0,
        },
        info: {
          version: ((infoData as Record<string, unknown>)?.version as string | undefined) ?? '',
          hostname: ((infoData as Record<string, unknown>)?.hostname as string | undefined) ?? '',
          macAddr: ((infoData as Record<string, unknown>)?.macAddr as string | undefined) ?? '',
          ip: miner.ip,
          chipType: ((infoData as Record<string, unknown>)?.chipType as string | undefined) ?? '',
          ssid: ((infoData as Record<string, unknown>)?.ssid as string | undefined) ?? '',
          wifiSignal: (infoData as Record<string, unknown>)?.wifiSignal ?? 0,
          powerMode: (infoData as Record<string, unknown>)?.powerMode ?? 0,
        },
      },
    });
  } else {
    broadcast(miner.userid, {
      type: 'miner_update',
      miner: { id: miner.id, isOnline: false, lastSeen: Date.now() },
    });
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startMinerPoller(): void {
  if (intervalHandle) return;
  console.log(`Miner poller started (every ${POLL_INTERVAL / 1000}s)`);
  pollAll();
  intervalHandle = setInterval(pollAll, POLL_INTERVAL).unref();
}

export function stopMinerPoller(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

async function pollAll(): Promise<void> {
  try {
    const result = await query('SELECT id, userId, name, ip, port FROM miners');
    const miners: MinerRow[] = result.rows;
    await Promise.allSettled(miners.map(pollMiner));
  } catch {
    // db query failed, skip this cycle
  }
}
