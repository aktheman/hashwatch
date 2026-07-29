import { StateCreator, StoreMutatorIdentifier } from 'zustand';
import {
  queueChange,
  getPendingChanges,
  syncPendingChanges,
  getNetworkStatus,
  PendingChange,
} from '../services/syncService';

type SyncMiddleware = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  creator: StateCreator<T, Mps, Mcs>,
  storeName: string,
) => StateCreator<T, Mps, Mcs>;

function createSyncMiddlewareImpl(): SyncMiddleware {
  return (creator, storeName) => {
    return (set, get, store) => {
      const wrappedSet: typeof set = ((...args: unknown[]) => {
        (set as (...a: unknown[]) => void)(...args);

        if (!getNetworkStatus()) {
          const stateSnapshot = JSON.parse(JSON.stringify(get()));
          queueChange({
            store: storeName,
            action: 'state_update',
            payload: stateSnapshot,
          });
        }
      }) as typeof set;

      return creator(wrappedSet, get, store);
    };
  };
}

export const syncMiddleware = createSyncMiddlewareImpl();

export function createSyncActions<T extends object>(
  storeName: string,
  getState: () => T,
  setState: (partial: T | Partial<T> | ((state: T) => Partial<T>)) => void,
  syncApiCall: (change: PendingChange) => Promise<boolean>,
) {
  let _syncTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleSync() {
    if (_syncTimer) return;
    const delay = 1000;
    _syncTimer = setTimeout(async () => {
      _syncTimer = null;
      if (getNetworkStatus()) {
        const pending = getPendingChanges().filter((c) => c.store === storeName);
        if (pending.length > 0) {
          await syncPendingChanges(async (change) => {
            if (change.store !== storeName) return true;
            return syncApiCall(change);
          });
        }
      }
    }, delay);
    if (typeof _syncTimer === 'object' && _syncTimer !== null && 'unref' in _syncTimer) {
      (_syncTimer as { unref: () => void }).unref();
    }
  }

  return {
    __scheduleSync: scheduleSync,
    __getPendingCount: () => getPendingChanges().filter((c) => c.store === storeName).length,
  };
}

export function getPendingChangesForStore(storeName: string): PendingChange[] {
  return getPendingChanges().filter((c) => c.store === storeName);
}
