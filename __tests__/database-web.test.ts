jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

const mockStorage: Record<string, string> = {};

const localStorageMock = {
  getItem: jest.fn((key: string) => mockStorage[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: jest.fn(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  }),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

const db = jest.requireActual('../src/db/database.ts');

const {
  getSetting,
  setSetting,
  loadMiners,
  saveMiner,
  deleteMiner,
  saveSnapshot,
  getSnapshots,
  loadWallets,
  saveWallet,
  deleteWallet,
  cleanupOldSnapshots,
  getSnapshotCount,
  getStorageUsage,
} = db;

import { Miner, MinerSnapshot, Wallet } from '../src/types';

beforeEach(() => {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  jest.clearAllMocks();
});

describe('database (web)', () => {
  describe('settings', () => {
    it('returns null for missing setting', async () => {
      const result = await getSetting('nonexistent');
      expect(result).toBeNull();
    });

    it('saves and retrieves setting', async () => {
      await setSetting('theme', 'dark');
      const result = await getSetting('theme');
      expect(result).toBe('dark');
    });

    it('overwrites existing setting', async () => {
      await setSetting('theme', 'dark');
      await setSetting('theme', 'light');
      const result = await getSetting('theme');
      expect(result).toBe('light');
    });
  });

  describe('miners', () => {
    const miner: Miner = {
      id: 'm1',
      name: 'Test Miner',
      ip: '192.168.1.100',
      port: 80,
      apiPath: '/api/info',
      statusPath: '/api/status',
    };

    it('returns empty array when no miners', async () => {
      const result = await loadMiners();
      expect(result).toEqual([]);
    });

    it('saves and loads miner', async () => {
      await saveMiner(miner);
      const result = await loadMiners();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(miner);
    });

    it('updates existing miner', async () => {
      await saveMiner(miner);
      const updated = { ...miner, name: 'Updated' };
      await saveMiner(updated);
      const result = await loadMiners();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Updated');
    });

    it('saves multiple miners', async () => {
      await saveMiner(miner);
      await saveMiner({ ...miner, id: 'm2', name: 'Miner 2' });
      const result = await loadMiners();
      expect(result).toHaveLength(2);
    });

    it('deletes miner', async () => {
      await saveMiner(miner);
      await deleteMiner('m1');
      const result = await loadMiners();
      expect(result).toHaveLength(0);
    });

    it('deletes miner and associated snapshots', async () => {
      await saveMiner(miner);
      await saveSnapshot({
        minerId: 'm1',
        timestamp: Date.now(),
        hashRate: 100,
        hashRateUnit: 'GH/s',
        temperature: 50,
        sharesAccepted: 10,
        sharesRejected: 0,
      });
      await deleteMiner('m1');
      const miners = await loadMiners();
      const snapshots = await getSnapshots('m1');
      expect(miners).toHaveLength(0);
      expect(snapshots).toHaveLength(0);
    });
  });

  describe('snapshots', () => {
    const snapshot: MinerSnapshot = {
      minerId: 'm1',
      timestamp: Date.now(),
      hashRate: 100,
      hashRateUnit: 'GH/s',
      temperature: 50,
      sharesAccepted: 10,
      sharesRejected: 0,
    };

    it('returns empty array when no snapshots', async () => {
      const result = await getSnapshots('m1');
      expect(result).toEqual([]);
    });

    it('saves and retrieves snapshots', async () => {
      await saveSnapshot(snapshot);
      const result = await getSnapshots('m1');
      expect(result).toHaveLength(1);
    });

    it('filters snapshots by minerId', async () => {
      await saveSnapshot(snapshot);
      await saveSnapshot({ ...snapshot, minerId: 'm2' });
      const result = await getSnapshots('m1');
      expect(result).toHaveLength(1);
    });

    it('sorts snapshots by timestamp descending', async () => {
      await saveSnapshot({ ...snapshot, timestamp: 1000 });
      await saveSnapshot({ ...snapshot, timestamp: 3000 });
      await saveSnapshot({ ...snapshot, timestamp: 2000 });
      const result = await getSnapshots('m1');
      expect(result[0].timestamp).toBe(3000);
      expect(result[2].timestamp).toBe(1000);
    });

    it('respects limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await saveSnapshot({ ...snapshot, timestamp: i });
      }
      const result = await getSnapshots('m1', 5);
      expect(result).toHaveLength(5);
    });

    it('cleans up old snapshots', async () => {
      const now = Date.now();
      await saveSnapshot({ ...snapshot, timestamp: now - 1000 });
      await saveSnapshot({ ...snapshot, timestamp: now - 8 * 24 * 60 * 60 * 1000 });
      await cleanupOldSnapshots();
      const result = await getSnapshots('m1');
      expect(result).toHaveLength(1);
    });
  });

  describe('wallets', () => {
    const wallet: Wallet = {
      id: 'w1',
      address: 'bc1qtest',
      label: 'Test Wallet',
    };

    it('returns empty array when no wallets', async () => {
      const result = await loadWallets();
      expect(result).toEqual([]);
    });

    it('saves and loads wallet', async () => {
      await saveWallet(wallet);
      const result = await loadWallets();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(wallet);
    });

    it('updates existing wallet', async () => {
      await saveWallet(wallet);
      const updated = { ...wallet, label: 'Updated' };
      await saveWallet(updated);
      const result = await loadWallets();
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Updated');
    });

    it('deletes wallet', async () => {
      await saveWallet(wallet);
      await deleteWallet('w1');
      const result = await loadWallets();
      expect(result).toHaveLength(0);
    });
  });

  describe('migration', () => {
    it('handles schema version check', async () => {
      mockStorage['hashwatch_schema_version'] = '2';
      const miners = await loadMiners();
      expect(Array.isArray(miners)).toBe(true);
    });
  });

  describe('snapshot retention', () => {
    const snapshot: MinerSnapshot = {
      minerId: 'm1',
      timestamp: Date.now(),
      hashRate: 1.5,
      hashRateUnit: 'TH/s',
      temperature: 65,
      voltage: 500,
      current: 5,
      power: 120,
      sharesAccepted: 100,
      sharesRejected: 2,
      uptimeSeconds: 3600,
      frequency: 500,
    };

    beforeEach(async () => {
      Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    });

    it('cleanupOldSnapshots uses 7-day default when no setting', async () => {
      const now = Date.now();
      await saveSnapshot({ ...snapshot, timestamp: now - 1000 });
      await saveSnapshot({ ...snapshot, timestamp: now - 8 * 24 * 60 * 60 * 1000 });
      await cleanupOldSnapshots();
      const result = await getSnapshots('m1');
      expect(result).toHaveLength(1);
    });

    it('cleanupOldSnapshots respects custom retention setting', async () => {
      await setSetting('snapshot_retention_days', '3');
      const now = Date.now();
      await saveSnapshot({ ...snapshot, timestamp: now - 1000 });
      await saveSnapshot({ ...snapshot, timestamp: now - 2 * 24 * 60 * 60 * 1000 });
      await saveSnapshot({ ...snapshot, timestamp: now - 4 * 24 * 60 * 60 * 1000 });
      await cleanupOldSnapshots();
      const result = await getSnapshots('m1');
      expect(result).toHaveLength(2);
    });

    it('cleanupOldSnapshots accepts explicit olderThan override', async () => {
      const now = Date.now();
      await saveSnapshot({ ...snapshot, timestamp: now - 1000 });
      await saveSnapshot({ ...snapshot, timestamp: now - 2 * 24 * 60 * 60 * 1000 });
      await cleanupOldSnapshots(24 * 60 * 60 * 1000);
      const result = await getSnapshots('m1');
      expect(result).toHaveLength(1);
    });

    it('getSnapshotCount returns total count', async () => {
      await saveSnapshot({ ...snapshot, minerId: 'm1', timestamp: 1000 });
      await saveSnapshot({ ...snapshot, minerId: 'm2', timestamp: 2000 });
      const count = await getSnapshotCount();
      expect(count).toBe(2);
    });

    it('getStorageUsage returns object with used and estimate', async () => {
      await saveSnapshot(snapshot);
      const usage = await getStorageUsage();
      expect(typeof usage.used).toBe('number');
      expect(typeof usage.estimate).toBe('number');
      expect(usage.used).toBeGreaterThan(0);
    });
  });
});
