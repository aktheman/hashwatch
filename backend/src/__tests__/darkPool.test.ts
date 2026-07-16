const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));
jest.mock('../middleware/auth', () => ({
  authMiddleware: (_req: { userId?: string }, _res: unknown, next: () => void) => {
    (_req as { userId: string }).userId = 'user-1';
    next();
  },
}));

import request from 'supertest';
import express from 'express';
import { darkPoolRouter } from '../routes/darkPool';

const app = express();
app.use(express.json());
app.use('/api/darkpool', darkPoolRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/darkpool/contribute', () => {
  it('records a valid contribution', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: 42 }] });

    const res = await request(app)
      .post('/api/darkpool/contribute')
      .send({ hashrate: 1200, power: 120, temp: 65, poolName: 'braiins', region: 'NA' });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.id).toBe(42);
  });

  it('rejects invalid hashrate', async () => {
    const res = await request(app)
      .post('/api/darkpool/contribute')
      .send({ hashrate: -1, power: 120 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/hashrate/);
  });

  it('rejects invalid power', async () => {
    const res = await request(app)
      .post('/api/darkpool/contribute')
      .send({ hashrate: 1200, power: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/power/);
  });

  it('rejects invalid temp', async () => {
    const res = await request(app)
      .post('/api/darkpool/contribute')
      .send({ hashrate: 1200, power: 120, temp: 300 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/temp/);
  });

  it('enforces 5-minute cooldown', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .post('/api/darkpool/contribute')
      .send({ hashrate: 1200, power: 120 });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/cooldown/);
  });

  it('handles missing optional fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: 99 }] });

    const res = await request(app)
      .post('/api/darkpool/contribute')
      .send({ hashrate: 1200, power: 120 });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });

  it('returns 500 on query error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db error'));

    const res = await request(app)
      .post('/api/darkpool/contribute')
      .send({ hashrate: 1200, power: 120 });

    expect(res.status).toBe(500);
  });
});

describe('GET /api/darkpool/aggregate', () => {
  it('returns aggregate for valid period', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ totalHashrate: 5000, avgPower: 150, avgTemp: 65, contributorCount: 12 }],
      })
      .mockResolvedValueOnce({ rows: [{ poolName: 'braiins', total: 3000 }] })
      .mockResolvedValueOnce({ rows: [{ region: 'NA', total: 5000 }] });

    const res = await request(app).get('/api/darkpool/aggregate?period=24h');

    expect(res.status).toBe(200);
    expect(res.body.totalHashrate).toBe(5000);
    expect(res.body.contributorCount).toBe(12);
    expect(res.body.poolBreakdown).toEqual({ braiins: 3000 });
    expect(res.body.regionBreakdown).toEqual({ NA: 5000 });
  });

  it('returns cached aggregate when available', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          totalHashrate: 8000,
          avgPower: 200,
          avgTemp: 70,
          contributorCount: 20,
          poolBreakdown: { braiins: 8000 },
          regionBreakdown: { EU: 8000 },
        },
      ],
    });

    const res = await request(app).get('/api/darkpool/aggregate?period=24h');

    expect(res.status).toBe(200);
    expect(res.body.totalHashrate).toBe(8000);
    expect(res.body.contributorCount).toBe(20);
  });

  it('rejects invalid period', async () => {
    const res = await request(app).get('/api/darkpool/aggregate?period=invalid');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/period/);
  });

  it('defaults to 24h', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ totalHashrate: 1000, avgPower: 100, avgTemp: 60, contributorCount: 5 }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/darkpool/aggregate');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/darkpool/my-contributions', () => {
  it('returns user contributions', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          minerHashrate: 1200,
          minerPower: 120,
          minerTemp: 65,
          poolName: 'braiins',
          region: 'NA',
          contributedAt: '2026-01-01',
        },
        {
          id: 2,
          minerHashrate: 800,
          minerPower: 100,
          minerTemp: 60,
          poolName: 'luxor',
          region: 'EU',
          contributedAt: '2026-01-02',
        },
      ],
    });

    const res = await request(app).get('/api/darkpool/my-contributions');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe(1);
  });

  it('returns empty array for new user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/darkpool/my-contributions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('DELETE /api/darkpool/my-contributions', () => {
  it('deletes all user contributions', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 5 });

    const res = await request(app).delete('/api/darkpool/my-contributions');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.deleted).toBe(5);
  });

  it('returns deleted count 0 when nothing to delete', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app).delete('/api/darkpool/my-contributions');
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(0);
  });
});
