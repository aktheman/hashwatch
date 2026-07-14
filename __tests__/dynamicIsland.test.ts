import { Platform, NativeModules } from 'react-native';

const mockUpdateFn = jest.fn().mockResolvedValue(undefined);
(NativeModules as any).DynamicIsland = { update: mockUpdateFn };

import { updateDynamicIsland, isDynamicIslandSupported } from '../src/services/dynamicIsland';

function setIOS(version: number) {
  Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
  Object.defineProperty(Platform, 'Version', {
    value: version,
    writable: true,
    configurable: true,
  });
}

function setNonIOS(os: string) {
  Object.defineProperty(Platform, 'OS', { value: os, writable: true, configurable: true });
}

const origOS = Platform.OS;
const origVer = (Platform as any).Version;

afterEach(() => {
  Object.defineProperty(Platform, 'OS', { value: origOS, writable: true, configurable: true });
  Object.defineProperty(Platform, 'Version', {
    value: origVer,
    writable: true,
    configurable: true,
  });
  mockUpdateFn.mockClear();
});

const mockMiners = [
  {
    id: 'm1',
    name: 'Miner1',
    ip: '192.168.1.1',
    port: 80,
    isOnline: true,
    status: {
      hashRate: 2.5,
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
  {
    id: 'm2',
    name: 'Miner2',
    ip: '192.168.1.2',
    port: 80,
    isOnline: false,
    status: null,
  },
];

describe('dynamicIsland', () => {
  it('isDynamicIslandSupported returns false on android', () => {
    setNonIOS('android');
    expect(isDynamicIslandSupported()).toBe(false);
  });

  it('isDynamicIslandSupported returns false on web', () => {
    setNonIOS('web');
    expect(isDynamicIslandSupported()).toBe(false);
  });

  it('isDynamicIslandSupported returns true on iOS 16+', () => {
    setIOS(17);
    expect(isDynamicIslandSupported()).toBe(true);
  });

  it('isDynamicIslandSupported returns false on iOS 15', () => {
    setIOS(15);
    expect(isDynamicIslandSupported()).toBe(false);
  });

  it('updateDynamicIsland calls native module on iOS 16+', async () => {
    setIOS(16);
    await updateDynamicIsland(mockMiners);
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        compact: expect.stringContaining('1/2'),
      }),
    );
  });

  it('updateDynamicIsland is no-op on android', async () => {
    setNonIOS('android');
    await updateDynamicIsland(mockMiners);
    expect(mockUpdateFn).not.toHaveBeenCalled();
  });

  it('updateDynamicIsland is no-op on old iOS', async () => {
    setIOS(14);
    await updateDynamicIsland(mockMiners);
    expect(mockUpdateFn).not.toHaveBeenCalled();
  });

  it('updateDynamicIsland handles no native module', async () => {
    setIOS(16);
    const saved = (NativeModules as any).DynamicIsland;
    delete (NativeModules as any).DynamicIsland;
    await expect(updateDynamicIsland(mockMiners)).resolves.toBeUndefined();
    (NativeModules as any).DynamicIsland = saved;
  });

  it('updateDynamicIsland handles update error', async () => {
    setIOS(16);
    mockUpdateFn.mockRejectedValueOnce(new Error('fail'));
    await expect(updateDynamicIsland(mockMiners)).resolves.toBeUndefined();
  });
});
