import { Miner, MinerSnapshot, Wallet } from '../src/types';

const memTables: Record<string, any[]> = {};

function mockDb() {
  return {
    execAsync: jest.fn(async (_sql: string) => {}),
    getFirstAsync: jest.fn(async (sql: string, params?: any[]) => {
      const m = sql.match(/FROM\s+(\w+)/i);
      if (!m) return null;
      const table = m[1].toLowerCase();
      const rows = memTables[table] || [];
      if (params && params.length > 0) {
        return rows.find((r: any) => Object.values(r).some((v) => v === params[0])) || null;
      }
      return rows[0] || null;
    }),
    getAllAsync: jest.fn(async (sql: string, params?: any[]) => {
      const tables = Object.keys(memTables);
      const table = tables.find((t) => sql.toLowerCase().includes(t));
      if (!table) return [];
      let rows = [...(memTables[table] || [])];
      if (params && params.length > 0) {
        const whereCol = sql.match(/(\w+)\s*=\s*\?/)?.[1];
        if (whereCol) {
          rows = rows.filter((r: any) => r[whereCol] === params[0]);
        }
      }
      const orderM = sql.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/i);
      if (orderM) {
        const col = orderM[1];
        const dir = orderM[2].toUpperCase();
        rows.sort((a: any, b: any) => {
          if (dir === 'DESC') return (b[col] || 0) - (a[col] || 0);
          return (a[col] || 0) - (b[col] || 0);
        });
      }
      const limitM = sql.match(/LIMIT\s+(\d+|\?)/i);
      if (limitM) {
        const limitVal = limitM[1] === '?' ? params?.[params.length - 1] : parseInt(limitM[1], 10);
        if (limitVal != null) rows = rows.slice(0, Number(limitVal));
      }
      return rows;
    }),
    runAsync: jest.fn(async (sql: string, params?: any[]) => {
      const insertM = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
      if (insertM) {
        const table = insertM[1].toLowerCase();
        const keysM = sql.match(/\(([^)]+)\)/);
        if (keysM) {
          const keys = keysM[1].split(',').map((k: string) => k.trim());
          const vals: Record<string, any> = {};
          keys.forEach((k, i) => {
            vals[k] = params?.[i];
          });
          if (!memTables[table]) memTables[table] = [];
          if (/OR\s+REPLACE/i.test(sql)) {
            const idx = memTables[table].findIndex((r: any) => r.id === vals.id);
            if (idx >= 0) memTables[table][idx] = vals;
            else memTables[table].push(vals);
          } else {
            memTables[table].push(vals);
          }
        }
      }
      const deleteM = sql.match(/DELETE\s+FROM\s+(\w+)/i);
      if (deleteM) {
        const table = deleteM[1].toLowerCase();
        if (params && params.length > 0) {
          const eq = sql.match(/(\w+)\s*=\s*\?/)?.[1];
          const lt = sql.match(/(\w+)\s*<\s*\?/)?.[1];
          if (eq) {
            memTables[table] = (memTables[table] || []).filter((r: any) => r[eq] !== params[0]);
          } else if (lt) {
            memTables[table] = (memTables[table] || []).filter((r: any) => r[lt] >= params[0]);
          }
        } else {
          memTables[table] = [];
        }
      }
      return { lastInsertRowId: 1, changes: 1 };
    }),
  };
}

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => {
    return mockDb();
  }),
}));

import * as DB from '../src/db/database';

beforeEach(() => {
  Object.keys(memTables).forEach((k) => delete memTables[k]);
  jest.clearAllMocks();
});

describe('database.ts (native / SQLite)', () => {
  it('getSetting returns null for missing key', async () => {
    const val = await DB.getSetting('nonexistent');
    expect(val).toBeNull();
  });

  it('setSetting and getSetting roundtrip', async () => {
    await DB.setSetting('theme', 'dark');
    const val = await DB.getSetting('theme');
    expect(val).toBe('dark');
  });

  it('loadMiners returns empty array', async () => {
    const miners = await DB.loadMiners();
    expect(miners).toEqual([]);
  });

  it('saveMiner and loadMiners roundtrip', async () => {
    const miner: Miner = {
      id: 'm1',
      name: 'Test',
      ip: '192.168.1.1',
      port: 80,
      isOnline: true,
    };
    await DB.saveMiner(miner);
    const miners = await DB.loadMiners();
    expect(miners).toHaveLength(1);
    expect(miners[0].id).toBe('m1');
  });

  it('saveMiner updates existing', async () => {
    const miner: Miner = {
      id: 'm1',
      name: 'Old',
      ip: '192.168.1.1',
      port: 80,
      isOnline: true,
    };
    await DB.saveMiner(miner);
    await DB.saveMiner({ ...miner, name: 'New' });
    const miners = await DB.loadMiners();
    expect(miners).toHaveLength(1);
    expect(miners[0].name).toBe('New');
  });

  it('deleteMiner removes miner and snapshots', async () => {
    const miner: Miner = {
      id: 'm1',
      name: 'T',
      ip: '192.168.1.1',
      port: 80,
      isOnline: true,
    };
    await DB.saveMiner(miner);
    await DB.saveSnapshot({
      minerId: 'm1',
      timestamp: 1000,
      hashRate: 500,
      hashRateUnit: 'GH/s',
      temperature: 50,
      voltage: 1200,
      current: 3.5,
      power: 12,
      sharesAccepted: 100,
      sharesRejected: 1,
      uptimeSeconds: 3600,
      frequency: 400,
    });
    await DB.deleteMiner('m1');
    const miners = await DB.loadMiners();
    expect(miners).toHaveLength(0);
    const snaps = await DB.getSnapshots('m1');
    expect(snaps).toHaveLength(0);
  });

  it('saveSnapshot and getSnapshots roundtrip', async () => {
    const snap: MinerSnapshot = {
      minerId: 'm1',
      timestamp: 1000,
      hashRate: 500,
      hashRateUnit: 'GH/s',
      temperature: 50,
      voltage: 1200,
      current: 3.5,
      power: 12,
      sharesAccepted: 100,
      sharesRejected: 1,
      uptimeSeconds: 3600,
      frequency: 400,
    };
    await DB.saveSnapshot(snap);
    const snaps = await DB.getSnapshots('m1');
    expect(snaps).toHaveLength(1);
    expect(snaps[0].hashRate).toBe(500);
  });

  it('getSnapshots respects limit', async () => {
    for (let i = 0; i < 10; i++) {
      await DB.saveSnapshot({
        minerId: 'm1',
        timestamp: i,
        hashRate: i,
        hashRateUnit: 'GH/s',
        temperature: 50,
        voltage: 1200,
        current: 3.5,
        power: 12,
        sharesAccepted: 100,
        sharesRejected: 1,
        uptimeSeconds: 3600,
        frequency: 400,
      });
    }
    const snaps = await DB.getSnapshots('m1', 3);
    expect(snaps).toHaveLength(3);
  });

  it('wallet CRUD', async () => {
    const wallet: Wallet = {
      id: 'w1',
      name: 'My Wallet',
      address: 'bc1q...',
      color: '#6C63FF',
      createdAt: 1000,
    };
    await DB.saveWallet(wallet);
    let wallets = await DB.loadWallets();
    expect(wallets).toHaveLength(1);
    expect(wallets[0].name).toBe('My Wallet');

    await DB.deleteWallet('w1');
    wallets = await DB.loadWallets();
    expect(wallets).toHaveLength(0);
  });

  it('cleanupOldSnapshots removes old data', async () => {
    const now = Date.now();
    await DB.saveSnapshot({
      minerId: 'm1',
      timestamp: now - 10 * 86400000,
      hashRate: 100,
      hashRateUnit: 'GH/s',
      temperature: 50,
      voltage: 1200,
      current: 3.5,
      power: 12,
      sharesAccepted: 100,
      sharesRejected: 1,
      uptimeSeconds: 3600,
      frequency: 400,
    });
    await DB.saveSnapshot({
      minerId: 'm1',
      timestamp: now,
      hashRate: 200,
      hashRateUnit: 'GH/s',
      temperature: 50,
      voltage: 1200,
      current: 3.5,
      power: 12,
      sharesAccepted: 100,
      sharesRejected: 1,
      uptimeSeconds: 3600,
      frequency: 400,
    });
    await DB.cleanupOldSnapshots(7 * 86400000);
    const snaps = await DB.getSnapshots('m1');
    expect(snaps).toHaveLength(1);
    expect(snaps[0].hashRate).toBe(200);
  });
});
