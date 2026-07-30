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

import { pushWebRouter } from '../routes/pushWeb';

const app = express();
app.use(express.json());
app.use('/api/push', pushWebRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/push/web-subscribe', () => {
  it('saves a subscription', async () => {
    const subscription = {
      endpoint: 'https://example.com/push',
      keys: { p256dh: 'key', auth: 'auth' },
    };
    mockQuery.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).post('/api/push/web-subscribe').send({ subscription });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      'DELETE FROM web_push_subscriptions WHERE user_id = $1',
      ['test-user-id'],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      'INSERT INTO web_push_subscriptions (user_id, subscription) VALUES ($1, $2)',
      ['test-user-id', JSON.stringify(subscription)],
    );
  });

  it('returns 400 on missing subscription', async () => {
    const res = await request(app).post('/api/push/web-subscribe').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('subscription is required');
  });
});

describe('POST /api/push/web-unsubscribe', () => {
  it('removes the subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).post('/api/push/web-unsubscribe');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockQuery).toHaveBeenCalledWith(
      'DELETE FROM web_push_subscriptions WHERE user_id = $1',
      ['test-user-id'],
    );
  });
});
