import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));
jest.mock('../middleware/cache', () => ({
  invalidateCache: jest.fn(),
}));
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: Request & { userId?: string }, _res: Response, next: NextFunction) => {
    req.userId = 'owner-user-id';
    next();
  },
}));

import { groupSharesRouter } from '../routes/groupShares';

const app = express();
app.use(express.json());
app.use('/api/groups', groupSharesRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/groups/share', () => {
  it('shares a group with another user', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'target-user-id' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, accessLevel: 'view' }] });

    const res = await request(app)
      .post('/api/groups/share')
      .send({ groupId: 'Garage', email: 'friend@example.com', accessLevel: 'view' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, accessLevel: 'view' });
  });

  it('returns 400 if groupId missing', async () => {
    const res = await request(app).post('/api/groups/share').send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('groupId and email are required');
  });

  it('returns 404 if user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/groups/share')
      .send({ groupId: 'Garage', email: 'unknown@example.com' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  it('returns 400 if sharing with yourself', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'owner-user-id' }] });

    const res = await request(app)
      .post('/api/groups/share')
      .send({ groupId: 'Garage', email: 'self@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot share with yourself');
  });

  it('updates existing share if already shared', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'target-user-id' }] })
      .mockResolvedValueOnce({ rows: [{ id: 42 }] })
      .mockResolvedValueOnce({ rows: [{ id: 42, accessLevel: 'edit' }] });

    const res = await request(app)
      .post('/api/groups/share')
      .send({ groupId: 'Garage', email: 'friend@example.com', accessLevel: 'edit' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 42, accessLevel: 'edit', updated: true });
  });
});

describe('GET /api/groups/share', () => {
  it('returns groups shared with me', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          groupId: 'Garage',
          accessLevel: 'view',
          sharedWithEmail: 'me@example.com',
          createdAt: '2026-01-01',
          ownerEmail: 'owner@example.com',
        },
      ],
    });

    const res = await request(app).get('/api/groups/share');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].groupId).toBe('Garage');
  });

  it('returns empty array when no shares', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/groups/share');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/groups/shared-by-me', () => {
  it('returns groups I shared', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          groupId: 'Garage',
          accessLevel: 'edit',
          sharedWithEmail: 'friend@example.com',
          createdAt: '2026-01-01',
        },
      ],
    });

    const res = await request(app).get('/api/groups/shared-by-me');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].sharedWithEmail).toBe('friend@example.com');
  });
});

describe('PUT /api/groups/share/:id', () => {
  it('updates access level', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, accessLevel: 'edit' }],
    });

    const res = await request(app).put('/api/groups/share/1').send({ accessLevel: 'edit' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, accessLevel: 'edit' });
  });

  it('returns 404 if share not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put('/api/groups/share/999').send({ accessLevel: 'edit' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/groups/share/:id', () => {
  it('deletes a share', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).delete('/api/groups/share/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
  });

  it('returns 404 if share not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app).delete('/api/groups/share/999');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/groups/shared-miners/:groupId', () => {
  it('returns miners for a shared group', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ accessLevel: 'view' }] }).mockResolvedValueOnce({
      rows: [{ id: 'm1', name: 'Miner A', ip: '10.0.0.1', port: 80, lastSeen: null }],
    });

    const res = await request(app).get('/api/groups/shared-miners/Garage');

    expect(res.status).toBe(200);
    expect(res.body.accessLevel).toBe('view');
    expect(res.body.miners).toHaveLength(1);
  });

  it('returns 403 if no share exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/groups/shared-miners/Unknown');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Access denied');
  });
});
