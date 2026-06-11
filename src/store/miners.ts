import { create } from 'zustand';
import { Miner, MinerSnapshot } from '../types';
import { BitAxeClient } from '../api/bitaxe';
import * as DB from '../db/database';
import { checkMinerAlerts } from '../services/notifications';
import { pushStats } from '../api/client';
import { useAuthStore } from './auth';

function generateId(): string {
  return `miner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface MinersState {
  miners: Miner[];
  loading: boolean;
  initialized: boolean;
  scanning: boolean;
  scanProgress: { found: number; scanned: number; total: number } | null;
  error: string | null;

  loadMiners: () => Promise<void>;
  addMiner: (ip: string, port?: number, name?: string) => Promise<void>;
  removeMiner: (id: string) => Promise<void>;
  refreshMiner: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  startPolling: (intervalMs?: number) => () => void;
  scanNetwork: () => Promise<void>;
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
    } catch (e: any) {
      set({ error: e.message, loading: false, initialized: true });
    }
  },

  addMiner: async (ip: string, port: number = 80, name?: string) => {
    set({ error: null });
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
      await DB.saveMiner(miner);
      await DB.saveSnapshot({
        minerId: miner.id,
        timestamp: Date.now(),
        hashRate: status.hashRate,
        temperature: status.temperature,
        voltage: status.voltage,
        current: status.current,
        power: status.power,
        sharesAccepted: status.sharesAccepted,
        sharesRejected: status.sharesRejected,
        uptimeSeconds: status.uptimeSeconds,
        frequency: status.frequency,
      });
      set((s) => ({ miners: [...s.miners, miner] }));
    } catch (e: any) {
      set({ error: `Failed to connect to ${ip}: ${e.message}` });
      throw e;
    }
  },

  removeMiner: async (id: string) => {
    await DB.deleteMiner(id);
    set((s) => ({ miners: s.miners.filter((m) => m.id !== id) }));
  },

  refreshMiner: async (id: string) => {
    const miner = get().miners.find((m) => m.id === id);
    if (!miner) return;
    try {
      const client = new BitAxeClient(miner.ip, miner.port, miner.apiPath, miner.statusPath);
      const { info, status } = await client.fetchAll();
      const updated: Miner = {
        ...miner,
        info,
        status,
        lastSeen: Date.now(),
        isOnline: true,
      };
      await DB.saveMiner(updated);
      const snapshot = {
        minerId: id,
        timestamp: Date.now(),
        hashRate: status.hashRate,
        temperature: status.temperature,
        voltage: status.voltage,
        current: status.current,
        power: status.power,
        sharesAccepted: status.sharesAccepted,
        sharesRejected: status.sharesRejected,
        uptimeSeconds: status.uptimeSeconds,
        frequency: status.frequency,
      };
      await DB.saveSnapshot(snapshot);
      const token = useAuthStore.getState().token;
      if (token) {
        pushStats(id, snapshot).catch(() => {});
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
    }
  },

  refreshAll: async () => {
    const prev = get().miners;
    await Promise.allSettled(prev.map((m) => get().refreshMiner(m.id)));
    const current = get().miners;
    if (current.length > 0) {
      checkMinerAlerts(prev, current);
    }
  },

  startPolling: (intervalMs: number = 30000) => {
    get().refreshAll();
    const interval = setInterval(() => {
      get().refreshAll();
    }, intervalMs);
    return () => clearInterval(interval);
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
    } catch (e: any) {
      set({ scanning: false, scanProgress: null, error: e.message });
    }
  },

  clearError: () => set({ error: null }),

  getSnapshots: async (minerId: string, limit: number = 100) => {
    return await DB.getSnapshots(minerId, limit);
  },
}));
