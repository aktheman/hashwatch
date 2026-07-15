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

import { customThemesRouter } from '../routes/customThemes';

const app = express();
app.use(express.json());
app.use('/api/custom-themes', customThemesRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/custom-themes', () => {
  it('returns user themes', async () => {
    const fakeThemes = [
      {
        id: 1,
        name: 'My Theme',
        colors: { primary: '#FF0000' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];
    mockQuery.mockResolvedValueOnce({ rows: fakeThemes });

    const res = await request(app).get('/api/custom-themes');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeThemes);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('custom_themes'), [
      'test-user-id',
    ]);
  });
});

describe('POST /api/custom-themes', () => {
  it('creates a new theme', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] }).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'My Theme',
          colors: { primary: '#FF0000', bg: '#000' },
          createdAt: '2024',
          updatedAt: '2024',
        },
      ],
    });

    const res = await request(app)
      .post('/api/custom-themes')
      .send({ name: 'My Theme', colors: { primary: '#FF0000', bg: '#000' } });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My Theme');
  });

  it('returns 400 if colors missing', async () => {
    const res = await request(app).post('/api/custom-themes').send({ name: 'No Colors' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('colors object is required');
  });

  it('returns 409 if max themes reached', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '20' }] });

    const res = await request(app)
      .post('/api/custom-themes')
      .send({ name: 'Extra', colors: { primary: '#FF0000' } });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('20');
  });
});

describe('PUT /api/custom-themes/:id', () => {
  it('updates a theme', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Updated',
          colors: { primary: '#00FF00' },
          createdAt: '2024',
          updatedAt: '2024',
        },
      ],
    });

    const res = await request(app)
      .put('/api/custom-themes/1')
      .send({ name: 'Updated', colors: { primary: '#00FF00' } });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('returns 404 if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put('/api/custom-themes/999').send({ name: 'Updated' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('theme not found');
  });
});

describe('DELETE /api/custom-themes/:id', () => {
  it('deletes a theme', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app).delete('/api/custom-themes/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
  });

  it('returns 404 if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete('/api/custom-themes/999');

    expect(res.status).toBe(404);
  });
});
