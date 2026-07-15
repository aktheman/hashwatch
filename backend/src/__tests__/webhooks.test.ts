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

import { webhooksRouter } from '../routes/webhooks';

const app = express();
app.use(express.json());
app.use('/api/webhooks', webhooksRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/webhooks/logs', () => {
  it('returns webhook logs for user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] }).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          event: 'offline',
          url: 'https://hooks.example.com',
          status: 'delivered',
          responseCode: 200,
          sentAt: 1234567890,
        },
      ],
    });

    const res = await request(app).get('/api/webhooks/logs');

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.logs[0]).toEqual({
      id: 1,
      event: 'offline',
      url: 'https://hooks.example.com',
      status: 'delivered',
      responseCode: 200,
      sentAt: 1234567890,
    });
  });

  it('returns empty array when no logs', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] }).mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/webhooks/logs');

    expect(res.status).toBe(200);
    expect(res.body.logs).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

describe('DELETE /api/webhooks/logs', () => {
  it('deletes all logs for user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 3 });

    const res = await request(app).delete('/api/webhooks/logs');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    expect(mockQuery).toHaveBeenCalledWith('DELETE FROM webhook_logs WHERE userId = $1', [
      'test-user-id',
    ]);
  });
});
