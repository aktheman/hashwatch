jest.mock('axios', () => {
  const reqInterceptors: Array<(config: any) => any> = [];
  const resSuccessInterceptors: Array<(res: any) => any> = [];
  const resErrorInterceptors: Array<(err: any) => any> = [];

  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: { baseURL: '' },
    interceptors: {
      request: {
        use: jest.fn((fn: (config: any) => any) => {
          reqInterceptors.push(fn);
        }),
      },
      response: {
        use: jest.fn((success: any, error: any) => {
          resSuccessInterceptors.push(success);
          resErrorInterceptors.push(error);
        }),
      },
    },
  };

  return {
    create: jest.fn(() => mockAxiosInstance),
    get reqInterceptors() {
      return reqInterceptors;
    },
    get resSuccessInterceptors() {
      return resSuccessInterceptors;
    },
    get resErrorInterceptors() {
      return resErrorInterceptors;
    },
  };
});

import axios from 'axios';
import {
  configureClient,
  getBaseUrl,
  setBaseUrl,
  register,
  login,
  fetchMiners,
  createMiner,
  deleteMinerAPI,
  fetchStats,
  pushStats,
  updateMinerAPI,
  getSettings,
  putSetting,
  deleteSetting,
  validateReceipt,
  getNotificationPrefs,
  setNotificationPref,
  clearCache,
} from '../src/api/client';

const mockInstance = axios.create() as jest.Mocked<
  typeof axios.create extends () => infer T ? T : never
>;

beforeEach(() => {
  jest.clearAllMocks();
  configureClient({ getToken: () => null, onUnauthorized: () => {} });
});

describe('register', () => {
  it('posts to /api/auth/register', async () => {
    mockInstance.post.mockResolvedValueOnce({ data: { token: 'abc', userId: '1' } });
    const result = await register('a@b.com', 'secret');
    expect(mockInstance.post).toHaveBeenCalledWith('/api/auth/register', {
      email: 'a@b.com',
      password: 'secret',
    });
    expect(result).toEqual({ token: 'abc', userId: '1' });
  });

  it('throws on network error', async () => {
    mockInstance.post.mockRejectedValueOnce(new Error('Network Error'));
    await expect(register('a@b.com', 'secret')).rejects.toThrow('Network Error');
  });
});

describe('login', () => {
  it('posts to /api/auth/login', async () => {
    mockInstance.post.mockResolvedValueOnce({ data: { token: 'xyz', userId: '2' } });
    const result = await login('a@b.com', 'secret');
    expect(mockInstance.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'a@b.com',
      password: 'secret',
    });
    expect(result).toEqual({ token: 'xyz', userId: '2' });
  });
});

describe('fetchMiners', () => {
  it('gets /api/miners', async () => {
    const miners = [{ id: '1', name: 'Miner1', ip: '192.168.1.1' }];
    mockInstance.get.mockResolvedValueOnce({ data: miners });
    const result = await fetchMiners();
    expect(mockInstance.get).toHaveBeenCalledWith('/api/miners');
    expect(result).toEqual(miners);
  });
});

describe('createMiner', () => {
  it('posts to /api/miners', async () => {
    mockInstance.post.mockResolvedValueOnce({ data: { id: '42' } });
    const result = await createMiner({ name: 'Test', ip: '10.0.0.1', port: 8080 });
    expect(mockInstance.post).toHaveBeenCalledWith('/api/miners', {
      name: 'Test',
      ip: '10.0.0.1',
      port: 8080,
    });
    expect(result).toEqual({ id: '42' });
  });
});

describe('deleteMinerAPI', () => {
  it('deletes /api/miners/:id', async () => {
    mockInstance.delete.mockResolvedValueOnce({ data: {} });
    await deleteMinerAPI('99');
    expect(mockInstance.delete).toHaveBeenCalledWith('/api/miners/99');
  });
});

describe('pushStats', () => {
  it('posts stats to /api/stats/:id', async () => {
    const stats = { hashRate: 100, temperature: 50 } as any;
    mockInstance.post.mockResolvedValueOnce({ data: { ok: true } });
    const result = await pushStats('miner1', stats);
    expect(mockInstance.post).toHaveBeenCalledWith('/api/stats/miner1', stats);
    expect(result).toEqual({ ok: true });
  });
});

describe('fetchStats', () => {
  it('gets /api/stats/:id', async () => {
    const data = [{ hashRate: 100 }];
    mockInstance.get.mockResolvedValueOnce({ data });
    const result = await fetchStats('miner1');
    expect(mockInstance.get).toHaveBeenCalledWith('/api/stats/miner1');
    expect(result).toEqual(data);
  });
});

describe('updateMinerAPI', () => {
  it('puts to /api/miners/:id', async () => {
    mockInstance.put.mockResolvedValueOnce({ data: { success: true } });
    const result = await updateMinerAPI('5', { name: 'Renamed' });
    expect(mockInstance.put).toHaveBeenCalledWith('/api/miners/5', { name: 'Renamed' });
    expect(result).toEqual({ success: true });
  });
});

describe('getSettings', () => {
  it('gets /api/settings', async () => {
    mockInstance.get.mockResolvedValueOnce({ data: { theme: 'dark' } });
    const result = await getSettings();
    expect(mockInstance.get).toHaveBeenCalledWith('/api/settings');
    expect(result).toEqual({ theme: 'dark' });
  });
});

describe('putSetting', () => {
  it('puts to /api/settings', async () => {
    mockInstance.put.mockResolvedValueOnce({ data: { ok: true } });
    const result = await putSetting('theme', 'neon');
    expect(mockInstance.put).toHaveBeenCalledWith('/api/settings', { key: 'theme', value: 'neon' });
    expect(result).toEqual({ ok: true });
  });
});

describe('deleteSetting', () => {
  it('deletes /api/settings/:key', async () => {
    mockInstance.delete.mockResolvedValueOnce({ data: {} });
    await deleteSetting('theme');
    expect(mockInstance.delete).toHaveBeenCalledWith('/api/settings/theme');
  });
});

describe('validateReceipt', () => {
  it('posts to /api/receipt/validate', async () => {
    mockInstance.post.mockResolvedValueOnce({ data: { valid: true } });
    const result = await validateReceipt('receipt-id', 'hashwatch_pro');
    expect(mockInstance.post).toHaveBeenCalledWith('/api/receipt/validate', {
      receipt: 'receipt-id',
      productId: 'hashwatch_pro',
    });
    expect(result).toEqual({ valid: true });
  });
});

describe('getNotificationPrefs', () => {
  it('gets /api/notification-prefs/:id', async () => {
    mockInstance.get.mockResolvedValueOnce({ data: { offline_alert: true } });
    const result = await getNotificationPrefs('miner1');
    expect(mockInstance.get).toHaveBeenCalledWith('/api/notification-prefs/miner1');
    expect(result).toEqual({ offline_alert: true });
  });
});

describe('setNotificationPref', () => {
  it('puts to /api/notification-prefs/:id', async () => {
    mockInstance.put.mockResolvedValueOnce({ data: {} });
    await setNotificationPref('miner1', 'offline_alert', true);
    expect(mockInstance.put).toHaveBeenCalledWith('/api/notification-prefs/miner1', {
      alertType: 'offline_alert',
      enabled: true,
    });
  });
});

describe('configureClient', () => {
  it('sets up token getter and base URL', () => {
    configureClient({
      getToken: () => 'tok',
      onUnauthorized: () => {},
      baseUrl: 'https://example.com',
    });
    expect(mockInstance.defaults.baseURL).toBe('https://example.com');
    expect(getBaseUrl()).toBe('https://example.com');
  });
});

describe('setBaseUrl', () => {
  it('updates base URL', () => {
    setBaseUrl('https://other.com');
    expect(mockInstance.defaults.baseURL).toBe('https://other.com');
    expect(getBaseUrl()).toBe('https://other.com');
  });
});

describe('interceptors', () => {
  let reqInterceptor: (config: any) => any;
  let successInterceptor: (res: any) => any;
  let errInterceptor: (err: any) => any;

  beforeAll(() => {
    const axiosMock = jest.requireMock('axios') as any;
    reqInterceptor = axiosMock.reqInterceptors[0];
    successInterceptor = axiosMock.resSuccessInterceptors[0];
    errInterceptor = axiosMock.resErrorInterceptors[0];
  });

  it('adds Bearer token on requests when token is present', () => {
    configureClient({ getToken: () => 'test-token', onUnauthorized: () => {} });
    const config = reqInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer test-token');
  });

  it('does not add Authorization when token is null', () => {
    configureClient({ getToken: () => null, onUnauthorized: () => {} });
    const config = reqInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('calls onUnauthorized on 401 response from backend', async () => {
    const onUnauthorized = jest.fn();
    configureClient({ getToken: () => null, onUnauthorized, baseUrl: 'http://test-api' });
    const error = { response: { status: 401 }, config: { baseURL: 'http://test-api' } };
    await expect(errInterceptor(error)).rejects.toEqual(error);
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('does not call onUnauthorized on 401 from non-backend URL', async () => {
    const onUnauthorized = jest.fn();
    configureClient({ getToken: () => null, onUnauthorized, baseUrl: 'http://test-api' });
    const error = { response: { status: 401 }, config: { baseURL: 'http://other-proxy' } };
    await expect(errInterceptor(error)).rejects.toEqual(error);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not call onUnauthorized on non-401 errors', async () => {
    const onUnauthorized = jest.fn();
    configureClient({ getToken: () => null, onUnauthorized, baseUrl: 'http://test-api' });
    const error = { response: { status: 500 }, config: { baseURL: 'http://test-api' } };
    await expect(errInterceptor(error)).rejects.toEqual(error);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  describe('cache behavior', () => {
    beforeEach(() => {
      clearCache();
    });

    it('caches successful GET responses and returns cached on network error', async () => {
      const minerData = [{ id: '1', name: 'Alpha' }];
      const successRes = {
        config: { method: 'get', url: '/api/miners', params: undefined },
        data: minerData,
        status: 200,
      };
      const result = successInterceptor(successRes);
      expect(result).toBe(successRes);

      const networkErr = {
        config: { method: 'get', url: '/api/miners', params: undefined },
        response: undefined,
      };
      const cached = await errInterceptor(networkErr);
      expect(cached.data).toEqual(minerData);
      expect(cached.status).toBe(200);
    });

    it('rejects network errors when no cache entry exists', async () => {
      const networkErr = {
        config: { method: 'get', url: '/api/unknown', params: undefined },
        response: undefined,
      };
      await expect(errInterceptor(networkErr)).rejects.toEqual(networkErr);
    });

    it('does not cache POST responses', async () => {
      const postRes = {
        config: { method: 'post', url: '/api/miners', params: undefined },
        data: { id: 'new' },
      };
      successInterceptor(postRes);

      const networkErr = {
        config: { method: 'get', url: '/api/miners', params: undefined },
        response: undefined,
      };
      await expect(errInterceptor(networkErr)).rejects.toEqual(networkErr);
    });

    it('does not serve cached data for non-GET request errors', async () => {
      const minerData = [{ id: '1', name: 'Alpha' }];
      const successRes = {
        config: { method: 'get', url: '/api/miners', params: undefined },
        data: minerData,
        status: 200,
      };
      successInterceptor(successRes);

      const postErr = {
        config: { method: 'post', url: '/api/miners', params: undefined },
        response: undefined,
      };
      await expect(errInterceptor(postErr)).rejects.toEqual(postErr);
    });

    it('returns stale data if TTL has expired', async () => {
      jest.useFakeTimers({ now: 0 });
      const successRes = {
        config: { method: 'get', url: '/api/ttl-test', params: undefined },
        data: 'stale-data',
      };
      successInterceptor(successRes);

      jest.advanceTimersByTime(61000);

      const err = {
        config: { method: 'get', url: '/api/ttl-test', params: undefined },
        response: undefined,
      };
      await expect(errInterceptor(err)).rejects.toEqual(err);
      jest.useRealTimers();
    });

    it('clearCache empties cache', async () => {
      const successRes = {
        config: { method: 'get', url: '/api/clear-test', params: undefined },
        data: 'to-clear',
      };
      successInterceptor(successRes);
      clearCache();

      const err = {
        config: { method: 'get', url: '/api/clear-test', params: undefined },
        response: undefined,
      };
      await expect(errInterceptor(err)).rejects.toEqual(err);
    });
  });
});
