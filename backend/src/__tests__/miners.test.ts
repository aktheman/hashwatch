import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));
jest.mock('../middleware/auth', () => {
  const actual = jest.requireActual('../middleware/auth') as Record<string, unknown>;
  return {
    ...actual,
    authMiddleware: (req: Request & { userId?: string }, _res: Response, next: NextFunction) => {
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
      ['test-user-id'],
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
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO miners'), [
      'test-user-id',
      'New Miner',
      '192.168.1.12',
      80,
    ]);
  });

  it('returns 400 for invalid ip', async () => {
    const res = await request(app).post('/api/miners').send({ name: 'Bad', ip: 'not-an-ip' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for empty name', async () => {
    const res = await request(app).post('/api/miners').send({ name: '', ip: '192.168.1.1' });

    expect(res.status).toBe(400);
  });

  it('returns 500 on unexpected database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app).post('/api/miners').send({ name: 'Miner', ip: '192.168.1.1' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal server error');
  });
});

describe('DELETE /api/miners/:id', () => {
  it('deletes a miner', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm1' }] });

    const res = await request(app).delete('/api/miners/m1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    expect(mockQuery).toHaveBeenCalledWith(
      'DELETE FROM miners WHERE id = $1 AND userId = $2 RETURNING id',
      ['m1', 'test-user-id'],
    );
  });

  it('returns 404 when miner is not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete('/api/miners/m1');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('miner not found');
  });
});

describe('PUT /api/miners/:id', () => {
  it('updates all fields', async () => {
    const updatedMiner = { id: 'm1', name: 'Updated', ip: '10.0.0.1', port: 8080 };
    mockQuery.mockResolvedValueOnce({ rows: [updatedMiner] });

    const res = await request(app)
      .put('/api/miners/m1')
      .send({ name: 'Updated', ip: '10.0.0.1', port: 8080 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(updatedMiner);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE miners SET'),
      expect.arrayContaining(['Updated', '10.0.0.1', 8080, 'm1', 'test-user-id']),
    );
  });

  it('updates partial fields (just name)', async () => {
    const updatedMiner = { id: 'm1', name: 'Just Name', ip: '192.168.1.10', port: 80 };
    mockQuery.mockResolvedValueOnce({ rows: [updatedMiner] });

    const res = await request(app).put('/api/miners/m1').send({ name: 'Just Name' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(updatedMiner);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SET name = $1'), [
      'Just Name',
      'm1',
      'test-user-id',
    ]);
  });

  it('returns 400 when no fields provided', async () => {
    const res = await request(app).put('/api/miners/m1').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('no fields to update');
  });

  it('returns 404 when miner not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put('/api/miners/m1').send({ name: 'Nope' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('miner not found');
  });

  it('returns 400 when invalid IP provided', async () => {
    const res = await request(app).put('/api/miners/m1').send({ name: 'Bad', ip: 'not-an-ip' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when empty name provided', async () => {
    const res = await request(app).put('/api/miners/m1').send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('returns 500 on unexpected update error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app).put('/api/miners/m1').send({ name: 'Miner' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal server error');
  });
});

describe('GET /api/miners/:minerId/notes', () => {
  it('returns notes for miner', async () => {
    const fixed = new Date().toISOString();
    const notes = [{ id: 1, minerId: 'm1', userId: 'test-user-id', text: 'foo', createdAt: fixed }];
    mockQuery.mockResolvedValueOnce({ rows: notes });

    const res = await request(app).get('/api/miners/m1/notes');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(notes);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['m1', 'test-user-id']);
  });

  it('returns 500 on notes query error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app).get('/api/miners/m1/notes');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal server error');
  });
});

describe('POST /api/miners/:minerId/notes', () => {
  it('creates a note', async () => {
    const fixed = new Date().toISOString();
    const note = { id: 2, minerId: 'm1', userId: 'test-user-id', text: 'hello', createdAt: fixed };
    mockQuery.mockResolvedValueOnce({ rows: [note] });

    const res = await request(app).post('/api/miners/m1/notes').send({ text: 'hello' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(note);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['m1', 'test-user-id', 'hello']);
  });

  it('returns 400 for empty note text', async () => {
    const res = await request(app).post('/api/miners/m1/notes').send({ text: '' });

    expect(res.status).toBe(400);
  });

  it('returns 500 on note insert error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app).post('/api/miners/m1/notes').send({ text: 'x' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal server error');
  });
});
