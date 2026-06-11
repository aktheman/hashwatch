import request from 'supertest';
import express from 'express';

const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
}));

import { pushRouter } from '../routes/push';

const app = express();
app.use(express.json());
app.use('/api/push', pushRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/push/register', () => {
  it('registers a push token', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post('/api/push/register')
      .send({ token: 'expo-push-token-123' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO push_tokens'), [
      'test-user-id',
      'expo-push-token-123',
    ]);
  });

  it('returns 400 if token is missing', async () => {
    const res = await request(app).post('/api/push/register').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('token is required');
  });
});

describe('DELETE /api/push/unregister', () => {
  it('unregisters a push token', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .delete('/api/push/unregister')
      .send({ token: 'expo-push-token-123' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenCalledWith('DELETE FROM push_tokens WHERE token = $1', [
      'expo-push-token-123',
    ]);
  });

  it('returns 400 if token is missing', async () => {
    const res = await request(app).delete('/api/push/unregister').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('token is required');
  });
});
