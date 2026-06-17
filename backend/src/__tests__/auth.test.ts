process.env.JWT_SECRET = 'test-secret-for-testing';

import request from 'supertest';
import express from 'express';

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query as _query } from '../db';
const mockQuery = _query as jest.Mock;
import { authRouter } from '../routes/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('registers a new user and returns token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_password');
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] });
    (jwt.sign as jest.Mock).mockReturnValue('token-123');

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ token: 'token-123', userId: 'user-1' });
  });

  it('returns 409 if email already exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'exists@test.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('email already registered');
  });

  it('returns 400 for invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
  });

  it('returns 500 on unexpected database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'password123' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal server error');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-1', password_hash: 'hashed_password' }],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    (jwt.sign as jest.Mock).mockReturnValue('token-456');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ token: 'token-456', userId: 'user-1' });
  });

  it('returns 401 for wrong password', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-1', password_hash: 'hashed_password' }],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid credentials');
  });

  it('returns 401 for non-existent user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid login input', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad', password: 'short' });

    expect(res.status).toBe(400);
  });

  it('returns 500 on unexpected login error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal server error');
  });
});
