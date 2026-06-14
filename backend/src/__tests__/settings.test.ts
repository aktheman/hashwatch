process.env.JWT_SECRET = 'test-secret-for-testing';

import request from 'supertest';
import express from 'express';

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('jsonwebtoken');

import jwt from 'jsonwebtoken';
import { query as _query } from '../db';
const mockQuery = _query as jest.Mock;
import { settingsRouter } from '../routes/settings';

const app = express();
app.use(express.json());
app.use('/api/settings', settingsRouter);

beforeEach(() => {
  jest.clearAllMocks();
  (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-1' });
});

describe('GET /api/settings', () => {
  it('returns all settings for user', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { key: 'theme', value: 'dark' },
        { key: 'power_cost', value: '0.12' },
      ],
    });

    const res = await request(app).get('/api/settings').set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ theme: 'dark', power_cost: '0.12' });
  });

  it('returns empty object when no settings', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/settings').set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid');
    });

    const res = await request(app).get('/api/settings').set('Authorization', 'Bearer bad-token');

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/settings', () => {
  it('upserts a setting', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', 'Bearer valid-token')
      .send({ key: 'theme', value: 'neon' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_settings'), [
      'user-1',
      'theme',
      'neon',
    ]);
  });

  it('returns 400 when key is missing', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', 'Bearer valid-token')
      .send({ value: 'dark' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('key is required');
  });

  it('handles null value', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', 'Bearer valid-token')
      .send({ key: 'theme', value: null });

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_settings'), [
      'user-1',
      'theme',
      '',
    ]);
  });
});

describe('DELETE /api/settings/:key', () => {
  it('deletes a setting', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/settings/theme')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM user_settings'), [
      'user-1',
      'theme',
    ]);
  });
});
