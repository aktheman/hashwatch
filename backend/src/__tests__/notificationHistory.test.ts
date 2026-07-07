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

import { notificationHistoryRouter } from '../routes/notificationHistory';

const app = express();
app.use(express.json());
app.use('/api/notification-history', notificationHistoryRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/notification-history', () => {
  it('returns notification list', async () => {
    const fakeRows = [
      {
        id: 1,
        token: 'tok1',
        title: 'Miner offline',
        body: 'Miner m1 went offline',
        data: '{}',
        sentAt: '2024-01-01T00:00:00Z',
        status: 'sent',
      },
    ];
    mockQuery.mockResolvedValueOnce({ rows: fakeRows });

    const res = await request(app).get('/api/notification-history');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeRows);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [
      'test-user-id',
      50,
      0,
    ]);
  });

  it('respects limit and offset params', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/notification-history?limit=5&offset=10');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['test-user-id', 5, 10]);
  });

  it('caps limit at 200', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/notification-history?limit=999');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['test-user-id', 200, 0]);
  });
});

describe('POST /api/notification-history/sync', () => {
  it('inserts new entries and skips duplicates', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const entries = [
      { title: 'Miner offline', sentAt: '2024-01-01T00:00:00Z' },
      { title: 'Hashrate drop', sentAt: '2024-01-02T00:00:00Z' },
      { title: 'Miner offline', sentAt: '2024-01-01T00:00:00Z' },
    ];

    const res = await request(app).post('/api/notification-history/sync').send({ entries });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, inserted: 2 });
  });

  it('returns 400 for empty entries array', async () => {
    const res = await request(app).post('/api/notification-history/sync').send({ entries: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('entries array is required');
  });

  it('skips entries without title or sentAt', async () => {
    const entries = [{ body: 'no title or date' }];

    const res = await request(app).post('/api/notification-history/sync').send({ entries });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, inserted: 0 });
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT'),
      expect.anything(),
    );
  });

  it('returns 400 when entries is not an array', async () => {
    const res = await request(app)
      .post('/api/notification-history/sync')
      .send({ entries: 'not-array' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('entries array is required');
  });
});

describe('DELETE /api/notification-history', () => {
  it('clears all notifications for the user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 3 });

    const res = await request(app).delete('/api/notification-history');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM notification_history'),
      ['test-user-id'],
    );
  });
});
