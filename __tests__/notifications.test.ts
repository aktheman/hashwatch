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

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn().mockResolvedValue('true'),
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

async function populateAllAlertStates() {
  const prev = [
    makeMiner('2', {
      status: makeStatus({
        hashRate: 500,
        temperature: 50,
        pool: 'stratum.solomining.io',
        uptimeSeconds: 80000,
      }),
    }),
  ];
  const hot = [
    makeMiner('2', {
      status: makeStatus({
        hashRate: 500,
        temperature: 75,
        pool: 'stratum.solomining.io',
        uptimeSeconds: 90000,
      }),
    }),
  ];
  await checkMinerAlerts(prev, hot);
  const dropped = [
    makeMiner('2', {
      status: makeStatus({ hashRate: 200, temperature: 75, pool: '', uptimeSeconds: 90000 }),
    }),
  ];
  await checkMinerAlerts(hot, dropped);
}

describe('cleanupAlertState', () => {
  it('removes stale miners from internal state', async () => {
    await populateAllAlertStates();
    cleanupAlertState(new Set(['3']));
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

  it('sends offline reminder after 5 minutes', async () => {
    const NOW = Date.now();
    const realNow = Date.now;
    Date.now = jest.fn(() => NOW);

    await checkMinerAlerts(
      [makeMiner('3', { isOnline: true })],
      [makeMiner('3', { isOnline: false })],
    );
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Miner Offline' }),
      }),
    );
    jest.clearAllMocks();

    Date.now = jest.fn(() => NOW + 300001);

    await checkMinerAlerts(
      [makeMiner('3', { isOnline: false })],
      [makeMiner('3', { isOnline: false })],
    );
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Still Offline' }),
      }),
    );

    Date.now = realNow;
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

  it('resets hot alert when temperature drops below 65', async () => {
    const prev = [makeMiner('4', { status: makeStatus({ temperature: 50 }) })];
    const hotMiner = makeMiner('4', { status: makeStatus({ temperature: 75 }) });

    await checkMinerAlerts(prev, [hotMiner]);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'High Temperature' }),
      }),
    );
    jest.clearAllMocks();

    const cooled = makeMiner('4', { status: makeStatus({ temperature: 60 }) });
    await checkMinerAlerts([hotMiner], [cooled]);
    expect(mockSchedule).not.toHaveBeenCalled();

    const reHot = makeMiner('4', { status: makeStatus({ temperature: 80 }) });
    await checkMinerAlerts([cooled], [reHot]);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'High Temperature' }),
      }),
    );
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

  it('resets hashrate drop alert when hashrate recovers', async () => {
    const prev = [makeMiner('5', { status: makeStatus({ hashRate: 500 }) })];
    const dropped = [makeMiner('5', { status: makeStatus({ hashRate: 200 }) })];
    await checkMinerAlerts(prev, dropped);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    const recovered = [makeMiner('5', { status: makeStatus({ hashRate: 500 }) })];
    await checkMinerAlerts(dropped, recovered);
    expect(mockSchedule).not.toHaveBeenCalled();

    const dropAgain = [makeMiner('5', { status: makeStatus({ hashRate: 200 }) })];
    await checkMinerAlerts(recovered, dropAgain);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
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

  it('resets pool loss when pool reconnects', async () => {
    const prev = [makeMiner('6', { status: makeStatus({ pool: 'stratum.solomining.io' }) })];
    const lost = [makeMiner('6', { status: makeStatus({ pool: '' }) })];
    await checkMinerAlerts(prev, lost);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    const reconnected = [makeMiner('6', { status: makeStatus({ pool: 'stratum.backup.io' }) })];
    await checkMinerAlerts(lost, reconnected);
    expect(mockSchedule).not.toHaveBeenCalled();
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

  it('resets long uptime alert when uptime drops below threshold', async () => {
    const prev = [makeMiner('7', { status: makeStatus({ uptimeSeconds: 80000 }) })];
    const long = [makeMiner('7', { status: makeStatus({ uptimeSeconds: 90000 }) })];
    await checkMinerAlerts(prev, long);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    const restart = [makeMiner('7', { isOnline: false })];
    const back = [makeMiner('7', { isOnline: true, status: makeStatus({ uptimeSeconds: 1000 }) })];
    await checkMinerAlerts(prev, restart);
    jest.clearAllMocks();
    await checkMinerAlerts(restart, back);
    expect(mockSchedule).not.toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Long Uptime' }),
      }),
    );
  });
});
