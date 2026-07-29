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
});
