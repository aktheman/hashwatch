process.env.JWT_SECRET = 'test-secret-for-testing';

import request from 'supertest';
import express from 'express';

const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));

const app = express();
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const commitSha = process.env.COMMIT_SHA || null;
  try {
    await mockQuery('SELECT 1');
    res.json({ status: 'ok', timestamp: Date.now(), db: 'connected', commitSha });
  } catch {
    res
      .status(503)
      .json({ status: 'degraded', timestamp: Date.now(), db: 'disconnected', commitSha });
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/health', () => {
  it('returns 200 with status ok when database is connected', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(res.body.timestamp).toBeDefined();
    expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns 503 with degraded status when database is disconnected', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.db).toBe('disconnected');
  });
});
