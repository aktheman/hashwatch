const mockGetAuthToken = jest.fn();
const mockGetProxyUrl = jest.fn();
const mockGetExtra = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

jest.mock('../src/constants', () => ({
  getProxyUrl: () => mockGetProxyUrl(),
  getExtra: () => mockGetExtra(),
}));

jest.mock('../src/store/authToken', () => ({
  getAuthToken: () => mockGetAuthToken(),
}));

jest.mock('axios', () => {
  const mockInstance = { get: jest.fn(), post: jest.fn() };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockInstance),
      get: jest.fn(),
      post: jest.fn(),
    },
    __mockAxios: mockInstance,
  };
});

import { BitAxeClient } from '../src/api/bitaxe';

let mockAxios: { get: jest.Mock; post: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  mockAxios = require('axios').default;
  mockGetProxyUrl.mockReturnValue('http://localhost:4567');
  mockGetExtra.mockReturnValue({ apiUrl: 'http://localhost:4000' });
  mockGetAuthToken.mockReturnValue(null);
});

describe('BitAxeClient web platform', () => {
  it('gets system info via proxy', async () => {
    mockAxios.post.mockResolvedValue({
      data: { version: '1.0', chipType: 'BM1397', hostname: 'web', macAddr: 'AA:BB' },
    });

    const client = new BitAxeClient('192.168.1.100', 80);
    const info = await client.getSystemInfo();
    expect(info.hostname).toBe('web');
    expect(mockAxios.post).toHaveBeenCalledWith(
      'http://localhost:4567/api/proxy',
      expect.objectContaining({ method: 'GET' }),
      expect.any(Object),
    );
  });

  it('handles proxy error with response message', async () => {
    mockAxios.post.mockRejectedValue({
      response: { data: { message: 'Proxy error' } },
    });

    const client = new BitAxeClient('192.168.1.100', 80);
    await expect(client.getSystemInfo()).rejects.toThrow('Proxy error');
  });

  it('handles proxy error with generic message', async () => {
    mockAxios.post.mockRejectedValue(new Error('Network error'));

    const client = new BitAxeClient('192.168.1.100', 80);
    await expect(client.getSystemInfo()).rejects.toThrow('Network error');
  });

  it('handles proxy error without any message', async () => {
    mockAxios.post.mockRejectedValue({});

    const client = new BitAxeClient('192.168.1.100', 80);
    await expect(client.getSystemInfo()).rejects.toThrow('Connection failed');
  });

  it('restarts via proxy and returns true', async () => {
    mockAxios.post.mockResolvedValue({ data: { success: true } });

    const client = new BitAxeClient('192.168.1.100', 80);
    const result = await client.restart();
    expect(result).toBe(true);
  });

  it('restarts via proxy and returns false when not successful', async () => {
    mockAxios.post.mockResolvedValue({ data: { success: false } });

    const client = new BitAxeClient('192.168.1.100', 80);
    const result = await client.restart();
    expect(result).toBe(false);
  });

  it('returns false when proxy restart throws', async () => {
    mockAxios.post.mockRejectedValue(new Error('timeout'));

    const client = new BitAxeClient('192.168.1.100', 80);
    const result = await client.restart();
    expect(result).toBe(false);
  });

  it('gets status via proxy', async () => {
    mockAxios.post.mockResolvedValue({
      data: { hashRate: 500, hashRateUnit: 'GH/s' },
    });

    const client = new BitAxeClient('192.168.1.100', 80);
    const status = await client.getMinerStatus();
    expect(status.hashRate).toBe(500);
  });

  it('fetches both info and status via proxy', async () => {
    mockAxios.post
      .mockResolvedValueOnce({
        data: { version: '1.0', chipType: 'BM1397', hostname: 'web', macAddr: 'AA:BB' },
      })
      .mockResolvedValueOnce({
        data: { hashRate: 500, hashRateUnit: 'GH/s' },
      });

    const client = new BitAxeClient('192.168.1.100', 80);
    const result = await client.fetchAll();
    expect(result.info).toBeDefined();
    expect(result.status).toBeDefined();
  });

  it('includes auth header in probe via web proxy', async () => {
    mockGetProxyUrl.mockReturnValue('http://localhost:4000');
    mockGetExtra.mockReturnValue({ apiUrl: 'http://localhost:4000' });
    mockGetAuthToken.mockReturnValue('test-token');
    mockAxios.post.mockImplementation(async (_url: string, body: any) => {
      if (body?.url?.includes('/api/system/info')) {
        return { data: { hostname: 'web', chipType: 'BM1397' } };
      }
      if (body?.url?.includes('/api/system/status')) {
        return { data: { hashRate: 500 } };
      }
      return { data: {} };
    });

    const result = await BitAxeClient.probe('192.168.1.100', 80);
    expect(result).not.toBeNull();
    expect(mockAxios.post).toHaveBeenCalledWith(
      'http://localhost:4000/api/proxy',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('probes miner via web proxy', async () => {
    mockAxios.post.mockImplementation(async (_url: string, body: any) => {
      if (body?.url?.includes('/api/system/info')) {
        return { data: { hostname: 'web', chipType: 'BM1397' } };
      }
      if (body?.url?.includes('/api/system/status')) {
        return { data: { hashRate: 500 } };
      }
      return { data: {} };
    });

    const result = await BitAxeClient.probe('192.168.1.100', 80);
    expect(result).not.toBeNull();
    expect(result?.infoPath).toBe('/api/system/info');
  });

  it('includes auth header when proxy URL matches api URL', async () => {
    mockGetProxyUrl.mockReturnValue('http://localhost:4000');
    mockGetExtra.mockReturnValue({ apiUrl: 'http://localhost:4000' });
    mockGetAuthToken.mockReturnValue('test-token');
    mockAxios.post.mockResolvedValue({
      data: { version: '1.0', chipType: 'BM1397', hostname: 'auth', macAddr: 'AA:BB' },
    });

    const client = new BitAxeClient('192.168.1.100', 80);
    await client.getSystemInfo();

    expect(mockAxios.post).toHaveBeenCalledWith(
      'http://localhost:4000/api/proxy',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('includes auth header in restart via proxy', async () => {
    mockGetProxyUrl.mockReturnValue('http://localhost:4000');
    mockGetExtra.mockReturnValue({ apiUrl: 'http://localhost:4000' });
    mockGetAuthToken.mockReturnValue('test-token');
    mockAxios.post.mockResolvedValue({ data: { success: true } });

    const client = new BitAxeClient('192.168.1.100', 80);
    const result = await client.restart();
    expect(result).toBe(true);

    expect(mockAxios.post).toHaveBeenCalledWith(
      'http://localhost:4000/api/proxy/restart',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });
});
