import axios from 'axios';

export interface PoolStats {
  hashrate: number;
  hashrateUnit: string;
  workers: number;
  activeWorkers: number;
  earnings24h: number;
  earningsUnit: string;
  luck: number;
  payoutPending: number;
  lastPayout: number;
}

export interface PoolProvider {
  name: string;
  fetchStats(apiKey: string): Promise<PoolStats>;
  testConnection(apiKey: string): Promise<boolean>;
}

const TIMEOUT = 10000;

const zeroedStats: PoolStats = {
  hashrate: 0,
  hashrateUnit: 'TH/s',
  workers: 0,
  activeWorkers: 0,
  earnings24h: 0,
  earningsUnit: 'BTC',
  luck: 0,
  payoutPending: 0,
  lastPayout: 0,
};

function createProvider(
  name: string,
  baseUrl: string,
  fetchStatsImpl: (apiKey: string) => Promise<PoolStats>,
): PoolProvider {
  return {
    name,
    async fetchStats(apiKey: string): Promise<PoolStats> {
      try {
        return await fetchStatsImpl(apiKey);
      } catch {
        return { ...zeroedStats };
      }
    },
    async testConnection(apiKey: string): Promise<boolean> {
      try {
        await fetchStatsImpl(apiKey);
        return true;
      } catch {
        return false;
      }
    },
  };
}

const braiinsProvider: PoolProvider = createProvider(
  'braiins',
  'https://api.brains.com',
  async (apiKey: string): Promise<PoolStats> => {
    // TODO: Replace with actual Braiins Pool API endpoints
    // Docs: https://docs.brains.com/
    // GET https://api.brains.com/v2/accounting/btc/stats
    // GET https://api.brains.com/v2/workers
    const client = axios.create({
      baseURL: 'https://api.brains.com',
      timeout: TIMEOUT,
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const [statsRes, workersRes] = await Promise.all([
      client.get('/v2/accounting/btc/stats'),
      client.get('/v2/workers'),
    ]);

    const stats = statsRes.data;
    const workers = workersRes.data;

    return {
      hashrate: stats.hashrate ?? 0,
      hashrateUnit: 'TH/s',
      workers: workers.total ?? 0,
      activeWorkers: workers.active ?? 0,
      earnings24h: stats.earnings_24h ?? 0,
      earningsUnit: 'BTC',
      luck: stats.luck ?? 100,
      payoutPending: stats.pending_payout ?? 0,
      lastPayout: stats.last_payout ?? 0,
    };
  },
);

const luxorProvider: PoolProvider = createProvider(
  'luxor',
  'https://mining.luxor.tech/api',
  async (apiKey: string): Promise<PoolStats> => {
    // TODO: Replace with actual Luxor API endpoints
    // Docs: https://mining.luxor.tech/api
    // POST https://mining.luxor.tech/api/v2/pools/:pool/workers/summary
    // POST https://mining.luxor.tech/api/v2/pools/:pool/stats
    const client = axios.create({
      baseURL: 'https://mining.luxor.tech/api',
      timeout: TIMEOUT,
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const [workersRes, statsRes] = await Promise.all([
      client.post('/v2/pools/btc/workers/summary', {}),
      client.post('/v2/pools/btc/stats', {}),
    ]);

    const workers = workersRes.data;
    const stats = statsRes.data;

    return {
      hashrate: stats.hashrate ?? 0,
      hashrateUnit: 'TH/s',
      workers: workers.total_workers ?? 0,
      activeWorkers: workers.active_workers ?? 0,
      earnings24h: stats.revenue_24h ?? 0,
      earningsUnit: 'BTC',
      luck: stats.luck ?? 100,
      payoutPending: stats.pending_payout ?? 0,
      lastPayout: stats.last_payout ?? 0,
    };
  },
);

const viabtcProvider: PoolProvider = createProvider(
  'viabtc',
  'https://www.viabtc.com/api',
  async (apiKey: string): Promise<PoolStats> => {
    // TODO: Replace with actual ViaBTC API endpoints
    // Docs: https://www.viabtc.com/api-doc
    // GET https://www.viabtc.com/api/v1/account/stats?api_key=:key
    // GET https://www.viabtc.com/api/v1/account/workers?api_key=:key&coin=BTC
    const client = axios.create({
      baseURL: 'https://www.viabtc.com/api',
      timeout: TIMEOUT,
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const [statsRes, workersRes] = await Promise.all([
      client.get(`/v1/account/stats?api_key=${apiKey}`),
      client.get(`/v1/account/workers?api_key=${apiKey}&coin=BTC`),
    ]);

    const stats = statsRes.data?.data ?? statsRes.data;
    const workers = workersRes.data?.data ?? workersRes.data;

    return {
      hashrate: stats.hashrate ?? 0,
      hashrateUnit: 'TH/s',
      workers: workers.total ?? 0,
      activeWorkers: workers.active ?? 0,
      earnings24h: stats.income_24h ?? 0,
      earningsUnit: 'BTC',
      luck: stats.luck ?? 100,
      payoutPending: stats.unpaid ?? 0,
      lastPayout: stats.last_payout ?? 0,
    };
  },
);

const f2poolProvider: PoolProvider = createProvider(
  'f2pool',
  'https://api.f2pool.com',
  async (apiKey: string): Promise<PoolStats> => {
    // TODO: Replace with actual F2Pool API endpoints
    // Docs: https://github.com/f2pool/f2pool-api-docs
    // GET https://api.f2pool.com/v2/btc/account?token=:key
    // GET https://api.f2pool.com/v2/btc/workers?token=:key
    const client = axios.create({
      baseURL: 'https://api.f2pool.com',
      timeout: TIMEOUT,
      headers: { 'X-F2Pool-Token': apiKey },
    });

    const [accountRes, workersRes] = await Promise.all([
      client.get(`/v2/btc/account?token=${apiKey}`),
      client.get(`/v2/btc/workers?token=${apiKey}`),
    ]);

    const account = accountRes.data;
    const workers = workersRes.data;

    return {
      hashrate: account.hash_rate ?? 0,
      hashrateUnit: 'TH/s',
      workers: workers.total ?? 0,
      activeWorkers: workers.active ?? 0,
      earnings24h: account.income_24h ?? 0,
      earningsUnit: 'BTC',
      luck: account.luck ?? 100,
      payoutPending: account.unpaid ?? 0,
      lastPayout: account.last_payment_time ?? 0,
    };
  },
);

const poolinProvider: PoolProvider = createProvider(
  'poolin',
  'https://api.poolin.com',
  async (apiKey: string): Promise<PoolStats> => {
    // TODO: Replace with actual Poolin API endpoints
    // Docs: https://www.poolin.com/api
    // GET https://api.poolin.com/api/v1/accounts/stats?token=:key
    // GET https://api.poolin.com/api/v1/accounts/workers?token=:key
    const client = axios.create({
      baseURL: 'https://api.poolin.com',
      timeout: TIMEOUT,
      headers: { Authorization: `Token ${apiKey}` },
    });

    const [statsRes, workersRes] = await Promise.all([
      client.get(`/api/v1/accounts/stats?token=${apiKey}`),
      client.get(`/api/v1/accounts/workers?token=${apiKey}`),
    ]);

    const stats = statsRes.data?.results ?? statsRes.data;
    const workers = workersRes.data?.results ?? workersRes.data;

    return {
      hashrate: stats.hashrate ?? 0,
      hashrateUnit: 'TH/s',
      workers: workers.total ?? 0,
      activeWorkers: workers.active ?? 0,
      earnings24h: stats.income_24h ?? 0,
      earningsUnit: 'BTC',
      luck: stats.luck ?? 100,
      payoutPending: stats.unpaid ?? 0,
      lastPayout: stats.last_payout ?? 0,
    };
  },
);

const PROVIDERS: Record<string, PoolProvider> = {
  braiins: braiinsProvider,
  luxor: luxorProvider,
  viabtc: viabtcProvider,
  f2pool: f2poolProvider,
  poolin: poolinProvider,
};

export function getPoolProvider(name: string): PoolProvider | null {
  return PROVIDERS[name.toLowerCase()] ?? null;
}

export function getAvailableProviders(): string[] {
  return Object.keys(PROVIDERS);
}

export async function fetchAllPoolStats(
  providers: { name: string; apiKey: string }[],
): Promise<Record<string, PoolStats | null>> {
  const results: Record<string, PoolStats | null> = {};

  const tasks = providers.map(async ({ name, apiKey }) => {
    const provider = PROVIDERS[name.toLowerCase()];
    if (!provider) {
      results[name] = null;
      return;
    }

    try {
      results[name] = await provider.fetchStats(apiKey);
    } catch {
      results[name] = null;
    }
  });

  await Promise.allSettled(tasks);
  return results;
}
