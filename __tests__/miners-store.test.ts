import { act } from '@testing-library/react-native';
import { useMinerStore } from '../src/store/miners';

const mockSaveMiner = jest.fn();
const mockDeleteMiner = jest.fn();
const mockSaveSnapshot = jest.fn();
const mockLoadMiners = jest.fn().mockResolvedValue([]);
const mockGetSnapshots = jest.fn().mockResolvedValue([]);
const mockCleanupOldSnapshots = jest.fn();

jest.mock('../src/db/database', () => ({
  loadMiners: () => mockLoadMiners(),
  saveMiner: (m: unknown) => mockSaveMiner(m),
  deleteMiner: (id: string) => mockDeleteMiner(id),
  saveSnapshot: (s: unknown) => mockSaveSnapshot(s),
  getSnapshots: (id: string, limit: number) => mockGetSnapshots(id, limit),
  cleanupOldSnapshots: () => mockCleanupOldSnapshots(),
}));

const mockFetchAll = jest.fn();
const mockProbe = jest.fn();
const mockCreateRemoteMiner = jest.fn();
const mockDeleteRemoteMiner = jest.fn();
const mockSyncMinersWithBackend = jest.fn();
const mockCheckMinerAlerts = jest.fn();
const mockUpdateWidget = jest.fn();

jest.mock('../src/api/bitaxe', () => ({
  BitAxeClient: class {
    static probe = (...args: unknown[]) => mockProbe(...args);
    fetchAll = () => mockFetchAll();
    getSystemInfo = () => Promise.resolve({ hostname: 'test-miner' });
    getMinerStatus = () => Promise.resolve({});
  },
}));

jest.mock('../src/services/minerSync', () => ({
  createRemoteMiner: (m: unknown) => mockCreateRemoteMiner(m),
  deleteRemoteMiner: (id: string) => mockDeleteRemoteMiner(id),
  syncMinersWithBackend: (m: unknown) => mockSyncMinersWithBackend(m),
}));

jest.mock('../src/services/notifications', () => ({
  checkMinerAlerts: (p: unknown, c: unknown) => mockCheckMinerAlerts(p, c),
}));

jest.mock('../src/services/widget', () => ({
  updateWidget: (...args: unknown[]) => mockUpdateWidget(...args),
}));

const mockPushStats = jest.fn().mockResolvedValue(undefined);
const mockFetchStats = jest.fn();
const mockUpdateMinerAPI = jest.fn().mockResolvedValue(undefined);
jest.mock('../src/api/client', () => ({
  pushStats: (...args: unknown[]) => mockPushStats(...args),
  fetchStats: (...args: unknown[]) => mockFetchStats(...args),
  updateMinerAPI: (...args: unknown[]) => mockUpdateMinerAPI(...args),
}));

let mockAuthToken: string | null = null;
let onAuthLoginCb: (() => void) | null = null;
jest.mock('../src/store/authToken', () => ({
  getAuthToken: () => mockAuthToken,
  onAuthLogin: (cb: () => void) => {
    onAuthLoginCb = cb;
  },
}));

beforeEach(() => {
  useMinerStore.setState({
    miners: [],
    loading: false,
    initialized: false,
    scanning: false,
    scanProgress: null,
    error: null,
  });
  jest.clearAllMocks();
});

describe('loadMiners', () => {
  it('loads miners from DB and sets initialized', async () => {
    const miners = [{ id: '1', name: 'Miner 1' }];
    mockLoadMiners.mockResolvedValue(miners);

    await useMinerStore.getState().loadMiners();

    const state = useMinerStore.getState();
    expect(state.miners).toEqual(miners);
    expect(state.initialized).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('sets error on failure', async () => {
    mockLoadMiners.mockRejectedValue(new Error('DB error'));

    await useMinerStore.getState().loadMiners();

    const state = useMinerStore.getState();
    expect(state.error).toBe('DB error');
    expect(state.initialized).toBe(true);
  });
});

describe('addMiner', () => {
  const mockInfo = { hostname: 'axe-123' };
  const mockStatus = { hashRate: 500, temperature: 55 };

  beforeEach(() => {
    mockProbe.mockResolvedValue({ infoPath: '/api/info', statusPath: '/api/status' });
    mockFetchAll.mockResolvedValue({ info: { hostname: 'test-miner' }, status: mockStatus });
    jest.useFakeTimers({ now: 1000000 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('probes, fetches info, and adds miner', async () => {
    await useMinerStore.getState().addMiner('192.168.1.100');

    const state = useMinerStore.getState();
    expect(state.miners).toHaveLength(1);
    expect(state.miners[0].ip).toBe('192.168.1.100');
    expect(state.miners[0].name).toContain('test-miner');
    expect(state.miners[0].isOnline).toBe(true);
    expect(mockSaveMiner).toHaveBeenCalled();
    expect(mockSaveSnapshot).toHaveBeenCalled();
  });

  it('rejects duplicate IP', async () => {
    useMinerStore.setState({
      miners: [{ id: '1', ip: '192.168.1.100', port: 80 } as never],
    });

    await expect(useMinerStore.getState().addMiner('192.168.1.100')).rejects.toThrow(
      'already added',
    );
  });

  it('throws if no BitAxe found at IP', async () => {
    mockProbe.mockResolvedValue(null);

    await expect(useMinerStore.getState().addMiner('192.168.1.200')).rejects.toThrow(
      'No BitAxe miner found at 192.168.1.200',
    );
  });
});

describe('removeMiner', () => {
  it('removes miner from store and DB', async () => {
    useMinerStore.setState({
      miners: [{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80 } as never],
    });

    await useMinerStore.getState().removeMiner('m1');

    expect(useMinerStore.getState().miners).toHaveLength(0);
    expect(mockDeleteMiner).toHaveBeenCalledWith('m1');
  });

  it('deletes remote miner if remoteId exists', async () => {
    const miner = {
      id: 'm1',
      name: 'Test',
      ip: '1.2.3.4',
      port: 80,
      remoteId: 'remote-1',
    };
    useMinerStore.setState({ miners: [miner as never] });

    mockAuthToken = 'abc';

    await useMinerStore.getState().removeMiner('m1');

    expect(mockDeleteRemoteMiner).toHaveBeenCalledWith('remote-1');
    mockAuthToken = null;
  });
});

describe('refreshMiner', () => {
  it('updates miner status and saves snapshot', async () => {
    const miner = {
      id: 'm1',
      name: 'Test',
      ip: '1.2.3.4',
      port: 80,
      apiPath: '/api/info',
      statusPath: '/api/status',
      info: {},
      status: {},
      isOnline: true,
    };
    useMinerStore.setState({ miners: [miner as never] });
    mockFetchAll.mockResolvedValue({
      info: { hostname: 'test' },
      status: { hashRate: 600, temperature: 60 },
    });

    await useMinerStore.getState().refreshMiner('m1');

    const updated = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(updated?.isOnline).toBe(true);
    expect(mockSaveSnapshot).toHaveBeenCalled();
  });

  it('marks miner offline on error', async () => {
    const miner = {
      id: 'm1',
      name: 'Test',
      ip: '1.2.3.4',
      port: 80,
      apiPath: '/api/info',
      statusPath: '/api/status',
    };
    useMinerStore.setState({ miners: [miner as never] });
    mockFetchAll.mockRejectedValue(new Error('timeout'));

    await useMinerStore.getState().refreshMiner('m1');

    const updated = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(updated?.isOnline).toBe(false);
  });
});

describe('addMiner with auth', () => {
  const mockInfoAuth = { hostname: 'axe-123' };

  beforeEach(() => {
    mockProbe.mockResolvedValue({ infoPath: '/api/info', statusPath: '/api/status' });
  });

  it('creates remote miner when authenticated', async () => {
    mockAuthToken = 'test-token';
    mockCreateRemoteMiner.mockResolvedValue('remote-123');
    await useMinerStore.getState().addMiner('192.168.1.100');
    expect(mockCreateRemoteMiner).toHaveBeenCalled();
    const miner = useMinerStore.getState().miners.find((m) => m.ip === '192.168.1.100');
    expect(miner?.remoteId).toBe('remote-123');
    mockAuthToken = null;
  });
});

describe('refreshMiner with auth', () => {
  it('pushes stats when authenticated and has remoteId', async () => {
    const miner = {
      id: 'm1',
      name: 'Test',
      ip: '1.2.3.4',
      port: 80,
      apiPath: '/api/info',
      statusPath: '/api/status',
      remoteId: 'remote-1',
      info: {},
      status: {},
      isOnline: true,
    };
    useMinerStore.setState({ miners: [miner as never] });
    mockFetchAll.mockResolvedValue({
      info: { hostname: 'test' },
      status: { hashRate: 600, temperature: 60 },
    });
    mockAuthToken = 'test-token';

    await useMinerStore.getState().refreshMiner('m1');

    expect(mockPushStats).toHaveBeenCalled();
    mockAuthToken = null;
  });
});

describe('addMiner error edge cases', () => {
  it('formats non-Error thrown during add as string', async () => {
    mockProbe.mockRejectedValue('string error');
    await expect(useMinerStore.getState().addMiner('192.168.1.100')).rejects.toBe('string error');
    expect(useMinerStore.getState().error).toContain('192.168.1.100');
  });
});

describe('refreshMiner probe recovery', () => {
  it('recovers by probing when apiPath is missing', async () => {
    const miner = {
      id: 'm1',
      name: 'Test',
      ip: '1.2.3.4',
      port: 80,
      info: {},
      status: {},
    };
    useMinerStore.setState({ miners: [miner as never] });
    mockFetchAll.mockRejectedValue(new Error('fail'));
    mockProbe.mockResolvedValue({ infoPath: '/api/new', statusPath: '/api/status' });

    await useMinerStore.getState().refreshMiner('m1');

    expect(mockProbe).toHaveBeenCalledWith('1.2.3.4', 80);
    const updated = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(updated?.apiPath).toBe('/api/new');
  });

  it('stays offline when probe also fails', async () => {
    const miner = {
      id: 'm1',
      name: 'Test',
      ip: '1.2.3.4',
      port: 80,
      info: {},
      status: {},
    };
    useMinerStore.setState({ miners: [miner as never] });
    mockFetchAll.mockRejectedValue(new Error('fail'));
    mockProbe.mockRejectedValue(new Error('probe fail'));

    await useMinerStore.getState().refreshMiner('m1');

    expect(mockProbe).toHaveBeenCalled();
    const updated = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(updated?.isOnline).toBe(false);
  });
});

describe('loadMiners catch edge case', () => {
  it('handles non-Error thrown during load', async () => {
    mockLoadMiners.mockRejectedValue('DB string error');
    await useMinerStore.getState().loadMiners();
    expect(useMinerStore.getState().error).toBe('DB string error');
  });
});

describe('refreshAll', () => {
  it('refreshes all miners', async () => {
    const miners = [
      {
        id: 'm1',
        name: 'M1',
        ip: '1.2.3.4',
        port: 80,
        info: {},
        status: { hashRate: 500, hashRateUnit: 'TH/s' },
      },
      {
        id: 'm2',
        name: 'M2',
        ip: '1.2.3.5',
        port: 80,
        info: {},
        status: { hashRate: 300, hashRateUnit: 'TH/s' },
      },
    ];
    useMinerStore.setState({ miners: miners as never });

    mockFetchAll.mockResolvedValue({
      info: { hostname: 'test' },
      status: { hashRate: 500, temperature: 50 },
    });

    await useMinerStore.getState().refreshAll();

    expect(mockCheckMinerAlerts).toHaveBeenCalled();
    expect(mockUpdateWidget).toHaveBeenCalled();
  });
});

describe('setMinerWallet', () => {
  it('sets wallet ID on miner', async () => {
    useMinerStore.setState({
      miners: [{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80 } as never],
    });

    await useMinerStore.getState().setMinerWallet('m1', 'wallet-1');

    const updated = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(updated?.walletId).toBe('wallet-1');
    expect(mockSaveMiner).toHaveBeenCalled();
  });

  it('clears wallet ID when undefined', async () => {
    useMinerStore.setState({
      miners: [{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80, walletId: 'wallet-1' } as never],
    });

    await useMinerStore.getState().setMinerWallet('m1', undefined);

    const updated = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(updated?.walletId).toBeUndefined();
  });
});

describe('clearError', () => {
  it('clears the error state', () => {
    useMinerStore.setState({ error: 'some error' });
    useMinerStore.getState().clearError();
    expect(useMinerStore.getState().error).toBeNull();
  });
});

describe('getSnapshots', () => {
  it('delegates to DB', async () => {
    mockGetSnapshots.mockResolvedValue([{ minerId: 'm1', timestamp: 100 }]);
    const result = await useMinerStore.getState().getSnapshots('m1', 50);
    expect(mockGetSnapshots).toHaveBeenCalledWith('m1', 50);
    expect(result).toEqual([{ minerId: 'm1', timestamp: 100 }]);
  });

  it('merges remote stats when authenticated and remoteId exists', async () => {
    mockGetSnapshots.mockResolvedValue([{ minerId: 'm1', timestamp: 100, hashRate: 500 }]);
    mockFetchStats.mockResolvedValue([
      { minerId: 'm1', timestamp: 200, hashRate: 600 },
      { minerId: 'm1', timestamp: 150, hashRate: 550 },
    ]);
    mockAuthToken = 'test-token';
    useMinerStore.setState({
      miners: [{ id: 'm1', remoteId: 'remote-1', ip: '1.2.3.4', port: 80 } as never],
    });

    const result = await useMinerStore.getState().getSnapshots('m1', 100);

    expect(mockFetchStats).toHaveBeenCalledWith('remote-1');
    expect(result).toHaveLength(3);
    expect(result[0].timestamp).toBe(100);
    expect(result[1].timestamp).toBe(150);
    expect(result[2].timestamp).toBe(200);
    mockAuthToken = null;
  });

  it('skips remote fetch when unauthenticated', async () => {
    mockGetSnapshots.mockResolvedValue([{ minerId: 'm1', timestamp: 100 }]);
    mockAuthToken = null;
    useMinerStore.setState({
      miners: [{ id: 'm1', remoteId: 'remote-1', ip: '1.2.3.4', port: 80 } as never],
    });

    await useMinerStore.getState().getSnapshots('m1', 100);

    expect(mockFetchStats).not.toHaveBeenCalled();
  });

  it('handles remote fetch failure gracefully', async () => {
    mockGetSnapshots.mockResolvedValue([{ minerId: 'm1', timestamp: 100 }]);
    mockFetchStats.mockRejectedValue(new Error('network error'));
    mockAuthToken = 'test-token';
    useMinerStore.setState({
      miners: [{ id: 'm1', remoteId: 'remote-1', ip: '1.2.3.4', port: 80 } as never],
    });

    const result = await useMinerStore.getState().getSnapshots('m1', 100);

    expect(result).toEqual([{ minerId: 'm1', timestamp: 100 }]);
    mockAuthToken = null;
  });
});

describe('syncWithBackend', () => {
  it('calls syncMinersWithBackend and updates miners', async () => {
    const existing = [
      { id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80, remoteId: 'r1' },
    ] as never[];
    useMinerStore.setState({ miners: existing });
    mockAuthToken = 'test-token';
    const synced = [{ id: 'm1', remoteId: 'r1', remoteUpdated: true }];
    mockSyncMinersWithBackend.mockResolvedValue(synced);

    await useMinerStore.getState().syncWithBackend();

    expect(mockSyncMinersWithBackend).toHaveBeenCalledWith(existing);
    expect(useMinerStore.getState().miners).toEqual(synced);
    mockAuthToken = null;
  });

  it('skips sync when unauthenticated', async () => {
    mockAuthToken = null;
    await useMinerStore.getState().syncWithBackend();
    expect(mockSyncMinersWithBackend).not.toHaveBeenCalled();
  });
});

describe('applyRemoteSnapshot', () => {
  const snapshot = {
    minerId: 'm1',
    timestamp: 2000,
    hashRate: 700,
    hashRateUnit: 'GH/s',
    temperature: 65,
    voltage: 1200,
    current: 500,
    power: 150,
    sharesAccepted: 100,
    sharesRejected: 2,
    uptimeSeconds: 3600,
    frequency: 600,
  };

  it('saves snapshot and updates miner status', async () => {
    const miner = {
      id: 'm1',
      name: 'Test',
      ip: '1.2.3.4',
      port: 80,
      status: {
        hashRate: 0,
        temperature: 0,
        voltage: 0,
        current: 0,
        power: 0,
        sharesAccepted: 0,
        sharesRejected: 0,
        uptimeSeconds: 0,
        frequency: 0,
      },
    };
    useMinerStore.setState({ miners: [miner as never] });

    await useMinerStore.getState().applyRemoteSnapshot('m1', snapshot);

    expect(mockSaveSnapshot).toHaveBeenCalled();
    expect(mockSaveMiner).toHaveBeenCalled();
    const updated = useMinerStore.getState().miners[0];
    expect(updated.status.hashRate).toBe(700);
    expect(updated.isOnline).toBe(true);
    expect(updated.lastSeen).toBe(2000);
  });

  it('does nothing if miner not found', async () => {
    await useMinerStore.getState().applyRemoteSnapshot('nonexistent', snapshot);
    expect(mockSaveSnapshot).not.toHaveBeenCalled();
  });

  it('saves snapshot but skips status update when miner has no status', async () => {
    useMinerStore.setState({
      miners: [{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80 } as never],
    });
    await useMinerStore.getState().applyRemoteSnapshot('m1', snapshot);
    expect(mockSaveSnapshot).toHaveBeenCalled();
    expect(mockSaveMiner).not.toHaveBeenCalled();
  });
});

describe('setMinerWallet persistence', () => {
  it('saves miner with updated walletId to DB', async () => {
    mockAuthToken = 'test-token';
    useMinerStore.setState({
      miners: [{ id: 'm1', name: 'OldName', ip: '1.2.3.4', port: 80, remoteId: 'r1' } as never],
    });

    await useMinerStore.getState().setMinerWallet('m1', 'wallet-1');

    expect(mockSaveMiner).toHaveBeenCalledWith(expect.objectContaining({ walletId: 'wallet-1' }));
    mockAuthToken = null;
  });

  it('clears walletId when undefined', async () => {
    mockAuthToken = null;
    useMinerStore.setState({
      miners: [{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80, walletId: 'w1' } as never],
    });

    await useMinerStore.getState().setMinerWallet('m1', undefined);

    expect(mockSaveMiner).toHaveBeenCalledWith(expect.objectContaining({ walletId: undefined }));
  });
});

describe('loadMiners with auth', () => {
  it('calls syncWithBackend when token is present', async () => {
    mockLoadMiners.mockResolvedValue([]);
    mockAuthToken = 'test-token';

    await useMinerStore.getState().loadMiners();

    expect(mockSyncMinersWithBackend).toHaveBeenCalled();
    mockAuthToken = null;
  });

  it('skips syncWithBackend when token is null', async () => {
    mockLoadMiners.mockResolvedValue([]);
    mockAuthToken = null;

    await useMinerStore.getState().loadMiners();

    expect(mockSyncMinersWithBackend).not.toHaveBeenCalled();
  });

  it('setMinerGroup updates miner group field', async () => {
    mockLoadMiners.mockResolvedValue([
      { id: 'm1', name: 'Miner', ip: '10.0.0.1', port: 80, isOnline: true, group: 'Old' },
    ]);
    await useMinerStore.getState().loadMiners();
    await act(async () => {});

    await useMinerStore.getState().setMinerGroup('m1', 'Garage');

    expect(mockSaveMiner).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', group: 'Garage' }),
    );
    const miner = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(miner?.group).toBe('Garage');
  });

  describe('setMinerGroup missing miner', () => {
    it('does nothing when miner not found', async () => {
      await useMinerStore.getState().setMinerGroup('nonexistent', 'Garage');
      expect(mockSaveMiner).not.toHaveBeenCalled();
    });
  });

  describe('getSnapshots merge logic', () => {
    it('deduplicates remote snapshots by timestamp', async () => {
      mockGetSnapshots.mockResolvedValue([{ minerId: 'm1', timestamp: 100, hashRate: 500 }]);
      mockFetchStats.mockResolvedValue([
        { minerId: 'm1', timestamp: 100, hashRate: 999 },
        { minerId: 'm1', timestamp: 200, hashRate: 600 },
      ]);
      mockAuthToken = 'test-token';
      useMinerStore.setState({
        miners: [{ id: 'm1', remoteId: 'remote-1', ip: '1.2.3.4', port: 80 } as never],
      });

      const result = await useMinerStore.getState().getSnapshots('m1', 100);

      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(100);
      expect((result[0] as (typeof result)[0] & { hashRate: number }).hashRate).toBe(500);
      expect(result[1].timestamp).toBe(200);
      mockAuthToken = null;
    });

    it('skips remote entries with timestamp 0', async () => {
      mockGetSnapshots.mockResolvedValue([{ minerId: 'm1', timestamp: 100 }]);
      mockFetchStats.mockResolvedValue([{ minerId: 'm1', timestamp: 0, hashRate: 600 }]);
      mockAuthToken = 'test-token';
      useMinerStore.setState({
        miners: [{ id: 'm1', remoteId: 'remote-1', ip: '1.2.3.4', port: 80 } as never],
      });

      const result = await useMinerStore.getState().getSnapshots('m1', 100);

      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBe(100);
      mockAuthToken = null;
    });
  });

  describe('refreshAll with no miners', () => {
    it('skips checkMinerAlerts when no miners exist', async () => {
      await useMinerStore.getState().refreshAll();
      expect(mockCheckMinerAlerts).not.toHaveBeenCalled();
    });
  });

  it('setMinerGroup clears group when undefined', async () => {
    mockLoadMiners.mockResolvedValue([
      { id: 'm1', name: 'Miner', ip: '10.0.0.1', port: 80, isOnline: true, group: 'Old' },
    ]);
    await useMinerStore.getState().loadMiners();
    await act(async () => {});

    await useMinerStore.getState().setMinerGroup('m1', undefined);

    expect(mockSaveMiner).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', group: undefined }),
    );
    const miner = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(miner?.group).toBeUndefined();
  });
});

describe('setMinerName', () => {
  it('updates miner name in store and persists', async () => {
    mockLoadMiners.mockResolvedValue([
      { id: 'm1', name: 'Old Name', ip: '10.0.0.1', port: 80, isOnline: true },
    ]);
    await useMinerStore.getState().loadMiners();
    await act(async () => {});

    await useMinerStore.getState().setMinerName('m1', 'New Name');

    expect(mockSaveMiner).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', name: 'New Name' }),
    );
    const miner = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(miner?.name).toBe('New Name');
  });

  it('returns early when miner is not found', async () => {
    const saveBefore = mockSaveMiner.mock.calls.length;
    await useMinerStore.getState().setMinerName('nonexistent', 'New Name');
    expect(mockSaveMiner).toHaveBeenCalledTimes(saveBefore);
  });
});

describe('refreshMiner missing ID', () => {
  it('returns early when miner is not found', async () => {
    const saveMinerBefore = mockSaveMiner.mock.calls.length;
    await useMinerStore.getState().refreshMiner('nonexistent');
    expect(mockSaveMiner).toHaveBeenCalledTimes(saveMinerBefore);
  });
});

describe('cloneMiner', () => {
  it('creates a clone of the miner with copy name and cleared fields', async () => {
    const miner = {
      id: 'm1',
      name: 'TestMiner',
      ip: '1.2.3.4',
      port: 80,
      group: 'Lab',
      walletId: 'w1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'GH/s', temperature: 45 },
      info: { hostname: 'test' },
      lastSeen: 1000,
      addedAt: 500,
      remoteId: 'remote-1',
    };
    useMinerStore.setState({ miners: [miner as never] });
    jest.useFakeTimers({ now: 2000 });

    await useMinerStore.getState().cloneMiner('m1');

    const state = useMinerStore.getState();
    expect(state.miners).toHaveLength(2);
    const clone = state.miners.find((m) => m.id !== 'm1')!;
    expect(clone.name).toBe('TestMiner (copy)');
    expect(clone.ip).toBe('1.2.3.4');
    expect(clone.group).toBe('Lab');
    expect(clone.walletId).toBe('w1');
    expect(clone.status).toBeUndefined();
    expect(clone.info).toBeUndefined();
    expect(clone.lastSeen).toBeUndefined();
    expect(clone.remoteId).toBeUndefined();
    expect(clone.addedAt).toBe(2000);
    expect(mockSaveMiner).toHaveBeenCalledWith(clone);
    jest.useRealTimers();
  });

  it('does nothing when miner not found', async () => {
    const minersBefore = useMinerStore.getState().miners.length;
    await useMinerStore.getState().cloneMiner('nonexistent');
    expect(useMinerStore.getState().miners.length).toBe(minersBefore);
    expect(mockSaveMiner).not.toHaveBeenCalled();
  });
});

describe('setMinerIcon', () => {
  it('sets icon on miner', async () => {
    useMinerStore.setState({
      miners: [{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80 } as never],
    });

    await useMinerStore.getState().setMinerIcon('m1', '🔥');

    const updated = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(updated?.icon).toBe('🔥');
    expect(mockSaveMiner).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1', icon: '🔥' }));
  });

  it('clears icon when undefined', async () => {
    useMinerStore.setState({
      miners: [{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80, icon: '🔥' } as never],
    });

    await useMinerStore.getState().setMinerIcon('m1', undefined);

    const updated = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(updated?.icon).toBeUndefined();
    expect(mockSaveMiner).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', icon: undefined }),
    );
  });

  it('does nothing when miner not found', async () => {
    const saveBefore = mockSaveMiner.mock.calls.length;
    await useMinerStore.getState().setMinerIcon('nonexistent', '🔥');
    expect(mockSaveMiner).toHaveBeenCalledTimes(saveBefore);
  });
});

describe('addMiner statusPath null', () => {
  beforeEach(() => {
    mockProbe.mockResolvedValue({ infoPath: '/api/info', statusPath: null });
    jest.useFakeTimers({ now: 1000000 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates miner with undefined statusPath when probe returns null', async () => {
    mockFetchAll.mockResolvedValue({ info: { hostname: 'test' }, status: {} });
    await useMinerStore.getState().addMiner('192.168.1.100');
    const miner = useMinerStore.getState().miners[0];
    expect(miner.statusPath).toBeUndefined();
    expect(miner.ip).toBe('192.168.1.100');
  });
});

describe('getSnapshots edge cases', () => {
  it('handles non-array remote response gracefully', async () => {
    mockGetSnapshots.mockResolvedValue([{ minerId: 'm1', timestamp: 100 }]);
    mockFetchStats.mockResolvedValue({ notArray: true });
    mockAuthToken = 'test-token';
    useMinerStore.setState({
      miners: [{ id: 'm1', remoteId: 'remote-1', ip: '1.2.3.4', port: 80 } as never],
    });

    const result = await useMinerStore.getState().getSnapshots('m1', 100);

    expect(result).toEqual([{ minerId: 'm1', timestamp: 100 }]);
    mockAuthToken = null;
  });

  it('skips remote fetch when authenticated but no remoteId', async () => {
    mockGetSnapshots.mockResolvedValue([{ minerId: 'm1', timestamp: 100 }]);
    mockAuthToken = 'test-token';
    useMinerStore.setState({
      miners: [{ id: 'm1', ip: '1.2.3.4', port: 80 } as never],
    });

    const result = await useMinerStore.getState().getSnapshots('m1', 100);

    expect(mockFetchStats).not.toHaveBeenCalled();
    expect(result).toEqual([{ minerId: 'm1', timestamp: 100 }]);
    mockAuthToken = null;
  });
});

describe('setMinerNotes', () => {
  it('sets notes on miner', async () => {
    useMinerStore.setState({
      miners: [{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80 } as never],
    });

    await useMinerStore.getState().setMinerNotes('m1', 'Runs hot in summer');

    const updated = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(updated?.notes).toBe('Runs hot in summer');
    expect(mockSaveMiner).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', notes: 'Runs hot in summer' }),
    );
  });

  it('clears notes when empty string', async () => {
    useMinerStore.setState({
      miners: [{ id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80, notes: 'old notes' } as never],
    });

    await useMinerStore.getState().setMinerNotes('m1', '');

    const updated = useMinerStore.getState().miners.find((m) => m.id === 'm1');
    expect(updated?.notes).toBeUndefined();
    expect(mockSaveMiner).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', notes: undefined }),
    );
  });

  it('does nothing when miner not found', async () => {
    const saveBefore = mockSaveMiner.mock.calls.length;
    await useMinerStore.getState().setMinerNotes('nonexistent', 'notes');
    expect(mockSaveMiner).toHaveBeenCalledTimes(saveBefore);
  });
});
