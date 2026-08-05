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

import { activityRouter } from '../routes/activity';

const app = express();
app.use(express.json());
app.use('/api/activity', activityRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/activity', () => {
  it('returns activity events mapped to camelCase', async () => {
    const fakeRows = [
      {
        id: 1,
        minerid: 'miner-1',
        type: 'miner_offline',
        title: 'Miner m1 went offline',
        description: '192.168.1.10',
        severity: 'error',
        timestamp: 1700000000000,
        read: false,
        metadata: '{}',
      },
    ];
    mockQuery.mockResolvedValueOnce({ rows: fakeRows });

    const res = await request(app).get('/api/activity');

    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([
      {
        id: '1',
        type: 'miner_offline',
        title: 'Miner m1 went offline',
        description: '192.168.1.10',
        severity: 'error',
        timestamp: 1700000000000,
        read: false,
        minerId: 'miner-1',
        metadata: '{}',
      },
    ]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM activity_events'), [
      'test-user-id',
      50,
      0,
    ]);
  });

  it('respects limit and offset params', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/activity?limit=10&offset=20');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['test-user-id', 10, 20]);
  });

  it('caps limit at 200', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/activity?limit=999');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['test-user-id', 200, 0]);
  });

  it('returns 500 on db error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db down'));

    const res = await request(app).get('/api/activity');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('PUT /api/activity/read', () => {
  it('marks all events read for the user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put('/api/activity/read');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE activity_events SET read = true'),
      ['test-user-id'],
    );
  });
});

describe('PUT /api/activity/:id/read', () => {
  it('marks a single event read', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app).put('/api/activity/7/read');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE activity_events SET read = true'),
      ['7', 'test-user-id'],
    );
  });

  it('returns 404 when event not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put('/api/activity/999/read');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('event not found');
  });
});
