import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { FleetHealthScreen } from '../src/screens/FleetHealthScreen';
import { detectAnomalies } from '../src/utils/anomalyDetection';

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
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() }),
  NavigationProp: jest.fn(),
}));

jest.mock('../src/utils/healthScore', () => ({
  calculateHealthScore: (miner: any) => ({
    score: miner.isOnline ? 85 : 30,
    temperature: 80,
    hashrate: 85,
    uptime: 80,
    shares: 90,
    stability: 85,
    grade: miner.isOnline ? 'B+' : 'F',
  }),
}));

jest.mock('../src/utils/anomalyDetection', () => ({
  detectAnomalies: jest.fn().mockReturnValue([]),
}));

jest.mock('../src/services/bitcoinPrice', () => ({
  useBitcoinPrice: () => ({ price: 100000, loading: false, lastUpdated: Date.now() }),
}));

let mockMiners: any[] = [];
const mockGetSnapshots = jest.fn().mockResolvedValue([]);

jest.mock('../src/store/miners', () => ({
  useMinerStore: (selector?: any) => {
    const state = { miners: mockMiners, getSnapshots: mockGetSnapshots };
    return selector ? selector(state) : state;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockMiners = [
    {
      id: 'm1',
      name: 'Miner A',
      ip: '10.0.0.1',
      isOnline: true,
      status: { hashRate: 500, temperature: 65 },
    },
    { id: 'm2', name: 'Miner B', ip: '10.0.0.2', isOnline: false, status: null },
  ];
});

it('renders the screen title', async () => {
  await render(<FleetHealthScreen />);
  expect(screen.getByText('Fleet Health')).toBeTruthy();
});

it('shows fleet grade score', async () => {
  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getAllByText('B+').length).toBeGreaterThanOrEqual(1);
  });
});

it('shows online/offline stats', async () => {
  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.getByText('Offline')).toBeTruthy();
  });
});

it('shows grade distribution section', async () => {
  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Grade Distribution')).toBeTruthy();
  });
});

it('shows miner list section', async () => {
  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Miners by Health')).toBeTruthy();
  });
});

it('shows miner cards', async () => {
  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getAllByText('Miner A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Miner B')).toBeTruthy();
  });
});

it('shows empty state when no miners', async () => {
  mockMiners = [];
  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Add miners to see fleet health overview.')).toBeTruthy();
  });
});

it('shows total miners count', async () => {
  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Miners')).toBeTruthy();
  });
});

it('shows fleet trends section', async () => {
  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Fleet Trends')).toBeTruthy();
    expect(screen.getByText('Hashrate')).toBeTruthy();
    expect(screen.getByText('Temperature')).toBeTruthy();
  });
});

it('shows estimated earnings section', async () => {
  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Estimated Earnings')).toBeTruthy();
    expect(screen.getByText('Daily (BTC)')).toBeTruthy();
    expect(screen.getByText('Monthly (USD)')).toBeTruthy();
  });
});

it('shows health timeline for online miners', async () => {
  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Health Timeline')).toBeTruthy();
  });
});

it('shows recommendations when critical alerts exist', async () => {
  (detectAnomalies as jest.Mock).mockReturnValue([
    { severity: 'critical', type: 'hashrate_drop', message: 'test' },
  ]);
  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Recommendations')).toBeTruthy();
  });
});
