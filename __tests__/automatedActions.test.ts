import { Miner } from '../src/types';

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

beforeEach(() => {
  jest.clearAllMocks();
  __resetAutomatedActions();
  mockGetSetting.mockResolvedValue(null);
  mockSetSetting.mockResolvedValue(undefined);
  mockRestart.mockResolvedValue(true);
  mockSetPool.mockResolvedValue(true);
});

describe('checkAndRestartOfflineMiners', () => {
  it('returns empty when auto-restart is disabled', async () => {
    const miners = [makeMiner({ id: 'm1', isOnline: false, lastSeen: Date.now() - 600_000 })];
    const result = await checkAndRestartOfflineMiners(miners);
    expect(result).toEqual([]);
  });

  it('returns empty when no offline miners', async () => {
    mockGetSetting.mockImplementation(async (key: string) => {
      if (key === 'automated_actions_settings') {
        return JSON.stringify({
          autoRestartEnabled: true,
          autoRestartDelayMinutes: 0,
          maxRestartsPerHour: 3,
        });
      }
      return null;
    });
    const miners = [makeMiner({ id: 'm1', isOnline: true })];
    const result = await checkAndRestartOfflineMiners(miners);
    expect(result).toEqual([]);
  });

  it('returns restart attempts for offline miners past delay', async () => {
    mockGetSetting.mockImplementation(async (key: string) => {
      if (key === 'automated_actions_settings') {
        return JSON.stringify({
          autoRestartEnabled: true,
          autoRestartDelayMinutes: 0,
          maxRestartsPerHour: 3,
        });
      }
      return null;
    });
    const miners = [makeMiner({ id: 'm1', isOnline: false, lastSeen: Date.now() - 600_000 })];
    const result = await checkAndRestartOfflineMiners(miners);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('restart');
    expect(result[0].minerId).toBe('m1');
    expect(result[0].success).toBe(true);
  });

  it('skips miners in maintenance mode', async () => {
    mockGetSetting.mockImplementation(async (key: string) => {
      if (key === 'automated_actions_settings') {
        return JSON.stringify({
          autoRestartEnabled: true,
          autoRestartDelayMinutes: 0,
          maxRestartsPerHour: 3,
        });
      }
      return null;
    });
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
});

describe('checkProfitabilityAndSwitch', () => {
  it('returns empty when auto-pool-switch is disabled', async () => {
    const result = await checkProfitabilityAndSwitch([]);
    expect(result).toEqual([]);
  });
});

describe('getAutomatedActionsSettings', () => {
  it('returns default settings when nothing saved', async () => {
    const settings = await getAutomatedActionsSettings();
    expect(settings.autoRestartEnabled).toBe(false);
    expect(settings.autoRestartDelayMinutes).toBe(10);
    expect(settings.autoPoolSwitchEnabled).toBe(false);
    expect(settings.autoPoolSwitchThreshold).toBe(5);
    expect(settings.autoGroupEnabled).toBe(false);
    expect(settings.maxRestartsPerHour).toBe(3);
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
});

describe('__resetAutomatedActions', () => {
  it('clears state so fresh results are returned', async () => {
    mockGetSetting.mockImplementation(async (key: string) => {
      if (key === 'automated_actions_settings') {
        return JSON.stringify({
          autoRestartEnabled: true,
          autoRestartDelayMinutes: 0,
          maxRestartsPerHour: 3,
        });
      }
      return null;
    });

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
