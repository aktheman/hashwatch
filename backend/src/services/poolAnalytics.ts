export interface PoolStats {
  provider: string;
  hashrate: number;
  hashrateUnit: string;
  btcEarned: number;
  usdEarned: number;
  luck: number;
  activeWorkers: number;
  lastUpdated: number;
}

const TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBraiinsStats(workingUser: string): Promise<PoolStats | null> {
  try {
    const res = await fetchWithTimeout('https://api.braiins.com/v1/account/stats', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${workingUser}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return {
      provider: 'braiins',
      hashrate: Number(data.hashrate ?? 0),
      hashrateUnit: String(data.hashrateUnit ?? 'TH/s'),
      btcEarned: Number(data.btcEarned ?? data.earnings ?? 0),
      usdEarned: Number(data.usdEarned ?? 0),
      luck: Number(data.luck ?? 100),
      activeWorkers: Number(data.activeWorkers ?? data.workers ?? 0),
      lastUpdated: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function fetchLuxorStats(apiKey: string, poolUser: string): Promise<PoolStats | null> {
  try {
    const res = await fetchWithTimeout('https://mining.luxor.tech/api/v2/account', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'x-lux-user': poolUser,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return {
      provider: 'luxor',
      hashrate: Number(data.hashrate ?? 0),
      hashrateUnit: String(data.hashrateUnit ?? 'TH/s'),
      btcEarned: Number(data.btcEarned ?? data.earnings ?? 0),
      usdEarned: Number(data.usdEarned ?? 0),
      luck: Number(data.luck ?? 100),
      activeWorkers: Number(data.activeWorkers ?? data.workers ?? 0),
      lastUpdated: Date.now(),
    };
  } catch {
    return null;
  }
}
