import request from 'supertest';
import express from 'express';

jest.mock('axios', () => jest.fn());
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
}));

import axios from 'axios';
import { proxyRouter } from '../routes/proxy';

const mockAxios = axios as unknown as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/proxy', proxyRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/proxy', () => {
  it('proxies a GET request to a miner', async () => {
    mockAxios.mockResolvedValueOnce({
      status: 200,
      data: { hostname: 'bitaxe-test', hashRate: 500 },
    });

    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://192.168.1.100/api/system/info', method: 'GET' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hostname: 'bitaxe-test', hashRate: 500 });
  });

  it('rejects public URLs', async () => {
    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://example.com/api/system/info', method: 'GET' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
    expect(mockAxios).not.toHaveBeenCalled();
  });

  it('returns 502 when miner is unreachable (connection refused)', async () => {
    const err: any = new Error('Connection refused');
    err.code = 'ECONNREFUSED';
    mockAxios.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://192.168.1.100/api/system/info' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('unreachable');
  });

  it('returns 502 when miner times out', async () => {
    const err: any = new Error('Timeout');
    err.code = 'ETIMEDOUT';
    mockAxios.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://192.168.1.100/api/info' });

    expect(res.status).toBe(502);
    expect(res.body.message).toContain('timeout');
  });

  it('returns 502 on bad response', async () => {
    const err: any = new Error('Bad response');
    err.code = 'ERR_BAD_RESPONSE';
    mockAxios.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://192.168.1.100/api/info' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('bad_response');
  });

  it('returns 502 when miner returns >= 400 status', async () => {
    mockAxios.mockResolvedValueOnce({
      status: 404,
      data: { error: 'not found' },
    });

    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://192.168.1.100/bad-path' });

    expect(res.status).toBe(502);
    expect(res.body.upstreamStatus).toBe(404);
  });

  it('returns 400 when no url provided', async () => {
    const res = await request(app).post('/api/proxy').send({ method: 'GET' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('url is required');
  });
});
