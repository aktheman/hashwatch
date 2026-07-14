import { Platform } from 'react-native';

const mockStartActivity = jest.fn().mockResolvedValue(undefined);
const mockUpdateActivity = jest.fn().mockResolvedValue(undefined);
const mockEndActivity = jest.fn().mockResolvedValue(undefined);

jest.mock(
  'expo-activitykit',
  () => ({
    startActivityAsync: (...args: unknown[]) => mockStartActivity(...args),
    updateActivityAsync: (...args: unknown[]) => mockUpdateActivity(...args),
    endActivityAsync: (...args: unknown[]) => mockEndActivity(...args),
  }),
  { virtual: true },
);

import {
  startLiveActivity,
  updateLiveActivity,
  endLiveActivity,
  isLiveActivitySupported,
  _resetModuleCache,
} from '../src/services/liveActivity';

const mockMiners = [
  {
    id: 'm1',
    name: 'Miner1',
    ip: '192.168.1.1',
    port: 80,
    isOnline: true,
    status: {
      hashRate: 1.5,
      hashRateUnit: 'TH/s' as const,
      temperature: 50,
      power: 12,
      sharesAccepted: 100,
      sharesRejected: 1,
      uptimeSeconds: 3600,
      voltage: 1200,
      current: 3,
      bestDiff: '1M',
      bestSessionDiff: '500K',
      coreVoltage: 1200,
      frequency: 400,
      fanSpeed: 50,
      fanRpm: 3000,
      pool: 'pool',
      poolPort: 3333,
      poolUser: 'u',
      poolResponseTime: 100,
    },
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  _resetModuleCache();
});

describe('liveActivity', () => {
  it('isLiveActivitySupported returns true on iOS', () => {
    Platform.OS = 'ios';
    expect(isLiveActivitySupported()).toBe(true);
  });

  it('isLiveActivitySupported returns false on android', () => {
    Platform.OS = 'android';
    expect(isLiveActivitySupported()).toBe(false);
  });

  it('isLiveActivitySupported returns false on web', () => {
    Platform.OS = 'web';
    expect(isLiveActivitySupported()).toBe(false);
  });

  it('startLiveActivity calls module on iOS', async () => {
    Platform.OS = 'ios';
    await startLiveActivity(mockMiners);
    expect(mockStartActivity).toHaveBeenCalledWith(
      { type: 'MiningMonitor' },
      expect.objectContaining({
        value: expect.objectContaining({
          onlineCount: 1,
          totalCount: 1,
        }),
      }),
    );
  });

  it('updateLiveActivity calls module on iOS', async () => {
    Platform.OS = 'ios';
    await updateLiveActivity(mockMiners);
    expect(mockUpdateActivity).toHaveBeenCalled();
  });

  it('endLiveActivity calls module on iOS', async () => {
    Platform.OS = 'ios';
    await endLiveActivity();
    expect(mockEndActivity).toHaveBeenCalled();
  });

  it('startLiveActivity is no-op on non-iOS', async () => {
    Platform.OS = 'android';
    await startLiveActivity(mockMiners);
    expect(mockStartActivity).not.toHaveBeenCalled();
  });

  it('handles module load failure gracefully', async () => {
    Platform.OS = 'ios';
    mockStartActivity.mockRejectedValueOnce(new Error('no module'));
    await expect(startLiveActivity(mockMiners)).resolves.toBeUndefined();
  });
});
