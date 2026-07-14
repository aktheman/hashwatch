import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: Request & { userId?: string }, _res: Response, next: NextFunction) => {
    req.userId = 'test-user-id';
    next();
  },
  generateToken: (uid: string) => `token-${uid}`,
}));

const mockFetchBraiins = jest.fn();
const mockFetchLuxor = jest.fn();
jest.mock('../services/poolAnalytics', () => ({
  fetchBraiinsStats: (...args: unknown[]) => mockFetchBraiins(...args),
  fetchLuxorStats: (...args: unknown[]) => mockFetchLuxor(...args),
}));

import { poolAnalyticsRouter } from '../routes/poolAnalytics';

const app = express();
app.use(express.json());
app.use('/api/pool-analytics', poolAnalyticsRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/pool-analytics/config', () => {
  it('returns pool configs for user', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, provider: 'braiins', apikey: 'key1', pooluser: 'user1', enabled: true }],
    });

    const res = await request(app).get('/api/pool-analytics/config');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('pool_configs'), [
      'test-user-id',
    ]);
  });

  it('returns empty array when no configs', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/pool-analytics/config');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/pool-analytics/config', () => {
  it('creates a braiins config', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, provider: 'braiins', apikey: 'mykey', pooluser: 'myuser', enabled: true }],
    });

    const res = await request(app)
      .post('/api/pool-analytics/config')
      .send({ provider: 'braiins', apiKey: 'mykey', poolUser: 'myuser' });

    expect(res.status).toBe(200);
    expect(res.body.provider).toBe('braiins');
  });

  it('creates a luxor config', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, provider: 'luxor', apikey: 'lk', pooluser: 'lu', enabled: true }],
    });

    const res = await request(app)
      .post('/api/pool-analytics/config')
      .send({ provider: 'luxor', apiKey: 'lk', poolUser: 'lu' });

    expect(res.status).toBe(200);
    expect(res.body.provider).toBe('luxor');
  });

  it('returns 400 for invalid provider', async () => {
    const res = await request(app)
      .post('/api/pool-analytics/config')
      .send({ provider: 'invalid', apiKey: 'k', poolUser: 'u' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('provider');
  });

  it('returns 400 when provider is missing', async () => {
    const res = await request(app)
      .post('/api/pool-analytics/config')
      .send({ apiKey: 'k', poolUser: 'u' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/pool-analytics', () => {
  it('returns empty when no enabled configs', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/pool-analytics');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ stats: [], configs: [] });
  });

  it('fetches stats for braiins config', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, provider: 'braiins', apikey: 'key1', pooluser: 'user1', enabled: true }],
    });
    mockFetchBraiins.mockResolvedValueOnce({
      provider: 'braiins',
      hashrate: 100,
      hashrateUnit: 'TH/s',
      btcEarned: 0.001,
      usdEarned: 50,
      luck: 105,
      activeWorkers: 3,
      lastUpdated: Date.now(),
    });

    const res = await request(app).get('/api/pool-analytics');

    expect(res.status).toBe(200);
    expect(res.body.stats).toHaveLength(1);
    expect(res.body.stats[0].provider).toBe('braiins');
    expect(mockFetchBraiins).toHaveBeenCalledWith('key1');
  });

  it('fetches stats for luxor config', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, provider: 'luxor', apikey: 'lk', pooluser: 'lu', enabled: true }],
    });
    mockFetchLuxor.mockResolvedValueOnce({
      provider: 'luxor',
      hashrate: 200,
      hashrateUnit: 'TH/s',
      btcEarned: 0.002,
      usdEarned: 100,
      luck: 95,
      activeWorkers: 5,
      lastUpdated: Date.now(),
    });

    const res = await request(app).get('/api/pool-analytics');

    expect(res.status).toBe(200);
    expect(res.body.stats).toHaveLength(1);
    expect(res.body.stats[0].provider).toBe('luxor');
    expect(mockFetchLuxor).toHaveBeenCalledWith('lk', 'lu');
  });

  it('filters out null stats from failed fetches', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, provider: 'braiins', apikey: 'key1', pooluser: 'user1', enabled: true }],
    });
    mockFetchBraiins.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/pool-analytics');

    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual([]);
  });
});
