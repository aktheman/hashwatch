import { getLocalSubnet, scanNetwork, DiscoveredMiner } from '../src/discovery/localNetwork';
import { BitAxeClient } from '../src/api/bitaxe';

jest.mock('expo-network', () => ({
  getIpAddressAsync: jest.fn(),
}));

jest.mock('../src/api/bitaxe', () => ({
  BitAxeClient: {
    probe: jest.fn(),
  },
}));

const mockGetIpAddressAsync = require('expo-network').getIpAddressAsync as jest.Mock;
const mockProbe = BitAxeClient.probe as jest.Mock;

describe('localNetwork', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocalSubnet', () => {
    it('returns IP address when valid', async () => {
      mockGetIpAddressAsync.mockResolvedValue('192.168.1.100');
      const result = await getLocalSubnet();
      expect(result).toBe('192.168.1.100');
    });

    it('returns null when IP has no dots', async () => {
      mockGetIpAddressAsync.mockResolvedValue('localhost');
      const result = await getLocalSubnet();
      expect(result).toBeNull();
    });

    it('returns null when IP is empty', async () => {
      mockGetIpAddressAsync.mockResolvedValue('');
      const result = await getLocalSubnet();
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockGetIpAddressAsync.mockRejectedValue(new Error('Network error'));
      const result = await getLocalSubnet();
      expect(result).toBeNull();
    });
  });

  describe('scanNetwork', () => {
    it('returns empty array when no subnet', async () => {
      mockGetIpAddressAsync.mockResolvedValue(null);
      const result = await scanNetwork();
      expect(result).toEqual([]);
    });

    it('discovers miners on network', async () => {
      mockGetIpAddressAsync.mockResolvedValue('192.168.1.100');
      mockProbe.mockImplementation(async (ip: string) => {
        if (ip === '192.168.1.50') {
          return { infoPath: '/api/info', statusPath: '/api/status' };
        }
        return null;
      });

      const result = await scanNetwork(undefined, 5000);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ ip: '192.168.1.50', port: 80 });
    });

    it('calls progress callback', async () => {
      mockGetIpAddressAsync.mockResolvedValue('192.168.1.100');
      mockProbe.mockResolvedValue(null);

      const onProgress = jest.fn();
      await scanNetwork(onProgress, 5000);

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress.mock.calls[0]).toHaveLength(3);
    });

    it('respects abort signal', async () => {
      mockGetIpAddressAsync.mockResolvedValue('192.168.1.100');
      mockProbe.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 100)),
      );

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 50);

      const result = await scanNetwork(undefined, 5000, controller.signal);
      expect(result.length).toBeLessThan(254);
    });

    it('handles probe errors gracefully', async () => {
      mockGetIpAddressAsync.mockResolvedValue('192.168.1.100');
      mockProbe.mockRejectedValue(new Error('Connection refused'));

      const result = await scanNetwork(undefined, 5000);
      expect(result).toEqual([]);
    });

    it('discovers multiple miners', async () => {
      mockGetIpAddressAsync.mockResolvedValue('192.168.1.100');
      mockProbe.mockImplementation(async (ip: string) => {
        if (ip === '192.168.1.50' || ip === '192.168.1.51') {
          return { infoPath: '/api/info', statusPath: '/api/status' };
        }
        return null;
      });

      const result = await scanNetwork(undefined, 5000);
      expect(result).toHaveLength(2);
    });
  });
});
