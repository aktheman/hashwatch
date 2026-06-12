import { query } from '../db';
import {
  sendMinerOfflineNotification,
  sendMinerOnlineNotification,
  sendMinerHotNotification,
  sendHashrateDropNotification,
} from './pushNotifications';

interface MinerRow {
  id: string;
  userid: string;
  name: string;
  ip: string;
  port: number;
}

const POLL_INTERVAL = 60_000;
const TIMEOUT = 5000;

interface MinerState {
  isOnline: boolean;
  temperature: number;
  hashRate: number;
  pool: string | null;
}

const states = new Map<string, MinerState>();

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

function probePaths(ip: string, port: number): { info: string; status: string } {
  return {
    info: `http://${ip}:${port}/api/system/info`,
    status: `http://${ip}:${port}/api/system/info`,
  };
}

async function pollMiner(miner: MinerRow): Promise<void> {
  const key = `${miner.userid}:${miner.id}`;
  const paths = probePaths(miner.ip, miner.port);
  const data = await fetchJson(paths.status);

  if (!data) {
    const prev = states.get(key);
    if (prev?.isOnline !== false) {
      sendMinerOfflineNotification(miner.userid, miner.name, miner.ip, miner.id);
    }
    states.set(key, { isOnline: false, temperature: 0, hashRate: 0, pool: null });
    return;
  }

  const hashRate = typeof data.hashRate === 'number' ? data.hashRate : 0;
  const temperature = typeof data.temperature === 'number' ? data.temperature : 0;
  const pool = typeof data.pool === 'string' && data.pool ? data.pool : null;

  const prev = states.get(key);

  if (!prev || (!prev.isOnline && hashRate > 0)) {
    sendMinerOnlineNotification(miner.userid, miner.name, miner.ip, miner.id);
  }

  if (temperature > 70 && (!prev || prev.temperature <= 70)) {
    sendMinerHotNotification(miner.userid, miner.name, miner.ip, temperature, miner.id);
  }

  const prevHr = prev?.hashRate ?? 0;
  if (prevHr > hashRate * 2 && hashRate > 0) {
    const pct = Math.round((1 - hashRate / prevHr) * 100);
    sendHashrateDropNotification(miner.userid, miner.name, miner.id, pct);
  }

  states.set(key, { isOnline: true, temperature, hashRate, pool });
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
