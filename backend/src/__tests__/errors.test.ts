const mockAuthMiddleware = jest.fn((_req: { userId?: string }, _res: unknown, next: () => void) => {
  (_req as { userId: string }).userId = 'user-1';
  next();
}) as jest.Mock;

jest.mock('../middleware/auth', () => ({
  authMiddleware: (...args: unknown[]) => mockAuthMiddleware(...args),
}));

import request from 'supertest';
import express from 'express';
import { errorsRouter } from '../routes/errors';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(mockAuthMiddleware);
  app.use('/api/errors', errorsRouter);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/errors without auth', () => {
  it('returns 401 when no token is provided', async () => {
    mockAuthMiddleware.mockImplementationOnce((_req: unknown, res: unknown, _next: unknown) => {
      (res as { status: (code: number) => { json: (body: unknown) => void } })
        .status(401)
        .json({ error: 'missing token' });
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/errors')
      .send({ errors: [], events: [], appVersion: '1.0.0' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/errors with valid payload', () => {
  it('returns 200 with received count', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/errors')
      .send({
        errors: [{ message: 'test error', stack: 'at foo', timestamp: 123, platform: 'web' }],
        events: [{ name: 'click', properties: { id: 1 }, timestamp: 456, platform: 'web' }],
        appVersion: '1.0.0',
      });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(2);
  });
});

describe('POST /api/errors with empty arrays', () => {
  it('returns 200 with received 0', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/errors')
      .send({ errors: [], events: [], appVersion: '1.0.0' });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(0);
  });
});

describe('POST /api/errors with too many errors', () => {
  it('returns 400 when exceeding max errors', async () => {
    const app = createApp();
    const errors = Array.from({ length: 101 }, (_, i) => ({
      message: `error ${i}`,
      timestamp: Date.now(),
      platform: 'web',
    }));

    const res = await request(app)
      .post('/api/errors')
      .send({ errors, events: [], appVersion: '1.0.0' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/100/);
  });
});

describe('POST /api/errors rate limiting', () => {
  it('returns 429 on 11th request within a minute', async () => {
    const app = createApp();

    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/errors')
        .send({ errors: [], events: [{ name: `event-${i}` }], appVersion: '1.0.0' });
    }

    const res = await request(app)
      .post('/api/errors')
      .send({ errors: [], events: [{ name: 'event-10' }], appVersion: '1.0.0' });

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too many requests');
  });
});
