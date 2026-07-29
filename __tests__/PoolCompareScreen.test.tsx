import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { PoolCompareScreen } from '../src/screens/PoolCompareScreen';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    text: '#e2e0ff',
    textDim: '#9694b0',
    primary: '#6c63ff',
    primaryDark: '#5a52d5',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    border: '#2a2940',
    surfaceLight: '#1a1a24',
    textMuted: '#6b6990',
    accent: '#6c63ff',
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
  }),
}));

jest.mock('../src/utils/haptics', () => ({
  light: jest.fn(),
  medium: jest.fn(),
  heavy: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  selection: jest.fn(),
}));

let mockMiners: any[] = [];
const mockRefreshAll = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/store/miners', () => ({
  useMinerStore: (selector?: any) => {
    const state = { miners: mockMiners, refreshAll: mockRefreshAll };
    return selector ? selector(state) : state;
  },
}));

jest.mock('../src/utils/hashrate', () => ({
  formatHashrateValue: (v: number) => `${(v / 1e9).toFixed(2)} GH/s`,
}));

jest.mock('../src/utils/poolCompare', () => ({
  extractPoolMetrics: (miners: any[]) => {
    const map = new Map();
    for (const m of miners) {
      if (!m.status?.pool) continue;
      const key = `${m.status.pool}:${m.status.poolPort || 3333}`;
      if (!map.has(key)) {
        map.set(key, {
          pool: m.status.pool,
          poolPort: m.status.poolPort || 3333,
          minerCount: 0,
          totalHashrate: 0,
          avgTemp: 0,
          avgEfficiency: 0,
          totalSharesAccepted: 0,
          totalSharesRejected: 0,
          uptime: 0,
        });
      }
      const entry = map.get(key);
      entry.minerCount++;
      entry.totalHashrate += m.status?.hashRate || 0;
    }
    return map;
  },
  comparePools: (a: any, b: any) => [
    {
      label: 'hashrate',
      valueA: a.totalHashrate,
      valueB: b.totalHashrate,
      unit: '',
      winner: a.totalHashrate > b.totalHashrate ? 'A' : 'B',
      higherIsBetter: true,
    },
  ],
  getPoolRecommendation: (comparisons: any[]) => {
    const aWins = comparisons.filter((c) => c.winner === 'A').length;
    return aWins > comparisons.length / 2 ? 'A' : 'B';
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockMiners = [
    {
      id: 'm1',
      name: 'Miner A',
      isOnline: true,
      status: { pool: 'pool1.example.com', poolPort: 3333, hashRate: 500, temperature: 65 },
    },
    {
      id: 'm2',
      name: 'Miner B',
      isOnline: true,
      status: { pool: 'pool2.example.com', poolPort: 3333, hashRate: 400, temperature: 70 },
    },
  ];
});

it('renders the screen title', async () => {
  await render(<PoolCompareScreen navigation={{ navigate: jest.fn() } as any} />);
  expect(screen.getByText('poolCompare.title')).toBeTruthy();
});

it('shows date range selectors', async () => {
  await render(<PoolCompareScreen navigation={{ navigate: jest.fn() } as any} />);
  expect(screen.getByText('7d')).toBeTruthy();
  expect(screen.getByText('30d')).toBeTruthy();
  expect(screen.getByText('90d')).toBeTruthy();
});

it('shows pool selector buttons', async () => {
  await render(<PoolCompareScreen navigation={{ navigate: jest.fn() } as any} />);
  expect(screen.getByLabelText('poolCompare.selectPoolA')).toBeTruthy();
  expect(screen.getByLabelText('poolCompare.selectPoolB')).toBeTruthy();
});

it('shows VS label', async () => {
  await render(<PoolCompareScreen navigation={{ navigate: jest.fn() } as any} />);
  expect(screen.getByText('VS')).toBeTruthy();
});

it('shows empty state when no pools', async () => {
  mockMiners = [];
  await render(<PoolCompareScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('poolCompare.noData')).toBeTruthy();
  });
});

it('shows pool picker at bottom', async () => {
  await render(<PoolCompareScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('pool1.example.com:3333')).toBeTruthy();
  });
});

it('selects pool A on picker item press', async () => {
  await render(<PoolCompareScreen navigation={{ navigate: jest.fn() } as any} />);
  await act(async () => {
    fireEvent.press(screen.getByText('pool1.example.com:3333'));
  });
  expect(screen.getByLabelText('poolCompare.selectPoolA')).toBeTruthy();
});

it('toggles date range', async () => {
  await render(<PoolCompareScreen navigation={{ navigate: jest.fn() } as any} />);
  await act(async () => {
    fireEvent.press(screen.getByText('90d'));
  });
  expect(screen.getByText('90d')).toBeTruthy();
});
