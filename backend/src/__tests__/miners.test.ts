import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));
jest.mock('../middleware/auth', () => {
  const actual = jest.requireActual('../middleware/auth');
  return {
    ...actual,
    authMiddleware: (req: any, _res: any, next: any) => {
      req.userId = 'test-user-id';
      next();
    },
  };
});

import { minersRouter } from '../routes/miners';

const app = express();
app.use(express.json());
app.use('/api/miners', minersRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/miners', () => {
  it('returns list of miners for authenticated user', async () => {
    const fakeMiners = [
      { id: 'm1', name: 'Miner 1', ip: '192.168.1.10', port: 80 },
      { id: 'm2', name: 'Miner 2', ip: '192.168.1.11', port: 80 },
    ];
    mockQuery.mockResolvedValueOnce({ rows: fakeMiners });

    const res = await request(app).get('/api/miners');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeMiners);
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM miners WHERE userId = $1 ORDER BY addedAt DESC',
      ['test-user-id']
    );
  });
});

describe('POST /api/miners', () => {
  it('creates a new miner', async () => {
    const newMiner = { id: 'm3', name: 'New Miner', ip: '192.168.1.12', port: 80 };
    mockQuery.mockResolvedValueOnce({ rows: [newMiner] });

    const res = await request(app)
      .post('/api/miners')
      .send({ name: 'New Miner', ip: '192.168.1.12', port: 80 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(newMiner);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO miners'),
      ['test-user-id', 'New Miner', '192.168.1.12', 80]
    );
  });

  it('returns 400 for invalid ip', async () => {
    const res = await request(app)
      .post('/api/miners')
      .send({ name: 'Bad', ip: 'not-an-ip' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for empty name', async () => {
    const res = await request(app)
      .post('/api/miners')
      .send({ name: '', ip: '192.168.1.1' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/miners/:id', () => {
  it('deletes a miner', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).delete('/api/miners/m1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    expect(mockQuery).toHaveBeenCalledWith(
      'DELETE FROM miners WHERE id = $1 AND userId = $2',
      ['m1', 'test-user-id']
    );
  });
});
