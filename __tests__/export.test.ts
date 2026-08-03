import {
  exportAllData,
  exportJSON,
  exportMinerStatusCSV,
  importFromJSON,
} from '../src/utils/export';
import { Miner, MinerSnapshot, Wallet } from '../src/types';

const mockLoadMiners = jest.fn();
const mockGetSnapshots = jest.fn();
const mockLoadWallets = jest.fn();
const mockSaveMiner = jest.fn();
const mockSaveSnapshot = jest.fn();
const mockSaveWallet = jest.fn();
const mockGetSetting = jest.fn();
const mockSetSetting = jest.fn();
const mockAddMiner = jest.fn();

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

jest.mock('../src/store/miners', () => ({
  useMinerStore: {
    getState: () => ({
      addMiner: mockAddMiner,
    }),
  },
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
  status: {
    hashRate: 500,
    hashRateUnit: 'GH/s',
    temperature: 50,
    vrTemp: 45,
    voltage: 1200,
    current: 3.5,
    power: 12,
    sharesAccepted: 100,
    sharesRejected: 1,
    bestDiff: '1.5M',
    bestSessionDiff: '800K',
    uptimeSeconds: 3600,
    coreVoltage: 1200,
    frequency: 400,
    fanSpeed: 50,
    fanRpm: 3000,
    pool: 'stratum.solomining.io',
    poolPort: 3333,
    poolUser: 'user.worker',
    poolResponseTime: 100,
  },
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

afterAll(() => {
  delete (globalThis as any).window;
  delete (globalThis as any).URL;
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

  it('includes efficiency column in CSV output', async () => {
    mockLoadMiners.mockResolvedValue([sampleMiner]);
    mockGetSnapshots.mockResolvedValue([sampleSnapshot]);

    await exportAllData();

    const mockCreateObjectURL = (globalThis as any).URL.createObjectURL;
    const blob = mockCreateObjectURL.mock.calls[0][0];
    const text = await blob.text();
    expect(text).toContain('Efficiency (J/TH)');
    expect(text).toContain('24.00');
  });

  it('uses Share.share on non-web platform', async () => {
    mockPlatform = 'android';
    mockLoadMiners.mockResolvedValue([sampleMiner]);
    mockGetSnapshots.mockResolvedValue([sampleSnapshot]);
    const mockShare = require('react-native').Share.share;

    await exportAllData();

    expect(mockShare).toHaveBeenCalled();
    expect(mockShare.mock.calls[0][0]).toMatchObject({
      message: expect.stringContaining('Hash Rate'),
      title: expect.stringContaining('hashwatch_export'),
    });
  });

  it('handles empty miners list', async () => {
    mockLoadMiners.mockResolvedValue([]);

    await expect(exportAllData()).resolves.toBeUndefined();
    expect((globalThis as any).URL.createObjectURL).toHaveBeenCalled();
  });
});

describe('exportSnapshotsWithRange', () => {
  let exportSnapshotsWithRange: typeof import('../src/utils/export').exportSnapshotsWithRange;

  beforeAll(async () => {
    exportSnapshotsWithRange = (await import('../src/utils/export')).exportSnapshotsWithRange;
  });

  it('filters snapshots to the requested range', async () => {
    mockLoadMiners.mockResolvedValue([sampleMiner]);
    const inRange: MinerSnapshot = { ...sampleSnapshot, timestamp: 5000 };
    const outOfRange: MinerSnapshot = { ...sampleSnapshot, timestamp: 5_000_000 };
    mockGetSnapshots.mockResolvedValue([inRange, outOfRange]);

    await exportSnapshotsWithRange(1000, 10000);

    const blob = (globalThis as any).URL.createObjectURL.mock.calls[0][0];
    const text = await blob.text();
    expect(text).toContain('00:00:05.000Z');
    expect(text).not.toContain('01:23:20.000Z');
  });

  it('names the file with the date range', async () => {
    mockLoadMiners.mockResolvedValue([sampleMiner]);
    mockGetSnapshots.mockResolvedValue([]);

    const startMs = 1_705_593_600_000;
    const endMs = 1_705_680_000_000;
    await exportSnapshotsWithRange(startMs, endMs);

    const anchor = (globalThis as any).window.document.createElement.mock.results[0].value;
    const start = new Date(startMs).toISOString().slice(0, 10);
    const end = new Date(endMs).toISOString().slice(0, 10);
    expect(anchor.download).toBe(`hashwatch_export_${start}_to_${end}.csv`);
  });

  it('uses Share.share on non-web platform', async () => {
    mockPlatform = 'android';
    mockLoadMiners.mockResolvedValue([sampleMiner]);
    mockGetSnapshots.mockResolvedValue([]);
    const mockShare = require('react-native').Share.share;

    await exportSnapshotsWithRange(0, 1);

    expect(mockShare).toHaveBeenCalled();
    expect(mockShare.mock.calls[0][0].title).toContain('hashwatch_export');
  });
});

describe('exportMinerCSV', () => {
  let exportMinerCSV: typeof import('../src/utils/export').exportMinerCSV;

  beforeAll(async () => {
    exportMinerCSV = (await import('../src/utils/export')).exportMinerCSV;
  });

  it('exports a single miner with a sanitized filename', async () => {
    mockLoadMiners.mockResolvedValue([sampleMiner]);
    mockGetSnapshots.mockResolvedValue([sampleSnapshot]);

    await exportMinerCSV('m1');

    const anchor = (globalThis as any).window.document.createElement.mock.results[0].value;
    expect(anchor.download).toContain('hashwatch_TestMiner');
    const blob = (globalThis as any).URL.createObjectURL.mock.calls[0][0];
    const text = await blob.text();
    expect(text).toContain('TestMiner');
  });

  it('does nothing when the miner is not found', async () => {
    mockLoadMiners.mockResolvedValue([sampleMiner]);

    await expect(exportMinerCSV('missing')).resolves.toBeUndefined();
    expect((globalThis as any).URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe('exportMinerStatusCSV', () => {
  it('generates current miner status CSV', async () => {
    mockLoadMiners.mockResolvedValue([sampleMiner]);
    mockGetSetting.mockResolvedValue('0.12');

    await exportMinerStatusCSV();

    const blob = (globalThis as any).URL.createObjectURL.mock.calls[0][0];
    const text = await blob.text();
    expect(text).toContain('Name');
    expect(text).toContain('TestMiner');
    expect(text).toContain('192.168.1.1');
    expect(text).toContain('stratum.solomining.io');
    expect(text).toContain('Cost/Day');
  });

  it('handles empty miner list', async () => {
    mockLoadMiners.mockResolvedValue([]);

    await expect(exportMinerStatusCSV()).resolves.toBeUndefined();
  });

  it('uses Share.share on non-web platform', async () => {
    mockPlatform = 'ios';
    mockLoadMiners.mockResolvedValue([sampleMiner]);
    const mockShare = require('react-native').Share.share;

    await exportMinerStatusCSV();

    expect(mockShare).toHaveBeenCalled();
    expect(mockShare.mock.calls[0][0]).toMatchObject({
      title: expect.stringContaining('hashwatch_miners'),
    });
  });
});

describe('escapeCSV (internal)', () => {
  it('escapes commas, quotes, and newlines in CSV values', async () => {
    const minerWithComma: Miner = {
      ...sampleMiner,
      name: 'Miner, "A" & B\nLine2',
      ip: 'safe',
    };
    mockLoadMiners.mockResolvedValue([minerWithComma]);
    mockGetSnapshots.mockResolvedValue([sampleSnapshot]);

    await exportAllData();

    const mockCreateObjectURL = (globalThis as any).URL.createObjectURL;
    const blob = mockCreateObjectURL.mock.calls[0][0];
    const text = await blob.text();
    expect(text).toContain('"Miner, ""A"" & B');
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

  it('handles missing settings gracefully', async () => {
    const json = JSON.stringify({
      version: 2,
      exportedAt: '2025-01-01T00:00:00.000Z',
      miners: [],
      snapshots: [],
      wallets: [],
    });
    const result = await importFromJSON(json);
    expect(result.miners).toBe(0);
  });
});

describe('previewCSV', () => {
  let previewCSV: typeof import('../src/utils/export').previewCSV;

  beforeAll(async () => {
    previewCSV = (await import('../src/utils/export')).previewCSV;
  });

  it('returns empty result and error for empty input', () => {
    const result = previewCSV('');
    expect(result.valid).toEqual([]);
    expect(result.errors[0]).toContain('header');
  });

  it('returns error when name column is missing', () => {
    const result = previewCSV('ip,port\n192.168.1.1,80');
    expect(result.errors[0]).toContain('name');
  });

  it('parses valid rows with a default port when omitted', () => {
    const result = previewCSV('name,ip\nMiner1,192.168.1.1\nMiner2,192.168.1.2');
    expect(result.errors).toEqual([]);
    expect(result.valid).toEqual([
      { name: 'Miner1', ip: '192.168.1.1', port: 80 },
      { name: 'Miner2', ip: '192.168.1.2', port: 80 },
    ]);
  });

  it('reports rows missing name or IP', () => {
    const result = previewCSV('name,ip,port\n,192.168.1.1,80\nMiner2,,80');
    expect(result.valid).toHaveLength(0);
    expect(result.errors.length).toBe(2);
  });
});

describe('importFromCSV', () => {
  let importFromCSV: typeof import('../src/utils/export').importFromCSV;

  beforeAll(async () => {
    importFromCSV = (await import('../src/utils/export')).importFromCSV;
  });

  it('returns error for empty CSV', async () => {
    const result = await importFromCSV('');
    expect(result.imported).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error for header-only CSV', async () => {
    const result = await importFromCSV('name,ip,port');
    expect(result.imported).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error when name column is missing', async () => {
    const result = await importFromCSV('ip,port\n192.168.1.1,80');
    expect(result.imported).toBe(0);
    expect(result.errors[0]).toContain('name');
  });

  it('reports error row when name or ip is empty', async () => {
    const result = await importFromCSV('name,ip,port\n,192.168.1.1,80\nMiner2,,80');
    expect(result.imported).toBe(0);
    expect(result.errors.length).toBe(2);
  });

  it('imports valid rows and reports errors for failures', async () => {
    const result = await importFromCSV(
      'name,ip,port\nMiner1,192.168.1.1,80\nMiner2,192.168.1.2,80',
    );
    expect(result.imported).toBe(2);
    expect(result.errors.length).toBe(0);
  });

  it('uses default port 80 when port column is missing', async () => {
    await importFromCSV('name,ip\nMiner1,192.168.1.1');
  });

  it('reports the error message when addMiner throws', async () => {
    mockAddMiner.mockRejectedValueOnce(new Error('pro limit reached'));
    const result = await importFromCSV('name,ip\nMiner1,192.168.1.1');
    expect(result.imported).toBe(0);
    expect(result.errors[0]).toContain('pro limit reached');
    expect(mockAddMiner).toHaveBeenCalledWith('192.168.1.1', 80, 'Miner1');
  });
});
