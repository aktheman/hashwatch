import {
  checkMinerAlerts,
  cleanupAlertState,
  resetAlertState,
} from '../src/services/notifications';
import { Miner } from '../src/types';

const mockSchedule = jest.fn();
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: (...args: unknown[]) => mockSchedule(...args),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationChannelAsync: jest.fn(),
}));

function makeStatus(overrides: Partial<Miner['status']> = {}): Miner['status'] {
  return {
    hashRate: 500,
    hashRateUnit: 'GH/s',
    temperature: 50,
    vrTemp: 0,
    voltage: 1200,
    current: 3.5,
    power: 12,
    sharesAccepted: 100,
    sharesRejected: 1,
    bestDiff: '0',
    bestSessionDiff: '0',
    uptimeSeconds: 3600,
    coreVoltage: 1200,
    frequency: 400,
    fanSpeed: 50,
    fanRpm: 3000,
    pool: 'stratum.solomining.io',
    poolPort: 3333,
    poolUser: 'user.worker',
    poolResponseTime: 100,
    ...overrides,
  };
}

function makeMiner(id: string, overrides: Partial<Miner> = {}): Miner {
  return {
    id,
    name: `Miner ${id}`,
    ip: `192.168.1.${id}`,
    port: 80,
    isOnline: true,
    status: makeStatus(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetAlertState();
});

describe('cleanupAlertState', () => {
  it('removes stale miners from internal state', () => {
    cleanupAlertState(new Set(['1']));
  });
});

describe('offline alert', () => {
  it('sends alert when miner goes offline', async () => {
    const prev = [makeMiner('1', { isOnline: true })];
    const current = [makeMiner('1', { isOnline: false })];

    await checkMinerAlerts(prev, current);

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Miner Offline' }),
      }),
    );
  });

  it('sends online alert when miner reconnects', async () => {
    await checkMinerAlerts(
      [makeMiner('1', { isOnline: true })],
      [makeMiner('1', { isOnline: false })],
    );
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Miner Offline' }),
      }),
    );

    await checkMinerAlerts(
      [makeMiner('1', { isOnline: false })],
      [makeMiner('1', { isOnline: true })],
    );

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Miner Reconnected' }),
      }),
    );
  });
});

describe('hot alert', () => {
  it('sends alert when temperature exceeds 70', async () => {
    const prev = [makeMiner('1', { status: makeStatus({ temperature: 50 }) })];
    const current = [makeMiner('1', { status: makeStatus({ temperature: 75 }) })];

    await checkMinerAlerts(prev, current);

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'High Temperature' }),
      }),
    );
  });

  it('does not re-alert if already notified', async () => {
    const prev = [makeMiner('1', { status: makeStatus({ temperature: 50 }) })];
    const hot = makeMiner('1', { status: makeStatus({ temperature: 75 }) });

    await checkMinerAlerts(prev, [hot]);
    expect(mockSchedule).toHaveBeenCalledTimes(1);

    await checkMinerAlerts([hot], [hot]);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
  });
});

describe('hashrate drop alert', () => {
  it('sends alert when hashrate drops >50%', async () => {
    const prev = [makeMiner('1', { status: makeStatus({ hashRate: 500 }) })];
    const current = [makeMiner('1', { status: makeStatus({ hashRate: 200 }) })];

    await checkMinerAlerts(prev, current);

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Hashrate Drop' }),
      }),
    );
  });
});

describe('pool lost alert', () => {
  it('sends alert when pool disconnects', async () => {
    const prev = [makeMiner('1', { status: makeStatus({ pool: 'stratum.solomining.io' }) })];
    const current = [makeMiner('1', { status: makeStatus({ pool: '' }) })];

    await checkMinerAlerts(prev, current);

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Pool Disconnected' }),
      }),
    );
  });
});

describe('long uptime alert', () => {
  it('sends alert when uptime exceeds 24h', async () => {
    const prev = [makeMiner('1', { status: makeStatus({ uptimeSeconds: 80000 }) })];
    const current = [makeMiner('1', { status: makeStatus({ uptimeSeconds: 90000 }) })];

    await checkMinerAlerts(prev, current);

    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Long Uptime' }),
      }),
    );
  });
});
