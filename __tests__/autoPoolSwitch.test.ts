import { Miner, MinerStatus } from '../src/types';

const mockGetSetting = jest.fn().mockResolvedValue(null);
const mockSetSetting = jest.fn().mockResolvedValue(undefined);
const mockRecommendPools = jest.fn().mockReturnValue([]);
const mockAnalyzePoolPerformance = jest.fn().mockReturnValue({});
const mockSetPool = jest.fn().mockResolvedValue(true);

jest.mock('../src/db/database', () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
  setSetting: (...args: unknown[]) => mockSetSetting(...args),
}));

jest.mock('../src/utils/poolRecommendation', () => ({
  recommendPools: (...args: unknown[]) => mockRecommendPools(...args),
  analyzePoolPerformance: (...args: unknown[]) => mockAnalyzePoolPerformance(...args),
}));

jest.mock('../src/api/bitaxe', () => ({
  BitAxeClient: jest.fn().mockImplementation(() => ({ setPool: mockSetPool })),
}));

import { BitAxeClient } from '../src/api/bitaxe';
import {
  shouldAutoSwitch,
  performAutoSwitch,
  getLastSwitchTimestamp,
} from '../src/services/autoPoolSwitch';

const MockBitAxeClient = BitAxeClient as unknown as jest.Mock;

function makeMiner(overrides: Partial<Miner> & { id: string }): Miner {
  return {
    name: overrides.id,
    ip: '192.168.1.100',
    port: 80,
    isOnline: true,
    ...overrides,
  };
}

function makeStatus(overrides: Partial<MinerStatus> = {}): MinerStatus {
  return {
    hashRate: 100,
    hashRateUnit: 'GH/s',
    temperature: 50,
    vrTemp: 0,
    voltage: 12,
    current: 5,
    power: 50,
    sharesAccepted: 100,
    sharesRejected: 10,
    bestDiff: '0',
    bestSessionDiff: '0',
    uptimeSeconds: 3600,
    coreVoltage: 0,
    frequency: 0,
    fanSpeed: 0,
    fanRpm: 0,
    pool: '',
    poolPort: 3333,
    poolUser: 'user',
    poolResponseTime: 0,
    ...overrides,
  };
}

const TARGET_REC = {
  pool: 'pool.ckpool.org',
  reason: 'rejection too high',
  estimatedImprovement: 1,
  confidence: 'medium',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSetting.mockResolvedValue(null);
  mockSetSetting.mockResolvedValue(undefined);
  mockRecommendPools.mockReturnValue([]);
  mockAnalyzePoolPerformance.mockReturnValue({});
  mockSetPool.mockResolvedValue(true);
});

describe('shouldAutoSwitch', () => {
  it('returns true when the setting is "true"', async () => {
    mockGetSetting.mockResolvedValue('true');

    expect(await shouldAutoSwitch()).toBe(true);
    expect(mockGetSetting).toHaveBeenCalledWith('auto_pool_switch');
  });

  it.each<string | null | undefined>(['false', null, undefined])(
    'returns false when the setting is %p',
    async (value) => {
      mockGetSetting.mockResolvedValue(value);

      expect(await shouldAutoSwitch()).toBe(false);
    },
  );
});

describe('performAutoSwitch', () => {
  it('returns [] when auto-pool-switch is disabled', async () => {
    mockGetSetting.mockResolvedValue(null);

    const result = await performAutoSwitch([makeMiner({ id: 'm1' })]);

    expect(result).toEqual([]);
    expect(mockRecommendPools).not.toHaveBeenCalled();
  });

  it('returns [] when recommendPools returns no recommendations', async () => {
    mockGetSetting.mockResolvedValue('true');
    mockRecommendPools.mockReturnValue([]);

    const result = await performAutoSwitch([makeMiner({ id: 'm1' })]);

    expect(result).toEqual([]);
    expect(mockSetSetting).not.toHaveBeenCalled();
  });

  it('returns [] when no pool exceeds the rejection threshold', async () => {
    mockGetSetting.mockResolvedValue('true');
    mockRecommendPools.mockReturnValue([TARGET_REC]);
    mockAnalyzePoolPerformance.mockReturnValue({
      'stratum.slushpool.com': { minerCount: 1, avgRejectionRate: 0.05, totalHashrate: 100 },
    });

    const result = await performAutoSwitch([makeMiner({ id: 'm1' })]);

    expect(result).toEqual([]);
    expect(mockSetSetting).not.toHaveBeenCalled();
  });

  it('switches affected miners to the recommended pool', async () => {
    mockGetSetting.mockResolvedValue('true');
    mockRecommendPools.mockReturnValue([TARGET_REC]);
    mockAnalyzePoolPerformance.mockReturnValue({
      'stratum.slushpool.com': { minerCount: 1, avgRejectionRate: 0.5, totalHashrate: 100 },
    });
    const miner = makeMiner({
      id: 'm1',
      ip: '10.0.0.5',
      port: 80,
      status: makeStatus({
        pool: 'stratum+tcp://stratum.slushpool.com:3333',
        poolUser: 'miner1',
      }),
    });

    const result = await performAutoSwitch([miner]);

    expect(result).toEqual([
      { minerId: 'm1', from: 'stratum.slushpool.com', to: 'pool.ckpool.org' },
    ]);
    expect(MockBitAxeClient).toHaveBeenCalledWith('10.0.0.5', 80, undefined, undefined);
    expect(mockSetPool).toHaveBeenCalledWith('pool.ckpool.org', 3333, 'miner1');
    expect(mockSetSetting).toHaveBeenCalledWith('auto_pool_last_switch', expect.any(String));
  });

  it('skips offline miners', async () => {
    mockGetSetting.mockResolvedValue('true');
    mockRecommendPools.mockReturnValue([TARGET_REC]);
    mockAnalyzePoolPerformance.mockReturnValue({
      'stratum.slushpool.com': { minerCount: 1, avgRejectionRate: 0.5, totalHashrate: 100 },
    });
    const miner = makeMiner({
      id: 'm1',
      isOnline: false,
      status: makeStatus({ pool: 'stratum+tcp://stratum.slushpool.com:3333' }),
    });

    const result = await performAutoSwitch([miner]);

    expect(result).toEqual([]);
    expect(mockSetPool).not.toHaveBeenCalled();
    expect(mockSetSetting).not.toHaveBeenCalled();
  });

  it('skips miners already running on the target pool', async () => {
    mockGetSetting.mockResolvedValue('true');
    mockRecommendPools.mockReturnValue([TARGET_REC]);
    mockAnalyzePoolPerformance.mockReturnValue({
      'pool.ckpool.org': { minerCount: 1, avgRejectionRate: 0.5, totalHashrate: 100 },
    });
    const miner = makeMiner({
      id: 'm1',
      status: makeStatus({ pool: 'stratum+tcp://pool.ckpool.org:3333' }),
    });

    const result = await performAutoSwitch([miner]);

    expect(result).toEqual([]);
    expect(mockSetPool).not.toHaveBeenCalled();
    expect(mockSetSetting).not.toHaveBeenCalled();
  });

  it('does not record a change when setPool fails', async () => {
    mockGetSetting.mockResolvedValue('true');
    mockRecommendPools.mockReturnValue([TARGET_REC]);
    mockAnalyzePoolPerformance.mockReturnValue({
      'stratum.slushpool.com': { minerCount: 1, avgRejectionRate: 0.5, totalHashrate: 100 },
    });
    mockSetPool.mockResolvedValue(false);
    const miner = makeMiner({
      id: 'm1',
      status: makeStatus({ pool: 'stratum+tcp://stratum.slushpool.com:3333' }),
    });

    const result = await performAutoSwitch([miner]);

    expect(result).toEqual([]);
    expect(mockSetSetting).not.toHaveBeenCalled();
  });
});

describe('getLastSwitchTimestamp', () => {
  it('returns the parsed timestamp from the setting', async () => {
    mockGetSetting.mockResolvedValue('1712345678901');

    expect(await getLastSwitchTimestamp()).toBe(1712345678901);
    expect(mockGetSetting).toHaveBeenCalledWith('auto_pool_last_switch');
  });

  it('returns null when the setting is empty', async () => {
    mockGetSetting.mockResolvedValue('');

    expect(await getLastSwitchTimestamp()).toBeNull();
  });

  it('returns null when the setting is null', async () => {
    mockGetSetting.mockResolvedValue(null);

    expect(await getLastSwitchTimestamp()).toBeNull();
  });

  it('returns null when the setting is not a number', async () => {
    mockGetSetting.mockResolvedValue('not-a-number');

    expect(await getLastSwitchTimestamp()).toBeNull();
  });
});
