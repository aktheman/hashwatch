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

jest.mock('../src/api/client', () => ({
  pushStats: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/store/auth', () => ({
  useAuthStore: {
    getState: () => ({ token: null }),
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

    const mockGetState = jest
      .spyOn(jest.requireMock('../src/store/auth').useAuthStore, 'getState')
      .mockReturnValue({ token: 'abc' });

    await useMinerStore.getState().removeMiner('m1');

    expect(mockDeleteRemoteMiner).toHaveBeenCalledWith('remote-1');
    mockGetState.mockRestore();
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
});
