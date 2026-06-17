import request from 'supertest';
import express from 'express';

const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
  generateToken: (uid: string) => `token-${uid}`,
}));
jest.mock('../ws', () => ({
  broadcast: jest.fn(),
}));

import { broadcast as mockBroadcast } from '../ws';
import { statsRouter } from '../routes/stats';

const app = express();
app.use(express.json());
app.use('/api/stats', statsRouter);

beforeEach(() => {
  jest.resetAllMocks();
});

describe('GET /api/stats/:minerId', () => {
  it('returns snapshots for a miner', async () => {
    const snapshots = [
      { id: 1, minerId: 'm1', hashRate: 500, timestamp: Date.now() },
      { id: 2, minerId: 'm1', hashRate: 510, timestamp: Date.now() },
    ];
    mockQuery.mockResolvedValueOnce({ rows: snapshots });

    const res = await request(app).get('/api/stats/m1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(snapshots);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [
      'm1',
      'test-user-id',
      100,
    ]);
  });

  it('respects limit query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await request(app).get('/api/stats/m1?limit=5');

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LIMIT $3'), [
      'm1',
      'test-user-id',
      5,
    ]);
  });

  it('caps limit at 1000', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await request(app).get('/api/stats/m1?limit=5000');

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LIMIT $3'), [
      'm1',
      'test-user-id',
      1000,
    ]);
  });
});

describe('POST /api/stats/:minerId', () => {
  it('creates a snapshot and broadcasts via WS', async () => {
    const snapshot = { id: 1, minerId: 'm1', hashRate: 500 };
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'm1', name: 'TestMiner', ip: '192.168.1.100' }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [snapshot] });

    const res = await request(app).post('/api/stats/m1').send({
      hashRate: 500,
      temperature: 60,
      voltage: 1200,
      current: 5000,
      power: 60,
      sharesAccepted: 10,
      sharesRejected: 1,
      uptimeSeconds: 3600,
      frequency: 400,
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(snapshot);
    expect(mockBroadcast).toHaveBeenCalledWith('test-user-id', {
      type: 'snapshot',
      snapshot,
    });
  });

  it('returns 404 when miner is not owned by user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/stats/m1').send({
      hashRate: 500,
      temperature: 60,
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('miner not found');
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('returns 400 when snapshot data is invalid', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'm1', name: 'TestMiner', ip: '192.168.1.100' }],
    });

    const res = await request(app).post('/api/stats/m1').send({
      hashRate: 'not-a-number',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid snapshot data');
  });
});
