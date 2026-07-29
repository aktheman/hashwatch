import {
  getNetworkStatus,
  getNetworkStatusAsync,
  queueChange,
  getPendingChanges,
  clearSyncedChange,
  clearAllSyncedChanges,
  syncPendingChanges,
  getRetryDelay,
  subscribePendingChanges,
} from '../src/services/syncService';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
}));

const mockGetNetworkStateAsync = require('expo-network').getNetworkStateAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  clearAllSyncedChanges();
});

describe('getNetworkStatus', () => {
  it('returns true', () => {
    expect(getNetworkStatus()).toBe(true);
  });
});

describe('getNetworkStatusAsync', () => {
  it('returns isConnected from expo-network', async () => {
    mockGetNetworkStateAsync.mockResolvedValue({ isConnected: true, type: 3 });
    const result = await getNetworkStatusAsync();
    expect(result).toBe(true);
  });

  it('returns false when not connected', async () => {
    mockGetNetworkStateAsync.mockResolvedValue({ isConnected: false, type: 0 });
    const result = await getNetworkStatusAsync();
    expect(result).toBe(false);
  });

  it('defaults to true when isConnected is null', async () => {
    mockGetNetworkStateAsync.mockResolvedValue({ type: 3 });
    const result = await getNetworkStatusAsync();
    expect(result).toBe(true);
  });

  it('falls back to getNetworkStatus on error', async () => {
    mockGetNetworkStateAsync.mockRejectedValue(new Error('network error'));
    const result = await getNetworkStatusAsync();
    expect(result).toBe(true);
  });
});

describe('queueChange', () => {
  it('adds a change with generated fields', () => {
    queueChange({ store: 'test', action: 'update', payload: { count: 1 } });
    const changes = getPendingChanges();
    expect(changes).toHaveLength(1);
    expect(changes[0].store).toBe('test');
    expect(changes[0].action).toBe('update');
    expect(changes[0].payload).toEqual({ count: 1 });
    expect(changes[0].id).toMatch(/^change_/);
    expect(changes[0].retryCount).toBe(0);
    expect(typeof changes[0].timestamp).toBe('number');
  });
});

describe('getPendingChanges', () => {
  it('returns a copy of pending changes', () => {
    queueChange({ store: 'a', action: 'create', payload: null });
    queueChange({ store: 'b', action: 'delete', payload: null });
    const changes = getPendingChanges();
    expect(changes).toHaveLength(2);
    changes.push({} as any);
    expect(getPendingChanges()).toHaveLength(2);
  });
});

describe('clearSyncedChange', () => {
  it('removes a specific change by id', () => {
    queueChange({ store: 'test', action: 'update', payload: null });
    const { id } = getPendingChanges()[0];
    clearSyncedChange(id);
    expect(getPendingChanges()).toHaveLength(0);
  });

  it('does nothing for unknown id', () => {
    queueChange({ store: 'test', action: 'update', payload: null });
    clearSyncedChange('nonexistent');
    expect(getPendingChanges()).toHaveLength(1);
  });
});

describe('clearAllSyncedChanges', () => {
  it('removes all pending changes', () => {
    queueChange({ store: 'a', action: 'create', payload: null });
    queueChange({ store: 'b', action: 'delete', payload: null });
    clearAllSyncedChanges();
    expect(getPendingChanges()).toHaveLength(0);
  });
});

describe('syncPendingChanges', () => {
  it('syncs changes and removes them on success', async () => {
    queueChange({ store: 'test', action: 'update', payload: { x: 1 } });
    queueChange({ store: 'test', action: 'update', payload: { x: 2 } });
    const apiCall = jest.fn().mockResolvedValue(true);
    const result = await syncPendingChanges(apiCall);
    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(apiCall).toHaveBeenCalledTimes(2);
    expect(getPendingChanges()).toHaveLength(0);
  });

  it('increments retryCount on failure', async () => {
    queueChange({ store: 'test', action: 'update', payload: null });
    const apiCall = jest.fn().mockResolvedValue(false);
    const result = await syncPendingChanges(apiCall);
    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(getPendingChanges()).toHaveLength(1);
    expect(getPendingChanges()[0].retryCount).toBe(1);
  });

  it('removes changes after max retries', async () => {
    queueChange({ store: 'test', action: 'update', payload: null });
    getPendingChanges()[0].retryCount = 5;
    const apiCall = jest.fn().mockResolvedValue(false);
    const result = await syncPendingChanges(apiCall);
    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(getPendingChanges()).toHaveLength(0);
  });

  it('increments retryCount on exception', async () => {
    queueChange({ store: 'test', action: 'update', payload: null });
    const apiCall = jest.fn().mockRejectedValue(new Error('fail'));
    const result = await syncPendingChanges(apiCall);
    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(getPendingChanges()[0].retryCount).toBe(1);
  });
});

describe('getRetryDelay', () => {
  it('returns backoff delay for given retry count', () => {
    expect(getRetryDelay(0)).toBe(1000);
    expect(getRetryDelay(1)).toBe(2000);
    expect(getRetryDelay(2)).toBe(4000);
    expect(getRetryDelay(3)).toBe(8000);
    expect(getRetryDelay(4)).toBe(16000);
  });

  it('caps at max backoff', () => {
    expect(getRetryDelay(10)).toBe(16000);
  });
});

describe('subscribePendingChanges', () => {
  it('calls listener when changes are queued', () => {
    const listener = jest.fn();
    const unsubscribe = subscribePendingChanges(listener);
    queueChange({ store: 'test', action: 'create', payload: null });
    expect(listener).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ store: 'test' })]),
    );
    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribePendingChanges(listener);
    unsubscribe();
    queueChange({ store: 'test', action: 'create', payload: null });
    expect(listener).not.toHaveBeenCalled();
  });
});
