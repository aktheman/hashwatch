let mockAuthToken: string | null = null;
let onAuthLoginCallback: (() => void) | null = null;
const mockAppStateListeners: Array<(state: string) => void> = [];
const mockSyncMinersWithBackend = jest.fn().mockResolvedValue([]);
const mockLoadMiners = jest.fn().mockResolvedValue([]);
const mockScanNetwork = jest.fn();
const mockSaveMiner = jest.fn();
const mockSaveSnapshot = jest.fn();
const mockProbe = jest.fn();
const mockDeleteMiner = jest.fn();

jest.mock('../src/db/database', () => ({
  loadMiners: () => mockLoadMiners(),
  saveMiner: (m: unknown) => mockSaveMiner(m),
  deleteMiner: (id: string) => mockDeleteMiner(id),
  saveSnapshot: (s: unknown) => mockSaveSnapshot(s),
  getSnapshots: () => Promise.resolve([]),
  cleanupOldSnapshots: () => {},
}));

jest.mock('../src/api/bitaxe', () => ({
  BitAxeClient: class {
    static probe = (...args: unknown[]) => mockProbe(...args);
    fetchAll = () => Promise.reject(new Error('fail'));
    getSystemInfo = () => Promise.resolve({ hostname: 'test' });
    getMinerStatus = () => Promise.resolve({});
  },
}));

jest.mock('../src/services/minerSync', () => ({
  createRemoteMiner: jest.fn(),
  deleteRemoteMiner: jest.fn(),
  syncMinersWithBackend: (m: unknown) => mockSyncMinersWithBackend(m),
}));

jest.mock('../src/services/notifications', () => ({
  checkMinerAlerts: jest.fn(),
}));

jest.mock('../src/services/widget', () => ({
  updateWidget: jest.fn(),
}));

jest.mock('../src/api/client', () => ({
  pushStats: jest.fn(),
  fetchStats: jest.fn(),
}));

jest.mock('../src/store/authToken', () => ({
  getAuthToken: () => mockAuthToken,
  onAuthLogin: (cb: () => void) => {
    onAuthLoginCallback = cb;
  },
}));

jest.mock('../src/discovery/localNetwork', () => ({
  scanNetwork: (...args: unknown[]) => mockScanNetwork(...args),
  getLocalSubnet: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {},
  AppState: {
    addEventListener: (_event: string, handler: (state: string) => void) => {
      mockAppStateListeners.push(handler);
      return { remove: jest.fn() };
    },
    currentState: 'active',
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthToken = null;
  onAuthLoginCallback = null;
  mockAppStateListeners.length = 0;
});

describe('startPolling AppState listener', () => {
  it('pauses and resumes polling on AppState changes', () => {
    jest.isolateModules(() => {
      const { useMinerStore } = require('../src/store/miners');
      const refreshAll = jest.spyOn(useMinerStore.getState(), 'refreshAll');

      const stop = useMinerStore.getState().startPolling(60000);

      expect(refreshAll).toHaveBeenCalled();
      refreshAll.mockClear();

      mockAppStateListeners.forEach((fn) => fn('background'));
      mockAppStateListeners.forEach((fn) => fn('active'));

      expect(refreshAll).toHaveBeenCalled();
      stop();
    });
  });
});

describe('startPolling interval tick', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls refreshAll on tick when not paused', () => {
    jest.isolateModules(() => {
      const { useMinerStore } = require('../src/store/miners');
      const refreshAll = jest.spyOn(useMinerStore.getState(), 'refreshAll');

      const stop = useMinerStore.getState().startPolling(1000);
      refreshAll.mockClear();

      jest.advanceTimersByTime(1000);

      expect(refreshAll).toHaveBeenCalled();
      stop();
    });
  });

  it('skips refreshAll on tick when paused', () => {
    jest.isolateModules(() => {
      const { useMinerStore } = require('../src/store/miners');
      const refreshAll = jest.spyOn(useMinerStore.getState(), 'refreshAll');

      const stop = useMinerStore.getState().startPolling(1000);
      refreshAll.mockClear();

      mockAppStateListeners.forEach((fn) => fn('background'));

      jest.advanceTimersByTime(1000);

      expect(refreshAll).not.toHaveBeenCalled();
      stop();
    });
  });
});

describe('onAuthLogin callback', () => {
  it('registers callback that calls syncWithBackend', () => {
    jest.isolateModules(() => {
      mockAuthToken = 'test-token';
      require('../src/store/miners');
      expect(onAuthLoginCallback).not.toBeNull();

      if (onAuthLoginCallback) {
        onAuthLoginCallback();
        expect(mockSyncMinersWithBackend).toHaveBeenCalled();
      }
    });
  });
});

describe('scanNetwork error handling', () => {
  it('sets error state when scanNetwork throws', async () => {
    let storeRef: {
      getState: () => { scanNetwork: () => Promise<void>; scanning: boolean; error: string | null };
    };
    mockScanNetwork.mockRejectedValue(new Error('Scan timeout'));

    jest.isolateModules(() => {
      const { useMinerStore } = require('../src/store/miners');
      storeRef = useMinerStore;
    });

    await storeRef.getState().scanNetwork();

    const state = storeRef.getState();
    expect(state.scanning).toBe(false);
    expect(state.scanProgress).toBeNull();
    expect(state.error).toContain('Scan timeout');
  });

  it('adds discovered miners on success', async () => {
    let storeRef: {
      getState: () => {
        scanNetwork: () => Promise<void>;
        scanning: boolean;
        miners: unknown[];
        error: string | null;
      };
    };
    mockScanNetwork.mockImplementation(
      (onProgress: (found: number, scanned: number, total: number) => void) => {
        onProgress(1, 10, 254);
        return Promise.resolve([{ ip: '192.168.1.42', port: 80 }]);
      },
    );
    mockProbe.mockResolvedValue({ infoPath: '/api/info', statusPath: '/api/system' });

    jest.isolateModules(() => {
      const { useMinerStore } = require('../src/store/miners');
      storeRef = useMinerStore;
    });

    await storeRef.getState().scanNetwork();

    const state = storeRef.getState();
    expect(state.scanning).toBe(false);
    expect(state.scanProgress).toBeNull();
    expect(state.miners).toHaveLength(1);
    expect(state.miners[0].ip).toBe('192.168.1.42');
  });
});
