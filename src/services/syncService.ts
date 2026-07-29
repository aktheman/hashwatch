import * as Network from 'expo-network';
import { useNetworkStatus } from './networkStatus';

export interface PendingChange {
  id: string;
  store: string;
  action: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

const MAX_RETRY_COUNT = 5;
const RETRY_BACKOFF_MS = [1000, 2000, 4000, 8000, 16000];

let _pendingChanges: PendingChange[] = [];
let _listeners: Array<(changes: PendingChange[]) => void> = [];

function generateChangeId(): string {
  return `change_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function notifyListeners() {
  _listeners.forEach((fn) => fn([..._pendingChanges]));
}

export function getNetworkStatus(): boolean {
  return true;
}

export async function getNetworkStatusAsync(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected ?? true;
  } catch {
    return getNetworkStatus();
  }
}

export function queueChange(change: Omit<PendingChange, 'id' | 'timestamp' | 'retryCount'>): void {
  const queued: PendingChange = {
    ...change,
    id: generateChangeId(),
    timestamp: Date.now(),
    retryCount: 0,
  };
  _pendingChanges.push(queued);
  notifyListeners();
}

export function getPendingChanges(): PendingChange[] {
  return [..._pendingChanges];
}

export function clearSyncedChange(id: string): void {
  _pendingChanges = _pendingChanges.filter((c) => c.id !== id);
  notifyListeners();
}

export function clearAllSyncedChanges(): void {
  _pendingChanges = [];
  notifyListeners();
}

export async function syncPendingChanges(
  apiCall: (change: PendingChange) => Promise<boolean>,
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  const toSync = [..._pendingChanges];

  for (const change of toSync) {
    try {
      const success = await apiCall(change);
      if (success) {
        clearSyncedChange(change.id);
        synced++;
      } else {
        change.retryCount++;
        if (change.retryCount >= MAX_RETRY_COUNT) {
          clearSyncedChange(change.id);
        }
        failed++;
      }
    } catch {
      change.retryCount++;
      if (change.retryCount >= MAX_RETRY_COUNT) {
        clearSyncedChange(change.id);
      }
      failed++;
    }
  }

  return { synced, failed };
}

export function getRetryDelay(retryCount: number): number {
  const index = Math.min(retryCount, RETRY_BACKOFF_MS.length - 1);
  return RETRY_BACKOFF_MS[index];
}

export function subscribePendingChanges(listener: (changes: PendingChange[]) => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((fn) => fn !== listener);
  };
}

export { useNetworkStatus };
