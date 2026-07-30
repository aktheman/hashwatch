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

import { groupsRouter } from '../routes/groups';

const app = express();
app.use(express.json());
app.use('/api/groups', groupsRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/groups', () => {
  it('returns a list of groups', async () => {
    const fakeGroups = [
      { id: '1', name: 'Garage', miner_ids: [], sort_order: 0 },
      { id: '2', name: 'Office', miner_ids: [], sort_order: 1 },
    ];
    mockQuery.mockResolvedValueOnce({ rows: fakeGroups });

    const res = await request(app).get('/api/groups');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ groups: fakeGroups });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM miner_groups'), [
      'test-user-id',
    ]);
  });

  it('handles errors', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app).get('/api/groups');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

describe('POST /api/groups/sync', () => {
  it('upserts groups', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post('/api/groups/sync')
      .send({ groups: [{ name: 'New Group', minerIds: ['m1'], order: 0 }] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO miner_groups'), [
      'test-user-id',
      'New Group',
      ['m1'],
      0,
    ]);
  });

  it('returns 400 on invalid body', async () => {
    const res = await request(app).post('/api/groups/sync').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('groups must be an array');
  });
});
