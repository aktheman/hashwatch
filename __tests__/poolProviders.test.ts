jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
    })),
  },
}));

import axios from 'axios';
import {
  getAvailableProviders,
  getPoolProvider,
  fetchAllPoolStats,
} from '../src/services/poolProviders';

const mockAxiosCreate = axios.create as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockReset();
  mockPost.mockReset();
  mockAxiosCreate.mockReturnValue({ get: mockGet, post: mockPost });
});

describe('getAvailableProviders', () => {
  it('returns a list of provider names', () => {
    const providers = getAvailableProviders();
    expect(providers.length).toBeGreaterThan(0);
    expect(providers).toContain('braiins');
    expect(providers).toContain('luxor');
    expect(providers).toContain('viabtc');
    expect(providers).toContain('f2pool');
    expect(providers).toContain('poolin');
  });
});

describe('getPoolProvider', () => {
  it('returns provider by name', () => {
    const provider = getPoolProvider('braiins');
    expect(provider).not.toBeNull();
    expect(provider!.name).toBe('braiins');
  });

  it('returns null for unknown name', () => {
    expect(getPoolProvider('nonexistent')).toBeNull();
  });

  it('is case-insensitive', () => {
    const provider = getPoolProvider('Braiins');
    expect(provider).not.toBeNull();
    expect(provider!.name).toBe('braiins');
  });
});

describe('provider fetchStats implementations', () => {
  it('braiins maps account and worker responses into PoolStats', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          hashrate: 500,
          earnings_24h: 0.001,
          luck: 110,
          pending_payout: 0.0005,
          last_payout: 0.0003,
        },
      })
      .mockResolvedValueOnce({ data: { total: 10, active: 5 } });

    const stats = await getPoolProvider('braiins')!.fetchStats('key');

    expect(mockAxiosCreate).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: 'Bearer key' } }),
    );
    expect(stats).toEqual({
      hashrate: 500,
      hashrateUnit: 'TH/s',
      workers: 10,
      activeWorkers: 5,
      earnings24h: 0.001,
      earningsUnit: 'BTC',
      luck: 110,
      payoutPending: 0.0005,
      lastPayout: 0.0003,
    });
  });

  it('braiins falls back to zeroed stats when the API fails', async () => {
    mockGet.mockRejectedValue(new Error('boom'));

    const stats = await getPoolProvider('braiins')!.fetchStats('key');

    expect(stats).toEqual({
      hashrate: 0,
      hashrateUnit: 'TH/s',
      workers: 0,
      activeWorkers: 0,
      earnings24h: 0,
      earningsUnit: 'BTC',
      luck: 0,
      payoutPending: 0,
      lastPayout: 0,
    });
  });

  it('braiins defaults missing fields to zero', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { hashrate: 500 } })
      .mockResolvedValueOnce({ data: { total: 3 } });

    const stats = await getPoolProvider('braiins')!.fetchStats('key');

    expect(stats.hashrate).toBe(500);
    expect(stats.workers).toBe(3);
    expect(stats.activeWorkers).toBe(0);
    expect(stats.earnings24h).toBe(0);
    expect(stats.luck).toBe(100);
  });

  it('luxor posts to the summary and stats endpoints and maps responses', async () => {
    mockPost
      .mockResolvedValueOnce({ data: { total_workers: 8, active_workers: 4 } })
      .mockResolvedValueOnce({
        data: {
          hashrate: 600,
          revenue_24h: 0.002,
          luck: 90,
          pending_payout: 0.001,
          last_payout: 0.0002,
        },
      });

    const stats = await getPoolProvider('luxor')!.fetchStats('key');

    expect(mockPost).toHaveBeenCalledWith('/v2/pools/btc/workers/summary', {});
    expect(mockPost).toHaveBeenCalledWith('/v2/pools/btc/stats', {});
    expect(stats).toEqual({
      hashrate: 600,
      hashrateUnit: 'TH/s',
      workers: 8,
      activeWorkers: 4,
      earnings24h: 0.002,
      earningsUnit: 'BTC',
      luck: 90,
      payoutPending: 0.001,
      lastPayout: 0.0002,
    });
  });

  it('luxor falls back to zeroed stats when the API fails', async () => {
    mockPost.mockRejectedValue(new Error('boom'));

    const stats = await getPoolProvider('luxor')!.fetchStats('key');

    expect(stats.hashrate).toBe(0);
    expect(stats.workers).toBe(0);
  });

  it('viabtc unwraps the nested data field', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { data: { hashrate: 700, income_24h: 0.003, unpaid: 0.01, last_payout: 0.004 } },
      })
      .mockResolvedValueOnce({ data: { data: { total: 12, active: 6 } } });

    const stats = await getPoolProvider('viabtc')!.fetchStats('key');

    expect(mockAxiosCreate).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: 'Bearer key' } }),
    );
    expect(stats).toEqual({
      hashrate: 700,
      hashrateUnit: 'TH/s',
      workers: 12,
      activeWorkers: 6,
      earnings24h: 0.003,
      earningsUnit: 'BTC',
      luck: 100,
      payoutPending: 0.01,
      lastPayout: 0.004,
    });
  });

  it('viabtc uses top-level data when there is no nested data field', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { hashrate: 700, income_24h: 0.003 } })
      .mockResolvedValueOnce({ data: { total: 12, active: 6 } });

    const stats = await getPoolProvider('viabtc')!.fetchStats('key');

    expect(stats.hashrate).toBe(700);
    expect(stats.workers).toBe(12);
    expect(stats.earnings24h).toBe(0.003);
  });

  it('f2pool maps account fields and sends the token header', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          hash_rate: 800,
          income_24h: 0.004,
          luck: 100,
          unpaid: 0.005,
          last_payment_time: 0.0006,
        },
      })
      .mockResolvedValueOnce({ data: { total: 20, active: 10 } });

    const stats = await getPoolProvider('f2pool')!.fetchStats('key');

    expect(mockAxiosCreate).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'X-F2Pool-Token': 'key' } }),
    );
    expect(mockGet).toHaveBeenCalledWith('/v2/btc/account?token=key');
    expect(mockGet).toHaveBeenCalledWith('/v2/btc/workers?token=key');
    expect(stats).toEqual({
      hashrate: 800,
      hashrateUnit: 'TH/s',
      workers: 20,
      activeWorkers: 10,
      earnings24h: 0.004,
      earningsUnit: 'BTC',
      luck: 100,
      payoutPending: 0.005,
      lastPayout: 0.0006,
    });
  });

  it('poolin unwraps the results field', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { results: { hashrate: 900, income_24h: 0.005, unpaid: 0.02, last_payout: 0.007 } },
      })
      .mockResolvedValueOnce({ data: { results: { total: 30, active: 15 } } });

    const stats = await getPoolProvider('poolin')!.fetchStats('key');

    expect(mockAxiosCreate).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: 'Token key' } }),
    );
    expect(stats).toEqual({
      hashrate: 900,
      hashrateUnit: 'TH/s',
      workers: 30,
      activeWorkers: 15,
      earnings24h: 0.005,
      earningsUnit: 'BTC',
      luck: 100,
      payoutPending: 0.02,
      lastPayout: 0.007,
    });
  });

  it('poolin falls back to zeroed stats when the API fails', async () => {
    mockGet.mockRejectedValue(new Error('boom'));

    const stats = await getPoolProvider('poolin')!.fetchStats('key');

    expect(stats.hashrate).toBe(0);
    expect(stats.workers).toBe(0);
  });
});

describe('testConnection', () => {
  it('returns true when fetchStats succeeds', async () => {
    mockGet.mockResolvedValue({ data: { hashrate: 1 } });

    expect(await getPoolProvider('braiins')!.testConnection('key')).toBe(true);
  });

  it('returns false when fetchStats fails', async () => {
    mockGet.mockRejectedValue(new Error('down'));

    expect(await getPoolProvider('braiins')!.testConnection('key')).toBe(false);
  });
});

describe('fetchAllPoolStats', () => {
  it('returns stats for known providers', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          hashrate: 500,
          earnings_24h: 0.001,
          luck: 110,
          pending_payout: 0.0005,
          last_payout: 0.0003,
        },
      })
      .mockResolvedValueOnce({ data: { total: 10, active: 5 } });

    const results = await fetchAllPoolStats([{ name: 'braiins', apiKey: 'key1' }]);
    expect(results['braiins']).not.toBeNull();
    expect(results['braiins']!.hashrate).toBe(500);
  });

  it('returns null for unknown provider', async () => {
    const results = await fetchAllPoolStats([{ name: 'unknown', apiKey: 'key1' }]);
    expect(results['unknown']).toBeNull();
  });

  it('handles errors gracefully', async () => {
    mockGet.mockRejectedValue(new Error('API error'));
    const results = await fetchAllPoolStats([{ name: 'braiins', apiKey: 'key1' }]);
    expect(results['braiins']).not.toBeNull();
    expect(results['braiins']!.hashrate).toBe(0);
  });

  it('returns an empty object for an empty providers list', async () => {
    const results = await fetchAllPoolStats([]);
    expect(results).toEqual({});
  });

  it('handles a mix of known and unknown providers', async () => {
    mockGet.mockResolvedValue({ data: { hashrate: 500 } });

    const results = await fetchAllPoolStats([
      { name: 'braiins', apiKey: 'k1' },
      { name: 'ghost', apiKey: 'k2' },
    ]);

    expect(results['braiins']!.hashrate).toBe(500);
    expect(results['ghost']).toBeNull();
  });

  it('fetches multiple known providers in parallel', async () => {
    mockGet.mockResolvedValue({
      data: { hashrate: 500, hash_rate: 500, total: 10, active: 5 },
    });

    const results = await fetchAllPoolStats([
      { name: 'braiins', apiKey: 'k1' },
      { name: 'f2pool', apiKey: 'k2' },
    ]);

    expect(results['braiins']!.hashrate).toBe(500);
    expect(results['f2pool']!.hashrate).toBe(500);
    expect(mockAxiosCreate).toHaveBeenCalledTimes(2);
  });

  it('keeps stats for other providers when one fails', async () => {
    mockGet.mockResolvedValue({ data: { hashrate: 500 } });

    const results = await fetchAllPoolStats([
      { name: 'ghost', apiKey: 'k1' },
      { name: 'braiins', apiKey: 'k2' },
    ]);

    expect(results['ghost']).toBeNull();
    expect(results['braiins']!.hashrate).toBe(500);
  });
});
