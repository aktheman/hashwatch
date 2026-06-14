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

async function pollMiner(miner: MinerRow): Promise<void> {
  const url = `http://${miner.ip}:${miner.port}/api/system/info`;
  const data = await fetchJson(url);

  const isOnline = !!data;
  const temperature = typeof data?.temperature === 'number' ? data.temperature : 0;
  const hashRate = typeof data?.hashRate === 'number' ? data.hashRate : 0;

  checkMinerStatus(miner.userid, miner.id, miner.name, miner.ip, isOnline, temperature, hashRate);
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
