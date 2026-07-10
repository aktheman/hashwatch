import { cacheMiddleware, invalidateCache } from '../middleware/cache';

function createMockReq(method = 'GET', url = '/api/test', auth?: string) {
  return {
    method,
    originalUrl: url,
    headers: { authorization: auth || '' },
  } as unknown as import('express').Request;
}

function createMockRes() {
  const res = { json: jest.fn().mockReturnThis() } as unknown as import('express').Response & { json: jest.Mock };
  return res;
}

beforeEach(() => {
  invalidateCache();
});

describe('cacheMiddleware', () => {
  it('passes through non-GET requests', () => {
    const next = jest.fn();
    const req = createMockReq('POST');
    const res = createMockRes();
    const middleware = cacheMiddleware();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('caches GET response', () => {
    const next = jest.fn();
    const req = createMockReq('GET', '/api/test');
    const res = createMockRes();
    const middleware = cacheMiddleware();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    res.json({ data: 'hello' });

    const req2 = createMockReq('GET', '/api/test');
    const res2 = createMockRes();
    const next2 = jest.fn();
    middleware(req2, res2, next2);
    expect(next2).not.toHaveBeenCalled();
    expect(res2.json).toHaveBeenCalledWith({ data: 'hello' });
  });

  it('returns cached entry before expiry', () => {
    const next = jest.fn();
    const req = createMockReq('GET', '/api/test');
    const res = createMockRes();
    const middleware = cacheMiddleware(60_000);
    middleware(req, res, next);
    res.json({ value: 1 });

    const req2 = createMockReq('GET', '/api/test');
    const res2 = createMockRes();
    const next2 = jest.fn();
    middleware(req2, res2, next2);
    expect(res2.json).toHaveBeenCalledWith({ value: 1 });
    expect(next2).not.toHaveBeenCalled();
  });

  it('differentiates by auth header', () => {
    const next = jest.fn();
    const req1 = createMockReq('GET', '/api/test', 'Bearer tok1');
    const res1 = createMockRes();
    const middleware = cacheMiddleware();
    middleware(req1, res1, next);
    res1.json({ user: 1 });

    const req2 = createMockReq('GET', '/api/test', 'Bearer tok2');
    const res2 = createMockRes();
    const next2 = jest.fn();
    middleware(req2, res2, next2);
    expect(next2).toHaveBeenCalled();
  });

  it('caches different URLs separately', () => {
    const next = jest.fn();
    const middleware = cacheMiddleware();

    const req1 = createMockReq('GET', '/api/miners');
    const res1 = createMockRes();
    middleware(req1, res1, next);
    res1.json({ miners: [] });

    const req2 = createMockReq('GET', '/api/stats');
    const res2 = createMockRes();
    const next2 = jest.fn();
    middleware(req2, res2, next2);
    expect(next2).toHaveBeenCalled();
  });
});

describe('invalidateCache', () => {
  it('clears all cache entries', () => {
    const next = jest.fn();
    const middleware = cacheMiddleware();

    const req = createMockReq('GET', '/api/test');
    const res = createMockRes();
    middleware(req, res, next);
    res.json({ data: 1 });

    invalidateCache();

    const req2 = createMockReq('GET', '/api/test');
    const res2 = createMockRes();
    const next2 = jest.fn();
    middleware(req2, res2, next2);
    expect(next2).toHaveBeenCalled();
  });

  it('clears entries matching prefix', () => {
    const next = jest.fn();
    const middleware = cacheMiddleware();

    const req1 = createMockReq('GET', '/api/miners');
    const res1 = createMockRes();
    middleware(req1, res1, next);
    res1.json({ miners: [] });

    const req2 = createMockReq('GET', '/api/settings');
    const res2 = createMockRes();
    middleware(req2, res2, next);
    res2.json({ settings: {} });

    invalidateCache('/api/miners');

    const req3 = createMockReq('GET', '/api/miners');
    const res3 = createMockRes();
    const next3 = jest.fn();
    middleware(req3, res3, next3);
    expect(next3).toHaveBeenCalled();

    const req4 = createMockReq('GET', '/api/settings');
    const res4 = createMockRes();
    const next4 = jest.fn();
    middleware(req4, res4, next4);
    expect(next4).not.toHaveBeenCalled();
    expect(res4.json).toHaveBeenCalledWith({ settings: {} });
  });
});
