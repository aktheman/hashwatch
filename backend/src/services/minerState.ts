export type MinerPoolStatus = {
  miner: string;
  pool: string | null;
  hashrate: number;
  lastSeen: number;
};

const snapshots = new Map<string, MinerPoolStatus>();

export function setPoolStatus(miner: string, status: MinerPoolStatus) {
  snapshots.set(miner, { ...status, hashrate: status.hashrate || 0, pool: status.pool || null });
}

export function getPoolStatus(miner: string): MinerPoolStatus {
  return (
    snapshots.get(miner) || {
      miner,
      pool: null,
      hashrate: 0,
      lastSeen: 0,
    }
  );
}

export function listPoolStats() {
  const out = new Map<
    string,
    { pool: string; minerCount: number; totalHashrate: number; miners: string[] }
  >();
  for (const entry of snapshots.values()) {
    const pool = entry.pool || 'unknown';
    const item = out.get(pool) || { pool, minerCount: 0, totalHashrate: 0, miners: [] as string[] };
    item.minerCount += 1;
    item.totalHashrate += entry.hashrate || 0;
    item.miners.push(entry.miner);
    out.set(pool, item);
  }
  return Array.from(out.values());
}

/** @internal testability helper */
export function resetPoolStatus() {
  snapshots.clear();
}
