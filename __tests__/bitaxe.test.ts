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
  it('creates client with default paths', () => {
    const client = new BitAxeClient('192.168.1.100', 80);
    expect(client).toBeDefined();
  });

  it('creates client with custom paths', () => {
    const client = new BitAxeClient('192.168.1.100', 80, '/api/info', '/api/status');
    expect(client).toBeDefined();
  });

  describe('probe', () => {
    it('returns null when no paths found', async () => {
      const axios = require('axios').default;
      axios.get.mockRejectedValue(new Error('timeout'));

      const result = await BitAxeClient.probe('192.168.1.100', 80);
      expect(result).toBeNull();
    });
  });
});
