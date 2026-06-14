import { exportAllData, exportJSON, importFromJSON } from '../src/utils/export';
import { Miner, MinerSnapshot, Wallet } from '../src/types';

const mockLoadMiners = jest.fn();
const mockGetSnapshots = jest.fn();
const mockLoadWallets = jest.fn();
const mockSaveMiner = jest.fn();
const mockSaveSnapshot = jest.fn();
const mockSaveWallet = jest.fn();
const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();

jest.mock('../src/db/database', () => ({
  loadMiners: () => mockLoadMiners(),
  getSnapshots: (id: string, limit: number) => mockGetSnapshots(id, limit),
  loadWallets: () => mockLoadWallets(),
  saveMiner: (m: Miner) => mockSaveMiner(m),
  saveSnapshot: (s: MinerSnapshot) => mockSaveSnapshot(s),
  saveWallet: (w: Wallet) => mockSaveWallet(w),
  getSetting: (k: string) => mockGetSetting(k),
  setSetting: (k: string, v: string) => mockSetSetting(k, v),
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

function setupWebMocks() {
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
}

const sampleMiner: Miner = {
  id: 'm1',
  name: 'TestMiner',
  ip: '192.168.1.1',
  port: 80,
  isOnline: true,
  group: 'Garage',
};

const sampleSnapshot: MinerSnapshot = {
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

const sampleWallet: Wallet = {
  id: 'w1',
  name: 'Main',
  address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  color: '#6C63FF',
  createdAt: 1000,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform = 'web';
  setupWebMocks();
  mockGetSetting.mockResolvedValue(null);
});

describe('exportAllData', () => {
  it('generates CSV and triggers download on web', async () => {
    mockLoadMiners.mockResolvedValue([sampleMiner]);
    mockGetSnapshots.mockResolvedValue([sampleSnapshot]);

    await exportAllData();

    expect(mockLoadMiners).toHaveBeenCalled();
    expect(mockGetSnapshots).toHaveBeenCalledWith('m1', 10000);
    expect((globalThis as any).URL.createObjectURL).toHaveBeenCalled();
    expect((globalThis as any).window.document.createElement).toHaveBeenCalledWith('a');
    expect((globalThis as any).URL.revokeObjectURL).toHaveBeenCalled();
  });
});

describe('exportJSON', () => {
  it('generates JSON with all data', async () => {
    mockLoadMiners.mockResolvedValue([sampleMiner]);
    mockGetSnapshots.mockResolvedValue([sampleSnapshot]);
    mockLoadWallets.mockResolvedValue([sampleWallet]);
    mockGetSetting
      .mockResolvedValueOnce('0.12')
      .mockResolvedValueOnce('true')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await exportJSON();

    expect(mockLoadMiners).toHaveBeenCalled();
    expect(mockLoadWallets).toHaveBeenCalled();
    expect(mockGetSnapshots).toHaveBeenCalledWith('m1', 10000);

    const blobCall = (globalThis as any).URL.createObjectURL.mock.calls[0][0];
    const text = await blobCall.text();
    const parsed = JSON.parse(text);
    expect(parsed.version).toBe(2);
    expect(parsed.miners).toHaveLength(1);
    expect(parsed.miners[0].id).toBe('m1');
    expect(parsed.snapshots).toHaveLength(1);
    expect(parsed.wallets).toHaveLength(1);
    expect(parsed.settings.power_cost).toBe('0.12');
  });
});

describe('importFromJSON', () => {
  it('restores miners, snapshots, wallets, and settings', async () => {
    const json = JSON.stringify({
      version: 2,
      exportedAt: '2025-01-01T00:00:00.000Z',
      miners: [sampleMiner],
      snapshots: [sampleSnapshot],
      wallets: [sampleWallet],
      settings: { power_cost: '0.15' },
    });

    const result = await importFromJSON(json);

    expect(result.miners).toBe(1);
    expect(result.snapshots).toBe(1);
    expect(result.wallets).toBe(1);
    expect(mockSaveMiner).toHaveBeenCalledWith(sampleMiner);
    expect(mockSaveSnapshot).toHaveBeenCalledWith(sampleSnapshot);
    expect(mockSaveWallet).toHaveBeenCalledWith(sampleWallet);
    expect(mockSetSetting).toHaveBeenCalledWith('power_cost', '0.15');
  });

  it('skips snapshots with unknown minerId', async () => {
    const json = JSON.stringify({
      version: 2,
      exportedAt: '2025-01-01T00:00:00.000Z',
      miners: [],
      snapshots: [{ ...sampleSnapshot, minerId: 'nonexistent' }],
      wallets: [],
      settings: {},
    });

    const result = await importFromJSON(json);

    expect(result.snapshots).toBe(1);
    expect(mockSaveSnapshot).not.toHaveBeenCalled();
  });

  it('throws on unsupported version', async () => {
    const json = JSON.stringify({
      version: 1,
      miners: [],
      snapshots: [],
      wallets: [],
      settings: {},
    });

    await expect(importFromJSON(json)).rejects.toThrow('Unsupported backup format version');
  });

  it('throws on invalid JSON', async () => {
    await expect(importFromJSON('not json')).rejects.toThrow();
  });
});
