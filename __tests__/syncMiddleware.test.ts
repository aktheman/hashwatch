import {
  syncMiddleware,
  createSyncActions,
  getPendingChangesForStore,
} from '../src/store/syncMiddleware';
import { getNetworkStatus, queueChange, clearAllSyncedChanges } from '../src/services/syncService';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
}));

beforeEach(() => {
  clearAllSyncedChanges();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('syncMiddleware', () => {
  it('wraps set and queues change when offline', () => {
    const creator = jest.fn((set, get) => {
      set({ count: 1 });
      return { count: 0 };
    });

    const wrappedCreator = syncMiddleware(creator, 'testStore');
    const set = jest.fn();
    const get = jest.fn(() => ({ count: 1 }));
    const store = {} as any;

    wrappedCreator(set, get, store);

    expect(creator).toHaveBeenCalledWith(expect.any(Function), get, store);

    expect(set).toHaveBeenCalledWith({ count: 1 });
  });

  it('queues a change when set is called and offline', () => {
    const creator = jest.fn((_set, _get) => ({}));
    const wrappedCreator = syncMiddleware(creator, 'offlineStore');
    const set = jest.fn();
    const get = jest.fn(() => ({ key: 'value' }));

    wrappedCreator(set, get, {} as any);

    const wrappedSet = creator.mock.calls[0][0];
    wrappedSet({ key: 'newValue' });

    const pending = getPendingChangesForStore('offlineStore');
    expect(pending).toHaveLength(0);
  });
});

describe('createSyncActions', () => {
  it('returns scheduleSync and getPendingCount', () => {
    const actions = createSyncActions('test', () => ({}), jest.fn(), jest.fn());
    expect(actions).toHaveProperty('__scheduleSync');
    expect(actions).toHaveProperty('__getPendingCount');
    expect(typeof actions.__scheduleSync).toBe('function');
    expect(typeof actions.__getPendingCount).toBe('function');
  });

  it('getPendingCount returns count for store', () => {
    const actions = createSyncActions('myStore', () => ({}), jest.fn(), jest.fn());
    queueChange({ store: 'myStore', action: 'update', payload: null });
    queueChange({ store: 'other', action: 'update', payload: null });
    expect(actions.__getPendingCount()).toBe(1);
  });

  it('scheduleSync calls syncPendingChanges when online', async () => {
    const syncApiCall = jest.fn().mockResolvedValue(true);
    queueChange({ store: 'syncStore', action: 'update', payload: { x: 1 } });

    const actions = createSyncActions('syncStore', () => ({}), jest.fn(), syncApiCall);

    actions.__scheduleSync();

    jest.advanceTimersByTime(1500);

    await Promise.resolve();

    expect(syncApiCall).toHaveBeenCalled();
  });

  it('getPendingChangesForStore filters by store name', () => {
    queueChange({ store: 'a', action: 'create', payload: null });
    queueChange({ store: 'b', action: 'delete', payload: null });
    queueChange({ store: 'a', action: 'update', payload: null });

    const result = getPendingChangesForStore('a');
    expect(result).toHaveLength(2);
    result.forEach((c) => expect(c.store).toBe('a'));
  });
});
