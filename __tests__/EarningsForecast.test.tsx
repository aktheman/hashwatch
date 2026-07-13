import { render } from '@testing-library/react-native';
import { EarningsForecast } from '../src/components/EarningsForecast';

jest.setTimeout(30000);

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a1a',
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#3B82F6',
    info: '#06B6D4',
  }),
}));

jest.mock('../src/utils/hashrate', () => ({
  toHashesPerSecond: (rate: number, unit?: string) => {
    if (unit === 'KH/s') return rate * 1e3;
    if (unit === 'MH/s') return rate * 1e6;
    if (unit === 'GH/s') return rate * 1e9;
    if (unit === 'TH/s') return rate * 1e12;
    return rate;
  },
  formatHashrateValue: (rate: number) => `${(rate / 1e9).toFixed(1)} GH/s`,
  estimateBTCPerDay: (hps: number) => hps * 1e-9 * 0.00001,
  formatBTC: (btc: number) => `${btc.toFixed(8)} BTC`,
  getBTCPrice: () => 100000,
}));

interface MinerStatusOverride {
  hashRate?: number;
  hashRateUnit?: string;
  temperature?: number;
  voltage?: number;
  current?: number;
  power?: number;
  sharesAccepted?: number;
  sharesRejected?: number;
  uptimeSeconds?: number;
  frequency?: number;
  pool?: string;
  bestDiff?: string;
}

interface MinerOverride {
  id?: string;
  name?: string;
  isOnline?: boolean;
  status?: MinerStatusOverride;
}

const makeMiner = (overrides: MinerOverride = {}) => ({
  id: '1',
  name: 'Test Miner',
  ip: '192.168.1.10',
  port: 80,
  addedAt: Date.now(),
  lastSeen: Date.now(),
  isOnline: true,
  status: {
    hashRate: 500,
    hashRateUnit: 'GH/s',
    temperature: 65,
    voltage: 12,
    current: 5,
    power: 60,
    sharesAccepted: 100,
    sharesRejected: 2,
    uptimeSeconds: 86400,
    frequency: 500,
    pool: 'solo',
    bestDiff: '1.5',
  },
  ...overrides,
});

it('renders title and summary', async () => {
  const miners = [makeMiner()];
  const r = await render(<EarningsForecast miners={miners} />);
  expect(r.getByText('analytics.earningsForecast')).toBeTruthy();
  expect(r.getByText('analytics.hashrate')).toBeTruthy();
  expect(r.getByText('analytics.miners')).toBeTruthy();
  expect(r.getByText('analytics.power')).toBeTruthy();
});

it('shows online/total miner count', async () => {
  const miners = [makeMiner({ id: '1', isOnline: true }), makeMiner({ id: '2', isOnline: false })];
  const r = await render(<EarningsForecast miners={miners} />);
  expect(r.getByText('1/2')).toBeTruthy();
});

it('renders projection rows', async () => {
  const miners = [makeMiner()];
  const r = await render(<EarningsForecast miners={miners} />);
  expect(r.getByText('forecast.oneDay')).toBeTruthy();
  expect(r.getByText('forecast.sevenDays')).toBeTruthy();
  expect(r.getByText('forecast.thirtyDays')).toBeTruthy();
  expect(r.getByText('forecast.ninetyDays')).toBeTruthy();
  expect(r.getByText('forecast.oneYear')).toBeTruthy();
});

it('shows net daily when powerCost provided', async () => {
  const miners = [makeMiner()];
  const r = await render(<EarningsForecast miners={miners} powerCost={0.1} />);
  expect(r.getByText('analytics.netDaily')).toBeTruthy();
});

it('does not show net daily when powerCost is 0', async () => {
  const miners = [makeMiner()];
  const r = await render(<EarningsForecast miners={miners} powerCost={0} />);
  expect(r.queryByText('analytics.netDaily')).toBeNull();
});

it('renders with empty miners array', async () => {
  const r = await render(<EarningsForecast miners={[]} />);
  expect(r.getByText('analytics.earningsForecast')).toBeTruthy();
  expect(r.getByText('0/0')).toBeTruthy();
});

it('shows BTC price footer', async () => {
  const miners = [makeMiner()];
  const r = await render(<EarningsForecast miners={miners} />);
  expect(r.getByText(/BTC \$\d/)).toBeTruthy();
});

it('formats total power from all miners', async () => {
  const miners = [
    makeMiner({
      id: '1',
      status: {
        hashRate: 500,
        hashRateUnit: 'GH/s',
        temperature: 65,
        voltage: 12,
        current: 5,
        power: 60,
        sharesAccepted: 100,
        sharesRejected: 2,
        uptimeSeconds: 86400,
        frequency: 500,
        pool: 'solo',
        bestDiff: '1.5',
      },
    }),
    makeMiner({
      id: '2',
      status: {
        hashRate: 500,
        hashRateUnit: 'GH/s',
        temperature: 65,
        voltage: 12,
        current: 5,
        power: 80,
        sharesAccepted: 100,
        sharesRejected: 2,
        uptimeSeconds: 86400,
        frequency: 500,
        pool: 'solo',
        bestDiff: '1.5',
      },
    }),
  ];
  const r = await render(<EarningsForecast miners={miners} />);
  expect(r.getByText('140W')).toBeTruthy();
});
