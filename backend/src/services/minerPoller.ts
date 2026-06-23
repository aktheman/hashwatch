import { query } from '../db';
import { checkMinerStatus } from './minerMonitor';

interface MinerRow {
  id: string;
  userid: string;
  name: string;
  ip: string;
  port: number;
}

const POLL_INTERVAL = 60_000;
const TIMEOUT = 5000;

async function fetchJson(url: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function extractPool(info: any, status: any): string | null {
  const fromStatus = typeof status?.pool === 'string' && status.pool ? status.pool : null;
  const fromInfo = typeof info?.pool === 'string' && info.pool ? info.pool : null;
  const fromStratum =
    (typeof status?.stratumURL === 'string' && status.stratumURL) ||
    (typeof info?.stratumURL === 'string' && info.stratumURL);
  return fromStatus || fromInfo || fromStratum || null;
}

async function pollMiner(miner: MinerRow): Promise<void> {
  const infoUrl = `http://${miner.ip}:${miner.port}/api/system/info`;
  const statusUrl = `http://${miner.ip}:${miner.port}/api/system/status`;

  const [infoData, statusData] = await Promise.all([fetchJson(infoUrl), fetchJson(statusUrl)]);
  const isOnline = !!infoData || !!statusData;
  const temperature =
    typeof statusData?.temperature === 'number'
      ? statusData.temperature
      : typeof infoData?.temperature === 'number'
        ? infoData.temperature
        : 0;
  const hashRate =
    typeof statusData?.hashRate === 'number'
      ? statusData.hashRate
      : typeof infoData?.hashRate === 'number'
        ? infoData.hashRate
        : 0;
  const pool = extractPool(infoData, statusData);

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
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startMinerPoller(): void {
  if (intervalHandle) return;
  console.log(`Miner poller started (every ${POLL_INTERVAL / 1000}s)`);
  pollAll();
  intervalHandle = setInterval(pollAll, POLL_INTERVAL);
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
