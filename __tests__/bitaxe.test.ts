import { BitAxeClient } from '../src/api/bitaxe';

jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
      get: jest.fn(),
      post: jest.fn(),
    },
    __mockAxiosInstance: mockAxiosInstance,
  };
});

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('../src/constants', () => ({
  getProxyUrl: () => 'http://localhost:4567',
  getExtra: () => ({ apiUrl: 'http://localhost:4000' }),
}));

jest.mock('../src/store/authToken', () => ({
  getAuthToken: () => null,
}));

describe('BitAxeClient', () => {
  let mockAxiosInstance: { get: jest.Mock; post: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosInstance = require('axios').__mockAxiosInstance;
  });

  it('creates client with default paths', () => {
    const client = new BitAxeClient('192.168.1.100', 80);
    expect(client).toBeDefined();
  });

  it('creates client with custom paths', () => {
    const client = new BitAxeClient('192.168.1.100', 80, '/api/info', '/api/status');
    expect(client).toBeDefined();
  });

  describe('getSystemInfo', () => {
    it('returns parsed system info', async () => {
      const client = new BitAxeClient('192.168.1.100', 80);
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          version: '1.0.0',
          chipType: 'BM1397',
          hostname: 'bitaxe-test',
          macAddr: 'AA:BB:CC:DD:EE:FF',
          ip: '192.168.1.100',
          wifi: { ssid: 'TestNet', signal: -50 },
          powerMode: 'normal',
        },
      });

      const info = await client.getSystemInfo();
      expect(info.hostname).toBe('bitaxe-test');
      expect(info.chipType).toBe('BM1397');
      expect(info.ssid).toBe('TestNet');
    });

    it('generates hostname from macAddr when missing', async () => {
      const client = new BitAxeClient('192.168.1.100', 80);
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          version: '1.0.0',
          chipType: 'BM1397',
          macAddr: 'AABBCCDDEEFF',
        },
      });

      const info = await client.getSystemInfo();
      expect(info.hostname).toBe('bitaxe-EEFF');
    });

    it('uses fallback hostname when both missing', async () => {
      const client = new BitAxeClient('192.168.1.100', 80);
      mockAxiosInstance.get.mockResolvedValue({
        data: { version: '1.0.0', chipType: 'BM1397' },
      });

      const info = await client.getSystemInfo();
      expect(info.hostname).toBe('bitaxe-unknown');
    });
  });

  describe('getMinerStatus', () => {
    it('returns parsed miner status', async () => {
      const client = new BitAxeClient('192.168.1.100', 80);
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          hashRate: 500,
          hashRateUnit: 'GH/s',
          temperature: 55,
          vrTemp: 60,
          voltage: 12,
          current: 5,
          power: 60,
          sharesAccepted: 100,
          sharesRejected: 2,
          bestDiff: '1.5G',
          bestSessionDiff: '500M',
          uptimeSeconds: 3600,
          coreVoltage: 1.2,
          frequency: 400,
          fanSpeed: 80,
          fanRpm: 3000,
          pool: 'stratum+tcp://pool.example.com',
          poolPort: 3333,
          poolUser: 'worker1',
          poolResponseTime: 150,
        },
      });

      const status = await client.getMinerStatus();
      expect(status.hashRate).toBe(500);
      expect(status.temperature).toBe(55);
      expect(status.sharesAccepted).toBe(100);
      expect(status.pool).toBe('stratum+tcp://pool.example.com');
    });

    it('defaults invalid hashRateUnit to GH/s', async () => {
      const client = new BitAxeClient('192.168.1.100', 80);
      mockAxiosInstance.get.mockResolvedValue({
        data: { hashRate: 500, hashRateUnit: 'invalid' },
      });

      const status = await client.getMinerStatus();
      expect(status.hashRateUnit).toBe('GH/s');
    });

    it('handles missing fields with defaults', async () => {
      const client = new BitAxeClient('192.168.1.100', 80);
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      const status = await client.getMinerStatus();
      expect(status.hashRate).toBe(0);
      expect(status.temperature).toBe(0);
      expect(status.sharesAccepted).toBe(0);
    });

    it('uses alternate field names', async () => {
      const client = new BitAxeClient('192.168.1.100', 80);
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          hashrate: 300,
          temp: 45,
          coreVoltageActual: 1.1,
          actualFrequency: 350,
          fanspeed: 70,
          fanrpm: 2500,
          stratumURL: 'pool2.example.com',
          stratumPort: 4444,
          stratumUser: 'worker2',
          responseTime: 200,
        },
      });

      const status = await client.getMinerStatus();
      expect(status.temperature).toBe(45);
      expect(status.coreVoltage).toBe(1.1);
      expect(status.pool).toBe('pool2.example.com');
    });
  });

  describe('fetchAll', () => {
    it('returns both info and status', async () => {
      const client = new BitAxeClient('192.168.1.100', 80);
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: { version: '1.0', chipType: 'BM1397', hostname: 'test', macAddr: 'AA:BB' },
        })
        .mockResolvedValueOnce({
          data: { hashRate: 500, hashRateUnit: 'GH/s' },
        });

      const result = await client.fetchAll();
      expect(result.info).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });

  describe('restart', () => {
    it('returns true on success', async () => {
      const client = new BitAxeClient('192.168.1.100', 80);
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      const result = await client.restart();
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      const client = new BitAxeClient('192.168.1.100', 80);
      mockAxiosInstance.post.mockRejectedValue(new Error('Failed'));

      const result = await client.restart();
      expect(result).toBe(false);
    });
  });

  describe('probe', () => {
    it('returns null when no paths found', async () => {
      const axios = require('axios').default;
      axios.get.mockRejectedValue(new Error('timeout'));

      const result = await BitAxeClient.probe('192.168.1.100', 80);
      expect(result).toBeNull();
    });

    it('returns paths when bitaxe found', async () => {
      const axios = require('axios').default;
      axios.get.mockImplementation(async (url: string) => {
        if (url.includes('/api/system/info')) {
          return { data: { hostname: 'bitaxe', chipType: 'BM1397' } };
        }
        if (url.includes('/api/system/status')) {
          return { data: { hashRate: 500 } };
        }
        throw new Error('not found');
      });

      const result = await BitAxeClient.probe('192.168.1.100', 80);
      expect(result).not.toBeNull();
      expect(result?.infoPath).toBe('/api/system/info');
    });
  });
});
