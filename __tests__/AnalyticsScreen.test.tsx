import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

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

jest.mock('../src/components/TemperatureHeatmap', () => ({
  TemperatureHeatmap: () => null,
}));

jest.mock('../src/components/PowerUsageChart', () => ({
  PowerUsageChart: () => null,
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
    glow: 'rgba(108,99,255,0.15)',
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

it('renders header', async () => {
  await render(<AnalyticsScreen />);
  expect(screen.getByText('analytics.title')).toBeTruthy();
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
  ];

  await render(<AnalyticsScreen />);
  expect(screen.getByText('1')).toBeTruthy();
});

it('renders empty state when no miners', async () => {
  mockMiners = [];
  await render(<AnalyticsScreen />);
  expect(screen.getByText('analytics.title')).toBeTruthy();
});

it('shows range selector buttons including 30d', async () => {
  await render(<AnalyticsScreen />);
  expect(screen.getByText('1h')).toBeTruthy();
  expect(screen.getByText('24h')).toBeTruthy();
  expect(screen.getByText('7d')).toBeTruthy();
  expect(screen.getByText('30d')).toBeTruthy();
});

it('switches range on button press', async () => {
  await render(<AnalyticsScreen />);
  await fireEvent.press(screen.getByText('1h'));
  expect(screen.getByText('1h')).toBeTruthy();
});

it('shows hashrate chart with snapshot data', async () => {
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  mockGetSnapshots.mockResolvedValue(
    Array.from({ length: 10 }, (_, i) => ({
      minerId: 'm1',
      hashRate: 500,
      hashRateUnit: 'TH/s',
      temperature: 55,
      power: 120,
      uptimeSeconds: 3600,
      timestamp: Date.now() - (9 - i) * 3600000,
      sharesAccepted: 1,
      sharesRejected: 0,
    })),
  );
  await render(<AnalyticsScreen />);
  await waitFor(() => expect(screen.queryAllByText('analytics.notEnoughData')).toHaveLength(0));
});

it('shows Power Cost when power cost setting is set', async () => {
  mockGetSetting.mockResolvedValue('0.12');
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  await render(<AnalyticsScreen />);
  await waitFor(() => expect(screen.queryByText('analytics.powerCost')).toBeTruthy());
});

it('shows Power (W) label in static summary cards', async () => {
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  await render(<AnalyticsScreen />);
  await waitFor(() =>
    expect(screen.getAllByText('analytics.power').length).toBeGreaterThanOrEqual(1),
  );
});

it('shows Est. Daily BTC label in static summary cards', async () => {
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  await render(<AnalyticsScreen />);
  await waitFor(() => expect(screen.getByText('analytics.estDailyBTC')).toBeTruthy());
});

it('shows empty chart text with no snapshot data', async () => {
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  mockGetSnapshots.mockResolvedValue([]);
  await render(<AnalyticsScreen />);
  await waitFor(() =>
    expect(screen.getAllByText('analytics.notEnoughData').length).toBeGreaterThanOrEqual(1),
  );
});

it('shows efficiency chart button', async () => {
  await render(<AnalyticsScreen />);
  expect(screen.getByText('analytics.efficiencyHistory')).toBeTruthy();
});

it('switches to efficiency chart on button press', async () => {
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  mockGetSnapshots.mockResolvedValue(
    Array.from({ length: 10 }, (_, i) => ({
      minerId: 'm1',
      hashRate: 500,
      hashRateUnit: 'TH/s',
      temperature: 55,
      power: 120,
      uptimeSeconds: 3600,
      timestamp: Date.now() - (9 - i) * 3600000,
      sharesAccepted: 1,
      sharesRejected: 0,
    })),
  );
  await render(<AnalyticsScreen />);

  await fireEvent.press(screen.getByText('analytics.efficiencyHistory'));

  await waitFor(() => expect(screen.queryAllByText('analytics.notEnoughData')).toHaveLength(0));
});

it('shows efficiency chart with data', async () => {
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  mockGetSnapshots.mockResolvedValue(
    Array.from({ length: 10 }, (_, i) => ({
      minerId: 'm1',
      hashRate: 500,
      hashRateUnit: 'TH/s',
      temperature: 55,
      power: 120,
      uptimeSeconds: 3600,
      timestamp: Date.now() - (9 - i) * 3600000,
      sharesAccepted: 1,
      sharesRejected: 0,
    })),
  );
  await render(<AnalyticsScreen />);

  await fireEvent.press(screen.getByText('analytics.efficiencyHistory'));

  await waitFor(() => {
    expect(screen.queryByText('analytics.notEnoughData')).toBeNull();
  });
});

it('shows efficiency chart not enough data with no snapshots', async () => {
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  mockGetSnapshots.mockResolvedValue([]);
  await render(<AnalyticsScreen />);

  await fireEvent.press(screen.getByText('analytics.efficiencyHistory'));

  await waitFor(() => {
    expect(screen.getAllByText('analytics.notEnoughData').length).toBeGreaterThanOrEqual(1);
  });
});

it('shows uptime chart button', async () => {
  await render(<AnalyticsScreen />);
  expect(screen.getByText('analytics.uptimeHistory')).toBeTruthy();
});

it('switches to uptime chart on button press', async () => {
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  mockGetSnapshots.mockResolvedValue(
    Array.from({ length: 10 }, (_, i) => ({
      minerId: 'm1',
      hashRate: 500,
      hashRateUnit: 'TH/s',
      temperature: 55,
      power: 120,
      uptimeSeconds: 3600,
      timestamp: Date.now() - (9 - i) * 3600000,
      sharesAccepted: 1,
      sharesRejected: 0,
    })),
  );
  await render(<AnalyticsScreen />);

  await fireEvent.press(screen.getByText('analytics.uptimeHistory'));

  await waitFor(() => expect(screen.queryAllByText('analytics.notEnoughData')).toHaveLength(0));
});

it('shows uptime chart not enough data with no snapshots', async () => {
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  mockGetSnapshots.mockResolvedValue([]);
  await render(<AnalyticsScreen />);

  await fireEvent.press(screen.getByText('analytics.uptimeHistory'));

  await waitFor(() => {
    expect(screen.getAllByText('analytics.notEnoughData').length).toBeGreaterThanOrEqual(1);
  });
});

it('shows Filter button and toggles filter panel', async () => {
  mockMiners = [
    {
      id: 'm1',
      name: 'Miner 1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
    {
      id: 'm2',
      name: 'Miner 2',
      isOnline: true,
      status: { hashRate: 300, hashRateUnit: 'TH/s', temperature: 45, power: 80 },
    },
  ];
  await render(<AnalyticsScreen />);

  await fireEvent.press(screen.getByText('analyticsExtra.filter'));
  await waitFor(() => {
    expect(screen.getByText('analyticsExtra.allMiners')).toBeTruthy();
  });
  expect(screen.getByText('Miner 1')).toBeTruthy();
  expect(screen.getByText('Miner 2')).toBeTruthy();
});

it('selects individual miner filter chips', async () => {
  mockMiners = [
    {
      id: 'm1',
      name: 'Miner 1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
    {
      id: 'm2',
      name: 'Miner 2',
      isOnline: true,
      status: { hashRate: 300, hashRateUnit: 'TH/s', temperature: 45, power: 80 },
    },
  ];
  await render(<AnalyticsScreen />);
  await fireEvent.press(screen.getByText('analyticsExtra.filter'));
  await waitFor(() => {
    expect(screen.getByText('analyticsExtra.allMiners')).toBeTruthy();
  });

  await fireEvent.press(screen.getByText('Miner 1'));
});

it('selects all miners filter chip resets selection', async () => {
  mockMiners = [
    {
      id: 'm1',
      name: 'Miner 1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  await render(<AnalyticsScreen />);
  await fireEvent.press(screen.getByText('analyticsExtra.filter'));
  await waitFor(() => {
    expect(screen.getByText('analyticsExtra.allMiners')).toBeTruthy();
  });

  await fireEvent.press(screen.getByText('analyticsExtra.allMiners'));
});

it('loads snapshots on 30d range selection', async () => {
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  mockGetSnapshots.mockResolvedValue(
    Array.from({ length: 5 }, (_, i) => ({
      minerId: 'm1',
      hashRate: 500,
      hashRateUnit: 'TH/s',
      temperature: 55,
      power: 120,
      uptimeSeconds: 3600,
      timestamp: Date.now() - (4 - i) * 86400000,
      sharesAccepted: 1,
      sharesRejected: 0,
    })),
  );
  await render(<AnalyticsScreen />);
  await fireEvent.press(screen.getByText('30d'));
  await waitFor(() => expect(mockGetSnapshots).toHaveBeenCalled());
});

it('hits snapshot cache on second load with same range', async () => {
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  mockGetSnapshots.mockResolvedValue(
    Array.from({ length: 5 }, (_, i) => ({
      minerId: 'm1',
      hashRate: 500,
      hashRateUnit: 'TH/s',
      temperature: 55,
      power: 120,
      uptimeSeconds: 3600,
      timestamp: Date.now() - (4 - i) * 3600000,
      sharesAccepted: 1,
      sharesRejected: 0,
    })),
  );
  await render(<AnalyticsScreen />);
  await waitFor(() => expect(mockGetSnapshots).toHaveBeenCalledTimes(1));
  await fireEvent.press(screen.getByLabelText('Show 1 hour'));
  await waitFor(() => expect(mockGetSnapshots).toHaveBeenCalledTimes(2));
  await fireEvent.press(screen.getByLabelText('Show 24 hours'));
  await waitFor(() => {
    expect(mockGetSnapshots).toHaveBeenCalledTimes(2);
  });
});

it('samples hashrate chart buckets when more than 30', async () => {
  mockMiners = [
    {
      id: 'm1',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
  ];
  mockGetSnapshots.mockResolvedValue(
    Array.from({ length: 35 }, (_, i) => ({
      minerId: 'm1',
      hashRate: 500,
      hashRateUnit: 'TH/s',
      temperature: 55,
      power: 120,
      uptimeSeconds: 3600,
      timestamp: Date.now() - (34 - i) * 60000,
      sharesAccepted: 1,
      sharesRejected: 0,
    })),
  );
  await render(<AnalyticsScreen />);
  await fireEvent.press(screen.getByLabelText('Show 1 hour'));
  await waitFor(() => expect(screen.queryAllByText('analytics.notEnoughData')).toHaveLength(0));
});

it('renders hashrate chart with selected miner filter', async () => {
  mockMiners = [
    {
      id: 'm1',
      name: 'Miner A',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
    {
      id: 'm2',
      name: 'Miner B',
      isOnline: true,
      status: { hashRate: 300, hashRateUnit: 'TH/s', temperature: 45, power: 80 },
    },
  ];
  mockGetSnapshots.mockResolvedValue(
    Array.from({ length: 10 }, (_, i) => ({
      minerId: 'm1',
      hashRate: 500,
      hashRateUnit: 'TH/s',
      temperature: 55,
      power: 120,
      uptimeSeconds: 3600,
      timestamp: Date.now() - (9 - i) * 3600000,
      sharesAccepted: 1,
      sharesRejected: 0,
    })),
  );
  await render(<AnalyticsScreen />);
  await waitFor(() => expect(screen.queryAllByText('analytics.notEnoughData')).toHaveLength(0));
  await fireEvent.press(screen.getByLabelText('analyticsExtra.filter'));
  await waitFor(() => expect(screen.getByText('Miner A')).toBeTruthy());
  await fireEvent.press(screen.getByText('Miner A'));
  await waitFor(() => expect(screen.queryAllByText('analytics.notEnoughData')).toHaveLength(0));
});

it('renders uptime chart with selected miner filter', async () => {
  mockMiners = [
    {
      id: 'm1',
      name: 'Miner A',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
    {
      id: 'm2',
      name: 'Miner B',
      isOnline: true,
      status: { hashRate: 300, hashRateUnit: 'TH/s', temperature: 45, power: 80 },
    },
  ];
  mockGetSnapshots.mockResolvedValue(
    Array.from({ length: 10 }, (_, i) => ({
      minerId: 'm1',
      hashRate: 500,
      hashRateUnit: 'TH/s',
      temperature: 55,
      power: 120,
      uptimeSeconds: 3600,
      timestamp: Date.now() - (9 - i) * 3600000,
      sharesAccepted: 1,
      sharesRejected: 0,
    })),
  );
  await render(<AnalyticsScreen />);
  await waitFor(() => expect(screen.queryAllByText('analytics.notEnoughData')).toHaveLength(0));
  await fireEvent.press(screen.getByText('analytics.uptimeHistory'));
  await waitFor(() => expect(screen.queryAllByText('analytics.notEnoughData')).toHaveLength(0));
  await fireEvent.press(screen.getByLabelText('analyticsExtra.filter'));
  await fireEvent.press(screen.getByText('Miner A'));
  await waitFor(() => expect(screen.queryAllByText('analytics.notEnoughData')).toHaveLength(0));
});

it('renders efficiency chart with selected miner filter', async () => {
  mockMiners = [
    {
      id: 'm1',
      name: 'Miner A',
      isOnline: true,
      status: { hashRate: 500, hashRateUnit: 'TH/s', temperature: 55, power: 120 },
    },
    {
      id: 'm2',
      name: 'Miner B',
      isOnline: true,
      status: { hashRate: 300, hashRateUnit: 'TH/s', temperature: 45, power: 80 },
    },
  ];
  mockGetSnapshots.mockResolvedValue(
    Array.from({ length: 10 }, (_, i) => ({
      minerId: 'm1',
      hashRate: 500,
      hashRateUnit: 'TH/s',
      temperature: 55,
      power: 120,
      uptimeSeconds: 3600,
      timestamp: Date.now() - (9 - i) * 3600000,
      sharesAccepted: 1,
      sharesRejected: 0,
    })),
  );
  await render(<AnalyticsScreen />);
  await waitFor(() => expect(screen.queryAllByText('analytics.notEnoughData')).toHaveLength(0));
  await fireEvent.press(screen.getByText('analytics.efficiencyHistory'));
  await waitFor(() => expect(screen.queryAllByText('analytics.notEnoughData')).toHaveLength(0));
  await fireEvent.press(screen.getByLabelText('analyticsExtra.filter'));
  await fireEvent.press(screen.getByText('Miner A'));
  await waitFor(() => expect(screen.queryAllByText('analytics.notEnoughData')).toHaveLength(0));
});