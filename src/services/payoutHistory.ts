import * as DB from '../db/database';

export interface PayoutEntry {
  id: string;
  provider: string;
  amount: number;
  timestamp: number;
  recordedAt: number;
}

interface PayoutSnapshot {
  lastPayoutAt: number;
  pending: number;
}

const HISTORY_KEY = 'payout_history';
const SNAPSHOTS_KEY = 'payout_snapshots';
const MAX_ENTRIES = 200;

function generateId(): string {
  return `payout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function getPayoutHistory(): Promise<PayoutEntry[]> {
  return parseJson<PayoutEntry[]>(await DB.getSetting(HISTORY_KEY)) ?? [];
}

async function loadSnapshots(): Promise<Record<string, PayoutSnapshot>> {
  return parseJson<Record<string, PayoutSnapshot>>(await DB.getSetting(SNAPSHOTS_KEY)) ?? {};
}

export async function recordPoolSnapshot(
  provider: string,
  lastPayout: number,
  payoutPending: number,
): Promise<void> {
  if (!(lastPayout > 0)) return;

  const snapshots = await loadSnapshots();
  const prev = snapshots[provider];

  if (prev && prev.lastPayoutAt === lastPayout) {
    snapshots[provider] = { lastPayoutAt: lastPayout, pending: payoutPending };
    await DB.setSetting(SNAPSHOTS_KEY, JSON.stringify(snapshots));
    return;
  }

  const amount = prev && prev.pending > 0 ? prev.pending : Math.max(0, payoutPending);
  const entry: PayoutEntry = {
    id: generateId(),
    provider,
    amount,
    timestamp: lastPayout,
    recordedAt: Date.now(),
  };

  const history = await getPayoutHistory();
  const next = [entry, ...history].slice(0, MAX_ENTRIES);
  snapshots[provider] = { lastPayoutAt: lastPayout, pending: payoutPending };

  await DB.setSetting(HISTORY_KEY, JSON.stringify(next));
  await DB.setSetting(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

export function summarizePayouts(history: PayoutEntry[]): {
  totalPaid: number;
  count: number;
  lastPayoutAt: number;
} {
  const totalPaid = history.reduce((sum, e) => sum + e.amount, 0);
  const lastPayoutAt = history.length > 0 ? Math.max(...history.map((e) => e.timestamp)) : 0;
  return { totalPaid, count: history.length, lastPayoutAt };
}

export async function clearPayoutHistory(): Promise<void> {
  await DB.setSetting(HISTORY_KEY, JSON.stringify([]));
}

export function __resetPayoutHistory(): void {}
