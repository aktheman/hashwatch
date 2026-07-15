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
}));

import { alertHistoryRouter } from '../routes/alertHistory';

const app = express();
app.use(express.json());
app.use('/api/alert-history', alertHistoryRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/alert-history', () => {
  it('returns alerts list', async () => {
    const fakeAlerts = [
      {
        id: 1,
        minerId: 'm1',
        eventType: 'offline',
        title: 'Miner offline',
        timestamp: '2024-01-01T00:00:00Z',
        read: false,
      },
    ];
    mockQuery.mockResolvedValueOnce({ rows: fakeAlerts });

    const res = await request(app).get('/api/alert-history');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeAlerts);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [
      'test-user-id',
      50,
      0,
    ]);
  });

  it('respects limit and offset params', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/alert-history?limit=5&offset=10');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['test-user-id', 5, 10]);
  });

  it('caps limit at 200', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/alert-history?limit=999');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['test-user-id', 200, 0]);
  });
});

describe('POST /api/alert-history/sync', () => {
  it('inserts new alerts and skips duplicates', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const alerts = [
      { minerId: 'm1', eventType: 'offline', title: 'Offline', timestamp: '2024-01-01T00:00:00Z' },
      { minerId: 'm2', eventType: 'hot', title: 'Hot', timestamp: '2024-01-02T00:00:00Z' },
      { minerId: 'm1', eventType: 'offline', title: 'Dupe', timestamp: '2024-01-01T00:00:00Z' },
    ];

    const res = await request(app).post('/api/alert-history/sync').send({ alerts });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, inserted: 2 });
  });

  it('returns 400 for empty alerts array', async () => {
    const res = await request(app).post('/api/alert-history/sync').send({ alerts: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('alerts array is required');
  });

  it('skips invalid eventTypes', async () => {
    const alerts = [
      {
        minerId: 'm1',
        eventType: 'invalid_event',
        title: 'Bad',
        timestamp: '2024-01-01T00:00:00Z',
      },
    ];

    const res = await request(app).post('/api/alert-history/sync').send({ alerts });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, inserted: 0 });
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT'),
      expect.anything(),
    );
  });

  it('returns 400 when alerts is not an array', async () => {
    const res = await request(app).post('/api/alert-history/sync').send({ alerts: 'not-array' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('alerts array is required');
  });
});

describe('PUT /api/alert-history/:id/read', () => {
  it('marks alert as read', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app).put('/api/alert-history/1/read');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE alert_history'), [
      1,
      'test-user-id',
    ]);
  });

  it('returns 400 for invalid id (NaN)', async () => {
    const res = await request(app).put('/api/alert-history/abc/read');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid id');
  });

  it('returns 404 for nonexistent alert', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put('/api/alert-history/999/read');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('alert not found');
  });
});
