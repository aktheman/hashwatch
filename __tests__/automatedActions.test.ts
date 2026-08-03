import { Miner, MinerStatus } from '../src/types';

const mockGetSetting = jest.fn().mockResolvedValue(null);
const mockSetSetting = jest.fn().mockResolvedValue(undefined);
const mockRestart = jest.fn();
const mockSetPool = jest.fn();

jest.mock('../src/db/database', () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
  setSetting: (...args: unknown[]) => mockSetSetting(...args),
}));

jest.mock('../src/api/bitaxe', () => ({
  BitAxeClient: jest.fn().mockImplementation(() => ({
    restart: mockRestart,
    setPool: mockSetPool,
  })),
}));

jest.mock('../src/utils/poolRecommendation', () => ({
  recommendPools: jest.fn().mockReturnValue([]),
  analyzePoolPerformance: jest.fn().mockReturnValue({}),
}));

import {
  checkAndRestartOfflineMiners,
  checkProfitabilityAndSwitch,
  getAutomatedActionsSettings,
  saveAutomatedActionsSettings,
  getLastActionLog,
  __resetAutomatedActions,
} from '../src/services/automatedActions';

function makeMiner(overrides: Partial<Miner> & { id: string }): Miner {
  return {
    name: overrides.id,
    ip: '192.168.1.100',
    port: 80,
    isOnline: true,
    ...overrides,
  };
}

function makeStatus(overrides: Partial<MinerStatus>): MinerStatus {
  return {
    hashRate: 0,
    hashRateUnit: 'TH/s',
    temperature: 0,
    vrTemp: 0,
    voltage: 0,
    current: 0,
    power: 0,
    sharesAccepted: 1,
    sharesRejected: 0,
    bestDiff: '',
    bestSessionDiff: '',
    uptimeSeconds: 0,
    coreVoltage: 0,
    frequency: 0,
    fanSpeed: 0,
    fanRpm: 0,
    pool: '',
    poolPort: 3333,
    poolUser: '',
    poolResponseTime: 0,
    ...overrides,
  };
}

function enableAutoRestart(maxPerHour = 3, delay = 0): void {
  mockGetSetting.mockImplementation(async (key: string) => {
    if (key === 'automated_actions_settings') {
      return JSON.stringify({
        autoRestartEnabled: true,
        autoRestartDelayMinutes: delay,
        maxRestartsPerHour: maxPerHour,
      });
    }
    return null;
  });
}

function enableAutoPoolSwitch(threshold = 5): void {
  mockGetSetting.mockImplementation(async (key: string) => {
    if (key === 'automated_actions_settings') {
      return JSON.stringify({
        autoPoolSwitchEnabled: true,
        autoPoolSwitchThreshold: threshold,
      });
    }
    return null;
  });
}

function setupSwitchMocks(): void {
  const rec = require('../src/utils/poolRecommendation');
  rec.recommendPools.mockReturnValue([
    {
      pool: 'stratum.slushpool.com',
      reason: 'rejection',
      estimatedImprovement: 20,
      confidence: 'high',
    },
  ]);
  rec.analyzePoolPerformance.mockReturnValue({
    'pool.ckpool.org': { minerCount: 1, avgRejectionRate: 0.5, totalHashrate: 0 },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetAutomatedActions();
  mockGetSetting.mockResolvedValue(null);
  mockSetSetting.mockResolvedValue(undefined);
  mockRestart.mockResolvedValue(true);
  mockSetPool.mockResolvedValue(true);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('checkAndRestartOfflineMiners', () => {
  it('returns empty when auto-restart is disabled', async () => {
    const miners = [makeMiner({ id: 'm1', isOnline: false, lastSeen: Date.now() - 600_000 })];
    const result = await checkAndRestartOfflineMiners(miners);
    expect(result).toEqual([]);
    expect(mockRestart).not.toHaveBeenCalled();
  });

  it('returns empty when no offline miners', async () => {
    enableAutoRestart();
    const miners = [makeMiner({ id: 'm1', isOnline: true })];
    const result = await checkAndRestartOfflineMiners(miners);
    expect(result).toEqual([]);
  });

  it('returns restart attempts for offline miners past delay', async () => {
    enableAutoRestart();
    const miners = [makeMiner({ id: 'm1', isOnline: false, lastSeen: Date.now() - 600_000 })];
    const result = await checkAndRestartOfflineMiners(miners);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('restart');
    expect(result[0].minerId).toBe('m1');
    expect(result[0].success).toBe(true);
    expect(result[0].details).toContain('Restart command sent');
    expect(mockRestart).toHaveBeenCalledTimes(1);
  });

  it('skips miners in maintenance mode', async () => {
    enableAutoRestart();
    const miners = [
      makeMiner({
        id: 'm1',
        isOnline: false,
        lastSeen: Date.now() - 600_000,
        maintenanceMode: true,
      }),
    ];
    const result = await checkAndRestartOfflineMiners(miners);
    expect(result).toEqual([]);
  });

  it('skips miners without a lastSeen timestamp', async () => {
    enableAutoRestart();
    const miners = [makeMiner({ id: 'm1', isOnline: false, lastSeen: undefined })];
    const result = await checkAndRestartOfflineMiners(miners);
    expect(result).toEqual([]);
  });

  it('records a failure when restart returns false', async () => {
    enableAutoRestart();
    mockRestart.mockResolvedValue(false);
    const miners = [makeMiner({ id: 'm1', isOnline: false, lastSeen: Date.now() - 600_000 })];
    const result = await checkAndRestartOfflineMiners(miners);
    expect(result).toHaveLength(1);
    expect(result[0].success).toBe(false);
    expect(result[0].details).toContain('Restart command failed');
  });

  it('records an error when restart throws', async () => {
    enableAutoRestart();
    mockRestart.mockRejectedValue(new Error('boom'));
    const miners = [makeMiner({ id: 'm1', isOnline: false, lastSeen: Date.now() - 600_000 })];
    const result = await checkAndRestartOfflineMiners(miners);
    expect(result).toHaveLength(1);
    expect(result[0].success).toBe(false);
    expect(result[0].details).toBe('Restart error for m1: boom');
  });

  it('skips miners restarted within the cooldown window', async () => {
    enableAutoRestart();
    const miners = [makeMiner({ id: 'm1', isOnline: false, lastSeen: Date.now() - 600_000 })];
    const first = await checkAndRestartOfflineMiners(miners);
    expect(first).toHaveLength(1);
    const second = await checkAndRestartOfflineMiners(miners);
    expect(second).toEqual([]);
  });

  it('respects the max restarts per hour window', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    enableAutoRestart(1, 0);
    const miner = makeMiner({ id: 'm1', isOnline: false, lastSeen: -1000 });
    const first = await checkAndRestartOfflineMiners([miner]);
    expect(first).toHaveLength(1);

    jest.setSystemTime(61_000);
    const withinHour = await checkAndRestartOfflineMiners([miner]);
    expect(withinHour).toEqual([]);

    jest.setSystemTime(3_600_001);
    const afterHour = await checkAndRestartOfflineMiners([miner]);
    expect(afterHour).toHaveLength(1);
  });

  it('skips concurrent runs while a check is in progress', async () => {
    enableAutoRestart();
    const miners = [makeMiner({ id: 'm1', isOnline: false, lastSeen: Date.now() - 600_000 })];
    const inFlight = checkAndRestartOfflineMiners(miners);
    const second = await checkAndRestartOfflineMiners(miners);
    expect(second).toEqual([]);
    const first = await inFlight;
    expect(first).toHaveLength(1);
    expect(mockRestart).toHaveBeenCalledTimes(1);
  });
});

describe('checkProfitabilityAndSwitch', () => {
  it('returns empty when auto-pool-switch is disabled', async () => {
    const result = await checkProfitabilityAndSwitch([]);
    expect(result).toEqual([]);
  });

  it('returns empty when there are no recommendations', async () => {
    enableAutoPoolSwitch();
    const result = await checkProfitabilityAndSwitch([]);
    expect(result).toEqual([]);
  });

  it('returns empty when improvement is below the threshold', async () => {
    enableAutoPoolSwitch(5);
    const rec = require('../src/utils/poolRecommendation');
    rec.recommendPools.mockReturnValue([
      {
        pool: 'stratum.slushpool.com',
        reason: 'x',
        estimatedImprovement: 3,
        confidence: 'low',
      },
    ]);
    const result = await checkProfitabilityAndSwitch([]);
    expect(result).toEqual([]);
  });

  it('returns empty when no pool exceeds the rejection threshold', async () => {
    enableAutoPoolSwitch();
    const rec = require('../src/utils/poolRecommendation');
    rec.recommendPools.mockReturnValue([
      {
        pool: 'stratum.slushpool.com',
        reason: 'x',
        estimatedImprovement: 20,
        confidence: 'high',
      },
    ]);
    rec.analyzePoolPerformance.mockReturnValue({
      'pool.ckpool.org': { minerCount: 1, avgRejectionRate: 0.05, totalHashrate: 0 },
    });
    const result = await checkProfitabilityAndSwitch([]);
    expect(result).toEqual([]);
  });

  it('switches miners off the worst pool', async () => {
    enableAutoPoolSwitch();
    setupSwitchMocks();
    const miner = makeMiner({
      id: 'm1',
      isOnline: true,
      status: makeStatus({ pool: 'stratum+tcp://pool.ckpool.org:3333', poolUser: 'user.worker' }),
    });
    const result = await checkProfitabilityAndSwitch([miner]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('pool_switch');
    expect(result[0].minerId).toBe('m1');
    expect(result[0].success).toBe(true);
    expect(mockSetPool).toHaveBeenCalledWith('stratum.slushpool.com', 3333, 'user.worker');
    expect(result[0].details).toContain(
      'Switched m1 from pool.ckpool.org to stratum.slushpool.com',
    );
  });

  it('matches miners on subdomain pool hosts', async () => {
    enableAutoPoolSwitch();
    setupSwitchMocks();
    const miner = makeMiner({
      id: 'm1',
      isOnline: true,
      status: makeStatus({ pool: 'stratum+tcp://us-east.pool.ckpool.org:3333', poolUser: 'u' }),
    });
    const result = await checkProfitabilityAndSwitch([miner]);
    expect(result).toHaveLength(1);
    expect(result[0].minerId).toBe('m1');
  });

  it('records a failure when the pool switch returns false', async () => {
    enableAutoPoolSwitch();
    setupSwitchMocks();
    mockSetPool.mockResolvedValue(false);
    const miner = makeMiner({
      id: 'm1',
      isOnline: true,
      status: makeStatus({ pool: 'pool.ckpool.org:3333', poolUser: 'user.worker' }),
    });
    const result = await checkProfitabilityAndSwitch([miner]);
    expect(result[0].success).toBe(false);
    expect(result[0].details).toContain('Pool switch failed for m1');
  });

  it('records an error when the pool switch throws', async () => {
    enableAutoPoolSwitch();
    setupSwitchMocks();
    mockSetPool.mockRejectedValue(new Error('timeout'));
    const miner = makeMiner({
      id: 'm1',
      isOnline: true,
      status: makeStatus({ pool: 'pool.ckpool.org:3333', poolUser: 'user.worker' }),
    });
    const result = await checkProfitabilityAndSwitch([miner]);
    expect(result[0].success).toBe(false);
    expect(result[0].details).toBe('Pool switch error for m1: timeout');
  });

  it('skips miners already on the target pool', async () => {
    enableAutoPoolSwitch();
    const rec = require('../src/utils/poolRecommendation');
    rec.recommendPools.mockReturnValue([
      {
        pool: 'stratum.slushpool.com',
        reason: 'rejection',
        estimatedImprovement: 20,
        confidence: 'high',
      },
    ]);
    rec.analyzePoolPerformance.mockReturnValue({
      'stratum.slushpool.com': { minerCount: 1, avgRejectionRate: 0.5, totalHashrate: 0 },
    });
    const miner = makeMiner({
      id: 'm1',
      isOnline: true,
      status: makeStatus({ pool: 'stratum+tcp://stratum.slushpool.com:3333', poolUser: 'u' }),
    });
    const result = await checkProfitabilityAndSwitch([miner]);
    expect(result).toEqual([]);
    expect(mockSetPool).not.toHaveBeenCalled();
  });

  it('ignores offline miners and miners without status', async () => {
    enableAutoPoolSwitch();
    setupSwitchMocks();
    const offline = makeMiner({
      id: 'm1',
      isOnline: false,
      status: makeStatus({ pool: 'pool.ckpool.org:3333', poolUser: 'u' }),
    });
    const noStatus = makeMiner({ id: 'm2', isOnline: true });
    const result = await checkProfitabilityAndSwitch([offline, noStatus]);
    expect(result).toEqual([]);
  });

  it('records an error action when recommendations throw', async () => {
    enableAutoPoolSwitch();
    const rec = require('../src/utils/poolRecommendation');
    rec.recommendPools.mockImplementation(() => {
      throw new Error('analysis failed');
    });
    const result = await checkProfitabilityAndSwitch([]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('pool_switch');
    expect(result[0].success).toBe(false);
    expect(result[0].details).toBe('Auto-pool-switch check failed: analysis failed');
  });
});

describe('getAutomatedActionsSettings', () => {
  it('returns default settings when nothing saved', async () => {
    const settings = await getAutomatedActionsSettings();
    expect(settings).toEqual({
      autoRestartEnabled: false,
      autoRestartDelayMinutes: 10,
      autoPoolSwitchEnabled: false,
      autoPoolSwitchThreshold: 5,
      autoGroupEnabled: false,
      maxRestartsPerHour: 3,
    });
  });

  it('merges saved settings with defaults', async () => {
    mockGetSetting.mockImplementation(async (key: string) => {
      if (key === 'automated_actions_settings') {
        return JSON.stringify({ autoRestartEnabled: true, maxRestartsPerHour: 5 });
      }
      return null;
    });
    const settings = await getAutomatedActionsSettings();
    expect(settings.autoRestartEnabled).toBe(true);
    expect(settings.maxRestartsPerHour).toBe(5);
    expect(settings.autoRestartDelayMinutes).toBe(10);
  });

  it('returns defaults when saved settings are corrupted', async () => {
    mockGetSetting.mockImplementation(async (key: string) => {
      if (key === 'automated_actions_settings') {
        return 'not-json';
      }
      return null;
    });
    const settings = await getAutomatedActionsSettings();
    expect(settings.autoRestartEnabled).toBe(false);
  });

  it('returns defaults when the database read fails', async () => {
    mockGetSetting.mockRejectedValue(new Error('db down'));
    const settings = await getAutomatedActionsSettings();
    expect(settings.autoRestartEnabled).toBe(false);
    expect(settings.maxRestartsPerHour).toBe(3);
  });
});

describe('saveAutomatedActionsSettings', () => {
  it('persists settings to database', async () => {
    const settings = {
      autoRestartEnabled: true,
      autoRestartDelayMinutes: 15,
      autoPoolSwitchEnabled: false,
      autoPoolSwitchThreshold: 10,
      autoGroupEnabled: true,
      maxRestartsPerHour: 2,
    };
    await saveAutomatedActionsSettings(settings);
    expect(mockSetSetting).toHaveBeenCalledWith(
      'automated_actions_settings',
      JSON.stringify(settings),
    );
  });
});

describe('getLastActionLog', () => {
  it('returns empty array when no actions logged', async () => {
    const log = await getLastActionLog();
    expect(log).toEqual([]);
  });

  it('loads a persisted action log from storage', async () => {
    const stored = [
      {
        id: 'a',
        type: 'restart',
        minerId: 'm1',
        minerName: 'm1',
        timestamp: 1,
        success: true,
        details: 'x',
      },
      {
        id: 'b',
        type: 'restart',
        minerId: 'm2',
        minerName: 'm2',
        timestamp: 2,
        success: false,
        details: 'y',
      },
    ];
    mockGetSetting.mockImplementation(async (key: string) => {
      if (key === 'automated_action_log') {
        return JSON.stringify(stored);
      }
      return null;
    });
    const log = await getLastActionLog();
    expect(log).toHaveLength(2);
    expect(log[0].id).toBe('b');
    expect(log[1].id).toBe('a');
  });

  it('returns empty log when persisted data is corrupted', async () => {
    mockGetSetting.mockImplementation(async (key: string) => {
      if (key === 'automated_action_log') {
        return 'not-json';
      }
      return null;
    });
    const log = await getLastActionLog();
    expect(log).toEqual([]);
  });

  it('returns the in-memory log after a restart check', async () => {
    enableAutoRestart();
    const miners = [makeMiner({ id: 'm1', isOnline: false, lastSeen: Date.now() - 600_000 })];
    await checkAndRestartOfflineMiners(miners);
    const log = await getLastActionLog();
    expect(log).toHaveLength(1);
    expect(log[0].minerId).toBe('m1');
    expect(log[0].success).toBe(true);
  });

  it('caps the action log at 100 entries', async () => {
    enableAutoRestart();
    const miners = Array.from({ length: 105 }, (_, i) =>
      makeMiner({ id: `m${i}`, isOnline: false, lastSeen: Date.now() - 600_000 }),
    );
    const result = await checkAndRestartOfflineMiners(miners);
    expect(result).toHaveLength(105);
    const log = await getLastActionLog();
    expect(log).toHaveLength(100);
    const persistCalls = mockSetSetting.mock.calls.filter((c) => c[0] === 'automated_action_log');
    expect(persistCalls.length).toBeGreaterThan(0);
    expect(JSON.parse(persistCalls[persistCalls.length - 1][1] as string)).toHaveLength(100);
  });
});

describe('__resetAutomatedActions', () => {
  it('clears state so fresh results are returned', async () => {
    enableAutoRestart();
    const miners = [makeMiner({ id: 'm1', isOnline: false, lastSeen: Date.now() - 600_000 })];
    await checkAndRestartOfflineMiners(miners);
    __resetAutomatedActions();
    mockRestart.mockClear();

    const miners2 = [makeMiner({ id: 'm2', isOnline: false, lastSeen: Date.now() - 600_000 })];
    const result = await checkAndRestartOfflineMiners(miners2);
    expect(result).toHaveLength(1);
    expect(result[0].minerId).toBe('m2');
  });
});
