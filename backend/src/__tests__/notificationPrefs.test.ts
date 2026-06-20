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

import { notificationPrefsRouter } from '../routes/notificationPrefs';

const app = express();
app.use(express.json());
app.use('/api/notification-prefs', notificationPrefsRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/notification-prefs/:minerId', () => {
  it('returns default prefs when no DB rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm1' }] }).mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/notification-prefs/m1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      offline: true,
      online: true,
      hot: true,
      hashrate_drop: true,
      pool_lost: true,
      long_uptime: true,
    });
  });

  it('merges DB prefs with defaults', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm1' }] }).mockResolvedValueOnce({
      rows: [
        { alerttype: 'offline', enabled: false },
        { alerttype: 'hot', enabled: true },
      ],
    });

    const res = await request(app).get('/api/notification-prefs/m1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      offline: false,
      online: true,
      hot: true,
      hashrate_drop: true,
      pool_lost: true,
      long_uptime: true,
    });
  });

  it('returns 404 when miner not owned by user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/notification-prefs/m1');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('miner not found');
  });
});

describe('PUT /api/notification-prefs/:minerId', () => {
  it('saves a preference', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'm1' }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .put('/api/notification-prefs/m1')
      .send({ alertType: 'offline', enabled: false });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO notification_prefs'),
      ['test-user-id', 'm1', 'offline', false],
    );
  });

  it('returns 400 for invalid alert type', async () => {
    const res = await request(app)
      .put('/api/notification-prefs/m1')
      .send({ alertType: 'invalid_type', enabled: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid alert type');
  });

  it('returns 404 when miner not owned by user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/notification-prefs/m1')
      .send({ alertType: 'offline', enabled: false });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('miner not found');
  });
});
