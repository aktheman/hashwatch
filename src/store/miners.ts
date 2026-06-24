import { create } from 'zustand';
import { AppState } from 'react-native';
import { Miner, MinerInfo, MinerSnapshot, MinerStatus } from '../types';
import { BitAxeClient } from '../api/bitaxe';
import * as DB from '../db/database';
import { checkMinerAlerts } from '../services/notifications';
import { pushStats, fetchStats } from '../api/client';
import { createRemoteMiner, deleteRemoteMiner, syncMinersWithBackend } from '../services/minerSync';
import { getAuthToken, onAuthLogin } from './authToken';
import { updateWidget } from '../services/widget';
import {
  toHashesPerSecond,
  formatHashrateValue,
  estimateBTCPerDay,
  formatBTC,
} from '../utils/hashrate';

function generateId(): string {
  return `miner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildSnapshot(minerId: string, status: MinerStatus): MinerSnapshot {
  return {
    minerId,
    timestamp: Date.now(),
    hashRate: status.hashRate,
    hashRateUnit: status.hashRateUnit,
    temperature: status.temperature,
    voltage: status.voltage,
    current: status.current,
    power: status.power,
    sharesAccepted: status.sharesAccepted,
    sharesRejected: status.sharesRejected,
    uptimeSeconds: status.uptimeSeconds,
    frequency: status.frequency,
  };
}

interface MinersState {
  miners: Miner[];
  loading: boolean;
  initialized: boolean;
  scanning: boolean;
  scanProgress: { found: number; scanned: number; total: number } | null;
  error: string | null;

  loadMiners: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
  addMiner: (ip: string, port?: number, name?: string) => Promise<void>;
  removeMiner: (id: string) => Promise<void>;
  refreshMiner: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  startPolling: (intervalMs?: number) => () => void;
  scanNetwork: () => Promise<void>;
  setMinerWallet: (minerId: string, walletId: string | undefined) => Promise<void>;
  setMinerGroup: (minerId: string, group: string | undefined) => Promise<void>;
  setMinerIp: (minerId: string, ip: string, port?: number) => Promise<void>;
  setMinerName: (minerId: string, name: string) => Promise<void>;
  cloneMiner: (minerId: string) => Promise<void>;
  setMinerIcon: (minerId: string, icon: string | undefined) => Promise<void>;
  setMinerLocation: (minerId: string, location: string | undefined) => Promise<void>;
  setMinerTags: (minerId: string, tags: string[]) => Promise<void>;
  applyRemoteSnapshot: (localId: string, snapshot: MinerSnapshot) => Promise<void>;
  updateMinerFromServer: (data: {
    id: string;
    isOnline: boolean;
    lastSeen?: number;
    status?: MinerStatus;
    info?: MinerInfo;
  }) => void;
  clearError: () => void;
  getSnapshots: (minerId: string, limit?: number) => Promise<MinerSnapshot[]>;
}

export const useMinerStore = create<MinersState>((set, get) => ({
  miners: [],
  loading: false,
  initialized: false,
  scanning: false,
  scanProgress: null,
  error: null,

  loadMiners: async () => {
    set({ loading: true, error: null });
    try {
      const miners = await DB.loadMiners();
      set({ miners, loading: false, initialized: true });
      DB.cleanupOldSnapshots();
      get().refreshAll();
      if (getAuthToken()) {
        get().syncWithBackend();
      }
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false, initialized: true });
    }
  },

  syncWithBackend: async () => {
    if (!getAuthToken()) return;
    try {
      const synced = await syncMinersWithBackend(get().miners);
      set({ miners: synced });
    } catch {
      // sync is best-effort
      console.warn('syncWithBackend failed');
    }
  },

  addMiner: async (ip: string, port: number = 80, name?: string) => {
    set({ error: null });
    const existing = get().miners.find((m) => m.ip === ip && m.port === port);
    if (existing) {
      const msg = `Miner at ${ip} is already added`;
      set({ error: msg });
      throw new Error(msg);
    }
    try {
      const found = await BitAxeClient.probe(ip, port);
      if (!found) {
        set({ error: `No BitAxe miner found at ${ip}` });
        throw new Error(`No BitAxe miner found at ${ip}`);
      }
      const { infoPath: apiPath, statusPath } = found;
      const client = new BitAxeClient(ip, port, apiPath!, statusPath || undefined);
      const info = await client.getSystemInfo();
      const status = await client.getMinerStatus();
      const miner: Miner = {
        id: generateId(),
        name: name || info.hostname || `BitAxe (${ip})`,
        ip,
        port,
        apiPath: apiPath || undefined,
        statusPath: statusPath || undefined,
        info,
        status,
        lastSeen: Date.now(),
        addedAt: Date.now(),
        isOnline: true,
      };

      if (getAuthToken()) {
        miner.remoteId = await createRemoteMiner(miner);
      }

      await DB.saveMiner(miner);
      await DB.saveSnapshot(buildSnapshot(miner.id, status));
      set((s) => ({ miners: [...s.miners, miner] }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ error: `Failed to connect to ${ip}: ${msg}` });
      throw e;
    }
  },

  removeMiner: async (id: string) => {
    const miner = get().miners.find((m) => m.id === id);
    if (miner?.remoteId && getAuthToken()) {
      await deleteRemoteMiner(miner.remoteId);
    }
    await DB.deleteMiner(id);
    set((s) => ({ miners: s.miners.filter((m) => m.id !== id) }));
  },

  refreshMiner: async (id: string) => {
    const miner = get().miners.find((m) => m.id === id);
    if (!miner) return;

    const attempt = async (retryMs = 0): Promise<void> => {
      if (retryMs > 0) await new Promise((resolve) => setTimeout(resolve, retryMs));

      try {
        const client = new BitAxeClient(
          miner.ip,
          miner.port,
          miner.apiPath ?? undefined,
          miner.statusPath ?? undefined,
        );
        const { info, status } = await client.fetchAll();
        const updated: Miner = {
          ...miner,
          info,
          status,
          lastSeen: Date.now(),
          isOnline: true,
        };
        await DB.saveMiner(updated);
        const snapshot = buildSnapshot(id, status);
        await DB.saveSnapshot(snapshot);
        const token = getAuthToken();
        if (token && miner.remoteId) {
          pushStats(miner.remoteId, snapshot).catch((e) => console.warn('pushStats failed:', e));
        }
        set((s) => ({
          miners: s.miners.map((m) => (m.id === id ? updated : m)),
        }));
      } catch {
        const current = get().miners.find((m) => m.id === id);
        if (!current) return;
        if (!current.apiPath) {
          const found = await BitAxeClient.probe(current.ip, current.port).catch(() => null);
          if (found?.infoPath) {
            await DB.saveMiner({
              ...current,
              apiPath: found.infoPath || undefined,
              statusPath: found.statusPath || undefined,
            });
            set((s) => ({
              miners: s.miners.map((m) =>
                m.id === id
                  ? {
                      ...m,
                      apiPath: found.infoPath || undefined,
                      statusPath: found.statusPath || undefined,
                    }
                  : m,
              ),
            }));
          }
        }
        set((s) => ({
          miners: s.miners.map((m) => (m.id === id ? { ...m, isOnline: false } : m)),
        }));

        if (typeof (navigator as any)?.onLine === 'boolean' && !(navigator as any).onLine) {
          setTimeout(() => attempt(2000), 0);
        }
      }
    };

    await attempt(0);
  },

  refreshAll: async () => {
    const prev = get().miners;
    const CONCURRENCY = 5;
    for (let i = 0; i < prev.length; i += CONCURRENCY) {
      const batch = prev.slice(i, i + CONCURRENCY);
      await Promise.allSettled(batch.map((m) => get().refreshMiner(m.id)));
    }
    const current = get().miners;
    if (current.length > 0) {
      checkMinerAlerts(prev, current);
    }
    const totalHash = current.reduce(
      (s, m) => s + toHashesPerSecond(m.status?.hashRate ?? 0, m.status?.hashRateUnit),
      0,
    );
    const online = current.filter((m) => m.isOnline).length;
    const btc = estimateBTCPerDay(totalHash);
    updateWidget(
      totalHash > 0 ? formatHashrateValue(totalHash) : '---',
      online,
      current.length,
      btc > 0 ? formatBTC(btc) : '---',
    );
  },

  startPolling: (intervalMs: number = 30000) => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let paused = false;

    const tick = () => {
      if (!paused) get().refreshAll();
    };

    get().refreshAll();
    interval = setInterval(tick, intervalMs);

    const sub = AppState.addEventListener('change', (state) => {
      paused = state !== 'active';
      if (!paused) get().refreshAll();
    });

    return () => {
      if (interval) clearInterval(interval);
      sub.remove();
    };
  },

  scanNetwork: async () => {
    set({ scanning: true, scanProgress: { found: 0, scanned: 0, total: 254 }, error: null });
    try {
      const { scanNetwork } = await import('../discovery/localNetwork');
      const found = await scanNetwork((found, scanned, total) => {
        set({ scanProgress: { found, scanned, total } });
      });
      const existingIPs = new Set(get().miners.map((m) => m.ip));
      for (const d of found) {
        if (!existingIPs.has(d.ip)) {
          try {
            await get().addMiner(d.ip, d.port);
          } catch {
            // skip miners that fail to add
          }
        }
      }
      set({ scanning: false, scanProgress: null });
    } catch (e: unknown) {
      set({
        scanning: false,
        scanProgress: null,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  setMinerWallet: async (minerId: string, walletId: string | undefined) => {
    const miner = get().miners.find((m) => m.id === minerId);
    if (!miner) return;
    const updated = { ...miner, walletId: walletId || undefined };
    await DB.saveMiner(updated);
    set((s) => ({
      miners: s.miners.map((m) => (m.id === minerId ? updated : m)),
    }));
  },

  setMinerGroup: async (minerId: string, group: string | undefined) => {
    const miner = get().miners.find((m) => m.id === minerId);
    if (!miner) return;
    const updated = { ...miner, group: group || undefined };
    await DB.saveMiner(updated);
    set((s) => ({
      miners: s.miners.map((m) => (m.id === minerId ? updated : m)),
    }));
  },

  setMinerIp: async (minerId: string, ip: string, port?: number) => {
    const miner = get().miners.find((m) => m.id === minerId);
    if (!miner) return;
    const updated = { ...miner, ip, port: port ?? miner.port };
    await DB.saveMiner(updated);
    set((s) => ({
      miners: s.miners.map((m) => (m.id === minerId ? updated : m)),
    }));
  },

  setMinerName: async (minerId: string, name: string) => {
    const miner = get().miners.find((m) => m.id === minerId);
    if (!miner) return;
    const updated = { ...miner, name };
    await DB.saveMiner(updated);
    set((s) => ({
      miners: s.miners.map((m) => (m.id === minerId ? updated : m)),
    }));
  },

  cloneMiner: async (minerId: string) => {
    const miner = get().miners.find((m) => m.id === minerId);
    if (!miner) return;
    const clone: Miner = {
      ...miner,
      id: generateId(),
      name: `${miner.name} (copy)`,
      addedAt: Date.now(),
      lastSeen: undefined,
      status: undefined,
      info: undefined,
      remoteId: undefined,
    };
    await DB.saveMiner(clone);
    set((s) => ({ miners: [...s.miners, clone] }));
  },

  setMinerIcon: async (minerId: string, icon: string | undefined) => {
    const miner = get().miners.find((m) => m.id === minerId);
    if (!miner) return;
    const updated = { ...miner, icon: icon || undefined };
    await DB.saveMiner(updated);
    set((s) => ({
      miners: s.miners.map((m) => (m.id === minerId ? updated : m)),
    }));
  },

  setMinerLocation: async (minerId: string, location: string | undefined) => {
    const miner = get().miners.find((m) => m.id === minerId);
    if (!miner) return;
    const updated = { ...miner, location: location || undefined };
    await DB.saveMiner(updated);
    set((s) => ({
      miners: s.miners.map((m) => (m.id === minerId ? updated : m)),
    }));
  },

  setMinerTags: async (minerId: string, tags: string[]) => {
    const miner = get().miners.find((m) => m.id === minerId);
    if (!miner) return;
    const updated = { ...miner, tags };
    await DB.saveMiner(updated);
    set((s) => ({
      miners: s.miners.map((m) => (m.id === minerId ? updated : m)),
    }));
  },

  applyRemoteSnapshot: async (localId: string, snapshot: MinerSnapshot) => {
    const miner = get().miners.find((m) => m.id === localId);
    if (!miner) return;

    const localSnapshot: MinerSnapshot = { ...snapshot, minerId: localId };
    await DB.saveSnapshot(localSnapshot);

    if (!miner.status) return;
    const updated: Miner = {
      ...miner,
      status: {
        ...miner.status,
        hashRate: snapshot.hashRate,
        temperature: snapshot.temperature,
        voltage: snapshot.voltage,
        current: snapshot.current,
        power: snapshot.power,
        sharesAccepted: snapshot.sharesAccepted,
        sharesRejected: snapshot.sharesRejected,
        uptimeSeconds: snapshot.uptimeSeconds,
        frequency: snapshot.frequency,
      },
      lastSeen: snapshot.timestamp,
      isOnline: true,
    };
    await DB.saveMiner(updated);
    set((s) => ({
      miners: s.miners.map((m) => (m.id === localId ? updated : m)),
    }));
  },

  updateMinerFromServer: (data) => {
    set((s) => ({
      miners: s.miners.map((m) => {
        if (m.id !== data.id) return m;
        return {
          ...m,
          isOnline: data.isOnline,
          lastSeen: data.lastSeen ?? m.lastSeen,
          status: data.status ?? (data.isOnline ? m.status : undefined),
          info: data.info ?? m.info,
        };
      }),
    }));
  },

  clearError: () => set({ error: null }),

  getSnapshots: async (minerId: string, limit: number = 100) => {
    const local = await DB.getSnapshots(minerId, limit);
    const token = getAuthToken();
    const miner = get().miners.find((m) => m.id === minerId);
    if (token && miner?.remoteId) {
      try {
        const remote = await fetchStats(miner.remoteId);
        if (Array.isArray(remote)) {
          for (const s of remote) {
            const exists = local.some((l) => l.timestamp === s.timestamp);
            if (!exists && s.timestamp > 0) {
              local.push({ ...s, minerId });
            }
          }
          local.sort((a, b) => a.timestamp - b.timestamp);
        }
      } catch {
        // best-effort
        console.warn('fetchStats failed');
      }
    }
    return local.slice(-limit);
  },
}));

onAuthLogin(() => {
  useMinerStore.getState().syncWithBackend();
});
