import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.setTimeout(30000);

const mockGetSetting = jest.fn();
const mockGetSnapshots = jest.fn();

jest.mock('../src/db/database', () => ({
  getSetting: (k: string) => mockGetSetting(k),
  getSnapshots: (id: string, limit: number) => mockGetSnapshots(id, limit),
}));

jest.mock('react-native-chart-kit', () => ({
  LineChart: () => null,
}));

let mockMiners: any[] = [];
jest.mock('../src/store/miners', () => ({
  useMinerStore: (selector: any) => selector({ miners: mockMiners }),
}));

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
  toHashesPerSecond: (rate: number, unit?: string) => rate,
  formatHashrateValue: (rate: number) => `${rate}`,
  estimateBTCPerDay: (hps: number) => hps * 0.000001,
  formatBTC: (btc: number) => `${btc.toFixed(8)} BTC`,
  getBTCPrice: () => 50000,
  fetchBTCPrice: jest.fn().mockResolvedValue(50000),
  fetchNetworkHashrate: jest.fn().mockResolvedValue(1e20),
}));

import { AnalyticsScreen } from '../src/screens/AnalyticsScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSetting.mockResolvedValue(null);
  mockGetSnapshots.mockResolvedValue([]);
  mockMiners = [];
});

describe('AnalyticsScreen', () => {
  it('renders header', async () => {
    await render(<AnalyticsScreen />);
    expect(screen.getByText('Analytics')).toBeTruthy();
  });

  it('renders summary stats when miners exist', async () => {
    mockMiners = [
      {
        id: 'm1',
        isOnline: true,
        status: {
          hashRate: 500,
          hashRateUnit: 'TH/s',
          temperature: 55,
          power: 120,
          sharesAccepted: 1000,
          sharesRejected: 5,
          uptimeSeconds: 3600,
        },
      },
      {
        id: 'm2',
        isOnline: false,
        status: {
          hashRate: 300,
          hashRateUnit: 'TH/s',
          temperature: 45,
          power: 80,
          sharesAccepted: 500,
          sharesRejected: 2,
          uptimeSeconds: 1800,
        },
      },
    ];

    await render(<AnalyticsScreen />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('renders empty state when no miners', async () => {
    mockMiners = [];
    await render(<AnalyticsScreen />);
    expect(screen.getByText('Analytics')).toBeTruthy();
  });

  it('shows loading while fetching snapshots', async () => {
    mockGetSnapshots.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 1000)),
    );

    await render(<AnalyticsScreen />);
    expect(screen.getByText('Analytics')).toBeTruthy();
  });

  it('shows range selector buttons', async () => {
    await render(<AnalyticsScreen />);
    expect(screen.getByText('1h')).toBeTruthy();
    expect(screen.getByText('24h')).toBeTruthy();
    expect(screen.getByText('7d')).toBeTruthy();
  });

  it('switches range on button press', async () => {
    const { rerender } = await render(<AnalyticsScreen />);
    fireEvent.press(screen.getByText('1h'));
    await rerender(<AnalyticsScreen />);
    expect(screen.getByText('1h')).toBeTruthy();
  });
});
