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
  fetchPoolChanges,
  recordPoolChange,
  fetchAlertHistory,
  syncAlertsToBackend,
  markAlertRead,
  fetchMinerNotes,
  addMinerNote,
  updateMinerNote,
  deleteMinerNote,
  fetchMinerAlertRules,
  putMinerAlertRules,
  fetchNotificationHistory,
  syncNotificationHistory,
  clearNotificationHistory,
  fetchPoolAnalytics,
  savePoolConfig,
  fetchPoolConfigs,
  shareGroup,
  listSharedWithMe,
  listSharedByMe,
  updateShareAccess,
  revokeShare,
  fetchSharedGroupMiners,
  contributeDarkPool,
  getDarkPoolAggregate,
  getDarkPoolMyContributions,
  deleteDarkPoolMyContributions,
  createPublicDashboard,
  getPublicDashboard,
  revokePublicDashboard,
  fetchMarketplaceListings,
  fetchMyListings,
  createMarketplaceListing,
  deleteMarketplaceListing,
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

describe('fetchPoolChanges', () => {
  it('gets pool changes with the limit param', async () => {
    const data = [{ previouspool: 'a', newpool: 'b', changedat: 1 }];
    mockInstance.get.mockResolvedValueOnce({ data });
    const result = await fetchPoolChanges('m1', 10);
    expect(mockInstance.get).toHaveBeenCalledWith('/api/pool-changes/m1', {
      params: { limit: 10 },
    });
    expect(result).toEqual(data);
  });

  it('omits the limit param when not provided', async () => {
    mockInstance.get.mockResolvedValueOnce({ data: [] });
    await fetchPoolChanges('m1');
    expect(mockInstance.get).toHaveBeenCalledWith('/api/pool-changes/m1', {
      params: { limit: undefined },
    });
  });
});

describe('recordPoolChange', () => {
  it('posts a pool change', async () => {
    mockInstance.post.mockResolvedValueOnce({ data: { ok: true } });
    const result = await recordPoolChange('m1', 'poolA', 'poolB', 1234);
    expect(mockInstance.post).toHaveBeenCalledWith('/api/pool-changes', {
      minerId: 'm1',
      previousPool: 'poolA',
      newPool: 'poolB',
      changedAt: 1234,
    });
    expect(result).toEqual({ ok: true });
  });
});

describe('fetchAlertHistory', () => {
  it('gets alert history with limit and offset params', async () => {
    const data = [
      { id: 1, minerid: 'm1', eventtype: 'offline', title: 'Offline', timestamp: 1, read: false },
    ];
    mockInstance.get.mockResolvedValueOnce({ data });
    const result = await fetchAlertHistory(10, 20);
    expect(mockInstance.get).toHaveBeenCalledWith('/api/alert-history', {
      params: { limit: 10, offset: 20 },
    });
    expect(result).toEqual(data);
  });
});

describe('syncAlertsToBackend', () => {
  it('posts alerts for sync', async () => {
    const alerts = [
      { minerId: 'm1', eventType: 'offline', title: 'Offline', timestamp: 1, read: false },
    ];
    mockInstance.post.mockResolvedValueOnce({ data: { ok: true, inserted: 1 } });
    const result = await syncAlertsToBackend(alerts);
    expect(mockInstance.post).toHaveBeenCalledWith('/api/alert-history/sync', { alerts });
    expect(result).toEqual({ ok: true, inserted: 1 });
  });
});

describe('markAlertRead', () => {
  it('marks an alert as read', async () => {
    mockInstance.put.mockResolvedValueOnce({ data: { ok: true } });
    const result = await markAlertRead(7);
    expect(mockInstance.put).toHaveBeenCalledWith('/api/alert-history/7/read');
    expect(result).toEqual({ ok: true });
  });
});

describe('fetchMinerNotes', () => {
  it('gets notes for a miner', async () => {
    const data = [{ id: 1, minerid: 'm1', text: 'hello', createdat: '2026-01-01' }];
    mockInstance.get.mockResolvedValueOnce({ data });
    const result = await fetchMinerNotes('m1');
    expect(mockInstance.get).toHaveBeenCalledWith('/api/miners/m1/notes');
    expect(result).toEqual(data);
  });
});

describe('addMinerNote', () => {
  it('posts a note for a miner', async () => {
    const data = { id: 2, minerid: 'm1', text: 'note', createdat: '2026-01-01' };
    mockInstance.post.mockResolvedValueOnce({ data });
    const result = await addMinerNote('m1', 'note');
    expect(mockInstance.post).toHaveBeenCalledWith('/api/miners/m1/notes', { text: 'note' });
    expect(result).toEqual(data);
  });
});

describe('updateMinerNote', () => {
  it('puts the updated note text', async () => {
    const data = { id: 2, minerid: 'm1', text: 'edited', createdat: '2026-01-01' };
    mockInstance.put.mockResolvedValueOnce({ data });
    const result = await updateMinerNote('m1', 2, 'edited');
    expect(mockInstance.put).toHaveBeenCalledWith('/api/miners/m1/notes/2', { text: 'edited' });
    expect(result).toEqual(data);
  });
});

describe('deleteMinerNote', () => {
  it('deletes a note', async () => {
    mockInstance.delete.mockResolvedValueOnce({ data: { deleted: true } });
    const result = await deleteMinerNote('m1', 2);
    expect(mockInstance.delete).toHaveBeenCalledWith('/api/miners/m1/notes/2');
    expect(result).toEqual({ deleted: true });
  });
});

describe('fetchMinerAlertRules', () => {
  it('gets alert rules for a miner', async () => {
    const data = {
      enabled: true,
      tempThreshold: 80,
      hashrateDropPercent: 20,
      offlineReminderMinutes: 30,
      uptimeThresholdHours: 1,
    };
    mockInstance.get.mockResolvedValueOnce({ data });
    const result = await fetchMinerAlertRules('m1');
    expect(mockInstance.get).toHaveBeenCalledWith('/api/miner-alert-rules/m1');
    expect(result).toEqual(data);
  });
});

describe('putMinerAlertRules', () => {
  it('saves alert rules for a miner', async () => {
    const rules = {
      enabled: true,
      tempThreshold: 85,
      hashrateDropPercent: 25,
      offlineReminderMinutes: 15,
      uptimeThresholdHours: 2,
    };
    mockInstance.put.mockResolvedValueOnce({ data: { ok: true } });
    const result = await putMinerAlertRules('m1', rules);
    expect(mockInstance.put).toHaveBeenCalledWith('/api/miner-alert-rules/m1', rules);
    expect(result).toEqual({ ok: true });
  });
});

describe('fetchNotificationHistory', () => {
  it('gets notification history with params', async () => {
    const data = [
      { id: 1, token: 't', title: 'Alert', body: 'body', data: {}, sentat: 1, status: 'sent' },
    ];
    mockInstance.get.mockResolvedValueOnce({ data });
    const result = await fetchNotificationHistory(10, 0);
    expect(mockInstance.get).toHaveBeenCalledWith('/api/notification-history', {
      params: { limit: 10, offset: 0 },
    });
    expect(result).toEqual(data);
  });
});

describe('syncNotificationHistory', () => {
  it('posts entries for sync', async () => {
    const entries = [{ title: 'Alert', body: 'body', token: 't', sentAt: 1, status: 'sent' }];
    mockInstance.post.mockResolvedValueOnce({ data: { ok: true, inserted: 1 } });
    const result = await syncNotificationHistory(entries);
    expect(mockInstance.post).toHaveBeenCalledWith('/api/notification-history/sync', { entries });
    expect(result).toEqual({ ok: true, inserted: 1 });
  });
});

describe('clearNotificationHistory', () => {
  it('deletes the notification history', async () => {
    mockInstance.delete.mockResolvedValueOnce({ data: { ok: true } });
    const result = await clearNotificationHistory();
    expect(mockInstance.delete).toHaveBeenCalledWith('/api/notification-history');
    expect(result).toEqual({ ok: true });
  });
});

describe('fetchPoolAnalytics', () => {
  it('gets pool analytics stats and configs', async () => {
    const data = { stats: [], configs: [] };
    mockInstance.get.mockResolvedValueOnce({ data });
    const result = await fetchPoolAnalytics();
    expect(mockInstance.get).toHaveBeenCalledWith('/api/pool-analytics');
    expect(result).toEqual(data);
  });
});

describe('savePoolConfig', () => {
  it('posts a pool config', async () => {
    const config = { provider: 'braiins', apiKey: 'key', poolUser: 'user' };
    mockInstance.post.mockResolvedValueOnce({ data: { id: 1, ...config, enabled: true } });
    const result = await savePoolConfig(config);
    expect(mockInstance.post).toHaveBeenCalledWith('/api/pool-analytics/config', config);
    expect(result.enabled).toBe(true);
  });
});

describe('fetchPoolConfigs', () => {
  it('gets pool configs', async () => {
    mockInstance.get.mockResolvedValueOnce({ data: [{ id: 1, provider: 'braiins' }] });
    const result = await fetchPoolConfigs();
    expect(mockInstance.get).toHaveBeenCalledWith('/api/pool-analytics/config');
    expect(result).toEqual([{ id: 1, provider: 'braiins' }]);
  });
});

describe('shareGroup', () => {
  it('shares a group with an email', async () => {
    mockInstance.post.mockResolvedValueOnce({ data: { id: 1, accessLevel: 'viewer' } });
    const result = await shareGroup('g1', 'a@b.com', 'viewer');
    expect(mockInstance.post).toHaveBeenCalledWith('/api/groups/share', {
      groupId: 'g1',
      email: 'a@b.com',
      accessLevel: 'viewer',
    });
    expect(result).toEqual({ id: 1, accessLevel: 'viewer' });
  });
});

describe('listSharedWithMe', () => {
  it('gets groups shared with the user', async () => {
    mockInstance.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const result = await listSharedWithMe();
    expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/share');
    expect(result).toEqual([{ id: 1 }]);
  });
});

describe('listSharedByMe', () => {
  it('gets groups shared by the user', async () => {
    mockInstance.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const result = await listSharedByMe();
    expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/shared-by-me');
    expect(result).toEqual([{ id: 1 }]);
  });
});

describe('updateShareAccess', () => {
  it('updates share access level', async () => {
    mockInstance.put.mockResolvedValueOnce({ data: { id: 5, accessLevel: 'editor' } });
    const result = await updateShareAccess(5, 'editor');
    expect(mockInstance.put).toHaveBeenCalledWith('/api/groups/share/5', { accessLevel: 'editor' });
    expect(result).toEqual({ id: 5, accessLevel: 'editor' });
  });
});

describe('revokeShare', () => {
  it('revokes a share', async () => {
    mockInstance.delete.mockResolvedValueOnce({ data: { deleted: true } });
    const result = await revokeShare(5);
    expect(mockInstance.delete).toHaveBeenCalledWith('/api/groups/share/5');
    expect(result).toEqual({ deleted: true });
  });
});

describe('fetchSharedGroupMiners', () => {
  it('gets miners for a shared group', async () => {
    const data = { miners: [{ id: 'm1' }], accessLevel: 'viewer' };
    mockInstance.get.mockResolvedValueOnce({ data });
    const result = await fetchSharedGroupMiners('g1');
    expect(mockInstance.get).toHaveBeenCalledWith('/api/groups/shared-miners/g1');
    expect(result).toEqual(data);
  });
});

describe('contributeDarkPool', () => {
  it('posts a dark pool contribution', async () => {
    mockInstance.post.mockResolvedValueOnce({ data: { ok: true, id: 9 } });
    const result = await contributeDarkPool({
      hashrate: 500,
      power: 100,
      temp: 60,
      poolName: 'Ocean',
    });
    expect(mockInstance.post).toHaveBeenCalledWith('/api/darkpool/contribute', {
      hashrate: 500,
      power: 100,
      temp: 60,
      poolName: 'Ocean',
    });
    expect(result).toEqual({ ok: true, id: 9 });
  });
});

describe('getDarkPoolAggregate', () => {
  it('gets the aggregate with a period param', async () => {
    const data = {
      totalHashrate: 1000,
      avgPower: 100,
      avgTemp: 60,
      contributorCount: 2,
      poolBreakdown: {},
      regionBreakdown: {},
      period: '24h',
    };
    mockInstance.get.mockResolvedValueOnce({ data });
    const result = await getDarkPoolAggregate('24h');
    expect(mockInstance.get).toHaveBeenCalledWith('/api/darkpool/aggregate', {
      params: { period: '24h' },
    });
    expect(result).toEqual(data);
  });
});

describe('getDarkPoolMyContributions', () => {
  it('gets the user contributions', async () => {
    mockInstance.get.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const result = await getDarkPoolMyContributions();
    expect(mockInstance.get).toHaveBeenCalledWith('/api/darkpool/my-contributions');
    expect(result).toEqual([{ id: 1 }]);
  });
});

describe('deleteDarkPoolMyContributions', () => {
  it('deletes the user contributions', async () => {
    mockInstance.delete.mockResolvedValueOnce({ data: { ok: true, deleted: 3 } });
    const result = await deleteDarkPoolMyContributions();
    expect(mockInstance.delete).toHaveBeenCalledWith('/api/darkpool/my-contributions');
    expect(result).toEqual({ ok: true, deleted: 3 });
  });
});

describe('createPublicDashboard', () => {
  it('creates a public dashboard for a miner', async () => {
    mockInstance.post.mockResolvedValueOnce({ data: { token: 'tok', createdAt: 1 } });
    const result = await createPublicDashboard('m1');
    expect(mockInstance.post).toHaveBeenCalledWith('/api/public-dashboards', { minerId: 'm1' });
    expect(result).toEqual({ token: 'tok', createdAt: 1 });
  });
});

describe('getPublicDashboard', () => {
  it('gets a public dashboard by token', async () => {
    const data = { minerName: 'M1', minerId: 'm1', snapshot: null, createdAt: 1 };
    mockInstance.get.mockResolvedValueOnce({ data });
    const result = await getPublicDashboard('tok');
    expect(mockInstance.get).toHaveBeenCalledWith('/api/public-dashboards/tok');
    expect(result).toEqual(data);
  });
});

describe('revokePublicDashboard', () => {
  it('revokes a public dashboard', async () => {
    mockInstance.delete.mockResolvedValueOnce({ data: { deleted: true } });
    const result = await revokePublicDashboard('tok');
    expect(mockInstance.delete).toHaveBeenCalledWith('/api/public-dashboards/tok');
    expect(result).toEqual({ deleted: true });
  });
});

describe('fetchMarketplaceListings', () => {
  it('gets listings with pagination params', async () => {
    const data = { listings: [{ id: 'l1' }], total: 1, page: 1, limit: 10 };
    mockInstance.get.mockResolvedValueOnce({ data });
    const result = await fetchMarketplaceListings(1, 10);
    expect(mockInstance.get).toHaveBeenCalledWith('/api/marketplace', {
      params: { page: 1, limit: 10 },
    });
    expect(result).toEqual(data);
  });
});

describe('fetchMyListings', () => {
  it('gets the current users listings', async () => {
    mockInstance.get.mockResolvedValueOnce({ data: [{ id: 'l1' }] });
    const result = await fetchMyListings();
    expect(mockInstance.get).toHaveBeenCalledWith('/api/marketplace/mine');
    expect(result).toEqual([{ id: 'l1' }]);
  });
});

describe('createMarketplaceListing', () => {
  it('creates a listing', async () => {
    const payload = {
      title: 'Bitaxe',
      description: 'Good condition',
      price: 100,
      currency: 'USD',
      model: 'Gamma',
      condition: 'used',
      location: 'Oslo',
    };
    mockInstance.post.mockResolvedValueOnce({ data: { id: 'l1', ...payload } });
    const result = await createMarketplaceListing(payload);
    expect(mockInstance.post).toHaveBeenCalledWith('/api/marketplace', payload);
    expect(result.id).toBe('l1');
  });
});

describe('deleteMarketplaceListing', () => {
  it('deletes a listing', async () => {
    mockInstance.delete.mockResolvedValueOnce({ data: { deleted: true } });
    const result = await deleteMarketplaceListing('l1');
    expect(mockInstance.delete).toHaveBeenCalledWith('/api/marketplace/l1');
    expect(result).toEqual({ deleted: true });
  });
});

describe('error handling for remaining API functions', () => {
  it('fetchPoolAnalytics rejects on network error', async () => {
    mockInstance.get.mockRejectedValueOnce(new Error('Network Error'));
    await expect(fetchPoolAnalytics()).rejects.toThrow('Network Error');
  });

  it('recordPoolChange rejects on network error', async () => {
    mockInstance.post.mockRejectedValueOnce(new Error('Network Error'));
    await expect(recordPoolChange('m1', 'a', 'b')).rejects.toThrow('Network Error');
  });
});
