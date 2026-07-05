import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

interface ProxyError extends Error {
  code?: string;
}

jest.mock('axios', () => jest.fn());
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: Request & { userId?: string }, _res: Response, next: NextFunction) => {
    req.userId = 'test-user-id';
    next();
  },
}));

import axios from 'axios';
import { proxyRouter } from '../routes/proxy';

interface ProxyError extends Error {
  code?: string;
}

const mockAxios = axios as unknown as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/proxy', proxyRouter);

beforeEach(() => {
  jest.resetAllMocks();
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

  it('defaults to GET method when method is not provided', async () => {
    mockAxios.mockResolvedValueOnce({
      status: 200,
      data: { hostname: 'bitaxe-test' },
    });

    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://192.168.1.100/api/system/info' });

    expect(res.status).toBe(200);
    expect(mockAxios).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET' }));
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
    const err = new Error('Connection refused') as ProxyError;
    err.code = 'ECONNREFUSED';
    mockAxios.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://192.168.1.100/api/system/info' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('unreachable');
  });

  it('returns 502 when miner times out', async () => {
    const err = new Error('Timeout') as ProxyError;
    err.code = 'ETIMEDOUT';
    mockAxios.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://192.168.1.100/api/info' });

    expect(res.status).toBe(502);
    expect(res.body.message).toContain('timeout');
  });

  it('returns 502 on ENETUNREACH', async () => {
    const err = new Error('Network unreachable') as ProxyError;
    err.code = 'ENETUNREACH';
    mockAxios.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://192.168.1.100/api/info' });

    expect(res.status).toBe(502);
    expect(res.body.message).toContain('timeout');
  });

  it('returns 502 on ENETDOWN', async () => {
    const err = new Error('Network down') as ProxyError;
    err.code = 'ENETDOWN';
    mockAxios.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://192.168.1.100/api/info' });

    expect(res.status).toBe(502);
    expect(res.body.message).toContain('timeout');
  });

  it('returns 502 on EINVAL', async () => {
    const err = new Error('Invalid argument') as ProxyError;
    err.code = 'EINVAL';
    mockAxios.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://192.168.1.100/api/info' });

    expect(res.status).toBe(502);
    expect(res.body.message).toContain('timeout');
  });

  it('returns 502 on bad response', async () => {
    const err = new Error('Bad response') as ProxyError;
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

  it('returns 500 on generic error', async () => {
    mockAxios.mockRejectedValueOnce(new Error('Something unexpected'));

    const res = await request(app)
      .post('/api/proxy')
      .send({ url: 'http://192.168.1.100/api/info' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('proxy_error');
  });

  it('passes custom headers and sanitizes blocked ones', async () => {
    mockAxios.mockResolvedValueOnce({ status: 200, data: { ok: true } });

    const res = await request(app)
      .post('/api/proxy')
      .send({
        url: 'http://192.168.1.100/api/info',
        headers: {
          'X-Custom': 'value',
          host: 'evil.com',
          authorization: 'Bearer hack',
          cookie: 'session=steal',
        },
      });

    expect(res.status).toBe(200);
    expect(mockAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom': 'value',
          Connection: 'close',
        }),
      }),
    );
    expect(mockAxios).not.toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ host: expect.anything() }),
      }),
    );
  });
});

describe('POST /api/proxy/flash', () => {
  it('flashes firmware to a miner', async () => {
    mockAxios.mockResolvedValueOnce({ status: 200, data: { success: true } });

    const res = await request(app)
      .post('/api/proxy/flash')
      .send({
        url: 'http://192.168.1.100/api/system/ota',
        method: 'POST',
        body: JSON.stringify({ url: 'http://firmware.example.com/bitaxe.bin' }),
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { success: true } });
  });

  it('returns 400 when no url provided', async () => {
    const res = await request(app).post('/api/proxy/flash').send({ method: 'POST' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('url is required');
  });

  it('returns 403 for public URLs', async () => {
    const res = await request(app)
      .post('/api/proxy/flash')
      .send({ url: 'http://example.com/api/ota' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });

  it('returns 502 when miner is unreachable', async () => {
    const err = new Error('Connection refused') as ProxyError;
    err.code = 'ECONNREFUSED';
    mockAxios.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/proxy/flash')
      .send({ url: 'http://192.168.1.100/api/system/ota' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('unreachable');
  });
});

describe('POST /api/proxy/restart', () => {
  it('restarts a miner', async () => {
    mockAxios.mockResolvedValueOnce({ status: 200, data: {} });

    const res = await request(app)
      .post('/api/proxy/restart')
      .send({ url: 'http://192.168.1.100/api/system/restart' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('returns 400 when no url provided', async () => {
    const res = await request(app).post('/api/proxy/restart').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('url is required');
  });

  it('returns 403 for public URLs', async () => {
    const res = await request(app)
      .post('/api/proxy/restart')
      .send({ url: 'http://example.com/api/restart' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });

  it('returns 502 when restart fails', async () => {
    const err = new Error('Unreachable') as ProxyError;
    err.code = 'ECONNREFUSED';
    mockAxios.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/proxy/restart')
      .send({ url: 'http://192.168.1.100/api/system/restart' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('restart_failed');
  });
});
