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

import { poolChangesRouter } from '../routes/poolChanges';

const app = express();
app.use(express.json());
app.use('/api/pool-changes', poolChangesRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/pool-changes/:minerId', () => {
  it('returns pool changes list', async () => {
    const fakeChanges = [
      { previousPool: 'Pool A', newPool: 'Pool B', changedAt: '2024-01-01T00:00:00Z' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: fakeChanges });

    const res = await request(app).get('/api/pool-changes/m1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeChanges);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [
      'test-user-id',
      'm1',
      20,
    ]);
  });

  it('respects limit param', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/pool-changes/m1?limit=5');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['test-user-id', 'm1', 5]);
  });

  it('caps limit at 100', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/pool-changes/m1?limit=999');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['test-user-id', 'm1', 100]);
  });

  it('returns empty array when no changes exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/pool-changes/m1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/pool-changes', () => {
  it('creates a pool change', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm1' }] });

    const res = await request(app)
      .post('/api/pool-changes')
      .send({ minerId: 'm1', previousPool: 'Pool A', newPool: 'Pool B' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO pool_changes'),
      ['test-user-id', 'm1', 'Pool A', 'Pool B', expect.any(Number)],
    );
  });

  it('uses empty string for missing previousPool', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm1' }] });

    const res = await request(app)
      .post('/api/pool-changes')
      .send({ minerId: 'm1', newPool: 'Pool B' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO pool_changes'),
      ['test-user-id', 'm1', '', 'Pool B', expect.any(Number)],
    );
  });

  it('returns 400 when minerId missing', async () => {
    const res = await request(app).post('/api/pool-changes').send({ newPool: 'Pool B' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('minerId and newPool are required');
  });

  it('returns 400 when newPool missing', async () => {
    const res = await request(app).post('/api/pool-changes').send({ minerId: 'm1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('minerId and newPool are required');
  });

  it('returns 404 when miner not owned', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/pool-changes')
      .send({ minerId: 'm1', newPool: 'Pool B' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('miner not found');
  });
});
