import { exportAllData } from '../src/utils/export';
import { Miner, MinerSnapshot } from '../src/types';

const mockLoadMiners = jest.fn();
const mockGetSnapshots = jest.fn();

jest.mock('../src/db/database', () => ({
  loadMiners: () => mockLoadMiners(),
  getSnapshots: (id: string, limit: number) => mockGetSnapshots(id, limit),
}));

jest.mock('../src/constants', () => ({
  getExtra: () => ({ apiUrl: 'http://localhost:4000' }),
}));

let mockPlatform = 'web';

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatform;
    },
    select: (obj: Record<string, unknown>) => obj[mockPlatform] || obj.default,
  },
  Share: { share: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform = 'web';
  const click = jest.fn();
  const mockAnchor = { click, href: '', download: '' };
  (globalThis as any).window = {
    document: {
      createElement: jest.fn(() => mockAnchor),
      body: {
        appendChild: jest.fn(() => mockAnchor),
        removeChild: jest.fn(() => mockAnchor),
      },
    },
  };
  (globalThis as any).URL = {
    createObjectURL: jest.fn(() => 'blob:url'),
    revokeObjectURL: jest.fn(),
  };
});

describe('exportAllData', () => {
  it('generates CSV and triggers download on web', async () => {
    const miner: Miner = {
      id: 'm1',
      name: 'TestMiner',
      ip: '192.168.1.1',
      port: 80,
      isOnline: true,
    };
    const snapshot: MinerSnapshot = {
      minerId: 'm1',
      timestamp: 1000000,
      hashRate: 500,
      hashRateUnit: 'GH/s',
      temperature: 50,
      voltage: 1200,
      current: 3.5,
      power: 12,
      sharesAccepted: 100,
      sharesRejected: 1,
      uptimeSeconds: 3600,
      frequency: 400,
    };

    mockLoadMiners.mockResolvedValue([miner]);
    mockGetSnapshots.mockResolvedValue([snapshot]);

    await exportAllData();

    expect(mockLoadMiners).toHaveBeenCalled();
    expect(mockGetSnapshots).toHaveBeenCalledWith('m1', 10000);
    expect((globalThis as any).URL.createObjectURL).toHaveBeenCalled();
    expect((globalThis as any).window.document.createElement).toHaveBeenCalledWith('a');
    expect((globalThis as any).URL.revokeObjectURL).toHaveBeenCalled();
  });
});
