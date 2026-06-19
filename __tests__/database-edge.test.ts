let DB: typeof import('../src/db/database');
let store: Record<string, string>;

beforeAll(() => {
  store = {};
  Object.defineProperty(global, 'localStorage', {
    value: {
      getItem: jest.fn((key: string) => store[key] ?? null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
    },
    writable: true,
  });
});

beforeEach(() => {
  store = {};
});

describe('loadJSON error handling', () => {
  beforeAll(() => {
    jest.isolateModules(() => {
      DB = require('../src/db/database.ts');
    });
  });

  it('returns fallback on JSON parse error', async () => {
    store['hashwatch_miners'] = '{invalid}';
    const miners = await DB.loadMiners();
    expect(miners).toEqual([]);
  });

  it('returns fallback on null localStorage', async () => {
    const miners = await DB.loadMiners();
    expect(miners).toEqual([]);
  });

  it('saveMiner handles full localStorage gracefully', async () => {
    const originalImpl = (global.localStorage.setItem as jest.Mock).getMockImplementation();
    (global.localStorage.setItem as jest.Mock).mockImplementation(() => {
      throw new Error('storage full');
    });

    const miner = { id: 'm1', name: 'Test', ip: '192.168.1.1', port: 80, isOnline: false };
    await expect(DB.saveMiner(miner as any)).resolves.toBeUndefined();

    (global.localStorage.setItem as jest.Mock).mockImplementation(originalImpl);
  });
});

describe('schema migration', () => {
  it('migrates from version 0 when module loads', () => {
    store['hashwatch_schema_version'] = '0';
    store['hashwatch_miners'] = JSON.stringify([
      { id: 'm1', name: 'Old', ip: '1.2.3.4', port: 80 },
    ]);
    store['hashwatch_snapshots'] = JSON.stringify([]);

    jest.isolateModules(() => {
      require('../src/db/database.ts');
    });

    expect(store['hashwatch_schema_version']).toBe('2');
    expect(() => JSON.parse(store['hashwatch_miners'])).not.toThrow();
    const miners = JSON.parse(store['hashwatch_miners']);
    expect(miners).toHaveLength(1);
    expect(miners[0].name).toBe('Old');
    expect(store['hashwatch_snapshots']).toBe('[]');
  });

  it('migrates from version 1 when module loads', () => {
    store['hashwatch_schema_version'] = '1';
    store['hashwatch_miners'] = JSON.stringify([
      { id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80 },
    ]);
    store['hashwatch_snapshots'] = JSON.stringify([{ minerId: 'm1', hashRate: 500 }]);

    jest.isolateModules(() => {
      require('../src/db/database.ts');
    });

    expect(store['hashwatch_schema_version']).toBe('2');
    const snapshots = JSON.parse(store['hashwatch_snapshots']);
    expect(snapshots[0].hashRateUnit).toBe('GH/s');
  });

  it('skips migration when already current version', () => {
    store['hashwatch_schema_version'] = '2';
    store['hashwatch_miners'] = JSON.stringify([
      { id: 'm1', name: 'Test', ip: '1.2.3.4', port: 80 },
    ]);

    jest.isolateModules(() => {
      require('../src/db/database.ts');
    });

    expect(store['hashwatch_schema_version']).toBe('2');
  });
});

describe('CRUD operations', () => {
  beforeAll(() => {
    jest.isolateModules(() => {
      DB = require('../src/db/database.ts');
    });
  });

  it('deleteMiner removes miner and its snapshots', async () => {
    store['hashwatch_miners'] = JSON.stringify([{ id: 'm1', name: 'M1', ip: '1.2.3.4', port: 80 }]);
    store['hashwatch_snapshots'] = JSON.stringify([
      { minerId: 'm1', hashRate: 500 },
      { minerId: 'm2', hashRate: 600 },
    ]);

    await DB.deleteMiner('m1');

    const miners = await DB.loadMiners();
    expect(miners).toHaveLength(0);

    const snapshots = JSON.parse(store['hashwatch_snapshots']);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].minerId).toBe('m2');
  });

  it('getSetting returns null for missing key', async () => {
    const val = await DB.getSetting('nonexistent');
    expect(val).toBeNull();
  });

  it('setSetting persists and getSetting retrieves it', async () => {
    await DB.setSetting('theme', 'dark');
    const val = await DB.getSetting('theme');
    expect(val).toBe('dark');
  });

  it('saveWallet adds new wallet', async () => {
    const wallet = {
      id: 'w1',
      name: 'Mining',
      address: 'bc1q...',
      color: '#fff',
      createdAt: Date.now(),
    };
    await DB.saveWallet(wallet);
    const wallets = await DB.loadWallets();
    expect(wallets).toHaveLength(1);
    expect(wallets[0].name).toBe('Mining');
  });

  it('saveWallet updates existing wallet', async () => {
    const wallet = {
      id: 'w1',
      name: 'Mining',
      address: 'bc1q...',
      color: '#fff',
      createdAt: Date.now(),
    };
    await DB.saveWallet(wallet);
    await DB.saveWallet({ ...wallet, name: 'Updated' });
    const wallets = await DB.loadWallets();
    expect(wallets).toHaveLength(1);
    expect(wallets[0].name).toBe('Updated');
  });

  it('deleteWallet removes wallet', async () => {
    const wallet = {
      id: 'w1',
      name: 'Mining',
      address: 'bc1q...',
      color: '#fff',
      createdAt: Date.now(),
    };
    await DB.saveWallet(wallet);
    await DB.deleteWallet('w1');
    const wallets = await DB.loadWallets();
    expect(wallets).toHaveLength(0);
  });

  it('saveSnapshot persists snapshot', async () => {
    const snap = {
      minerId: 'm1',
      timestamp: Date.now(),
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
    await DB.saveSnapshot(snap as any);
    const snaps = await DB.getSnapshots('m1');
    expect(snaps).toHaveLength(1);
  });

  it('getSnapshots returns limited results', async () => {
    for (let i = 0; i < 10; i++) {
      await DB.saveSnapshot({
        minerId: 'm1',
        timestamp: Date.now() + i,
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
      } as any);
    }
    const snaps = await DB.getSnapshots('m1', 3);
    expect(snaps).toHaveLength(3);
  });

  it('cleanupOldSnapshots removes old snapshots', async () => {
    const old = Date.now() - 100 * 24 * 60 * 60 * 1000;
    await DB.saveSnapshot({
      minerId: 'm1',
      timestamp: old,
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
    } as any);
    await DB.saveSnapshot({
      minerId: 'm1',
      timestamp: Date.now(),
      hashRate: 600,
      hashRateUnit: 'GH/s',
      temperature: 55,
      voltage: 1200,
      current: 3.5,
      power: 13,
      sharesAccepted: 200,
      sharesRejected: 0,
      uptimeSeconds: 7200,
      frequency: 400,
    } as any);

    await DB.cleanupOldSnapshots(30 * 24 * 60 * 60 * 1000);
    const snaps = await DB.getSnapshots('m1');
    expect(snaps).toHaveLength(1);
  });

  it('cleanupOldSnapshots with custom threshold', async () => {
    const recent = Date.now() - 5 * 24 * 60 * 60 * 1000;
    await DB.saveSnapshot({
      minerId: 'm1',
      timestamp: recent,
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
    } as any);

    await DB.cleanupOldSnapshots(1 * 24 * 60 * 60 * 1000);
    const snaps = await DB.getSnapshots('m1');
    expect(snaps).toHaveLength(0);
  });
});
