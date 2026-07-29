import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { FleetHealthScreen } from '../src/screens/FleetHealthScreen';
import { detectAnomalies } from '../src/utils/anomalyDetection';
import { useMinerStore } from '../src/store/miners';

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
    score: miner.isOnline ? 85 : 0,
    grade: miner.isOnline ? 'B+' : 'F',
    factors: { uptime: 90, hashrate: 80, temperature: 85, efficiency: 80 },
  }),
}));

jest.mock('../src/utils/anomalyDetection', () => ({
  detectAnomalies: jest.fn().mockReturnValue([]),
}));

jest.mock('../src/services/bitcoinPrice', () => ({
  useBitcoinPrice: () => ({ price: 100000, loading: false, lastUpdated: Date.now() }),
}));

const mockStoreState: any = {
  miners: [] as any[],
  getSnapshots: jest.fn().mockResolvedValue([]),
};

jest.mock('../src/store/miners', () => {
  const useMinerStore: any = (selector?: any) => {
    return selector ? selector(mockStoreState) : mockStoreState;
  };
  useMinerStore.setState = (partial: any) => {
    const next = typeof partial === 'function' ? partial(mockStoreState) : partial;
    Object.assign(mockStoreState, next);
  };
  useMinerStore.getState = () => mockStoreState;
  return { useMinerStore };
});

beforeEach(() => {
  jest.clearAllMocks();
  useMinerStore.setState({
    miners: [
      {
        id: 'm1',
        name: 'Miner A',
        ip: '10.0.0.1',
        isOnline: true,
        status: {
          hashRate: 500,
          temperature: 65,
          power: 1200,
          sharesAccepted: 1000,
          sharesRejected: 10,
        },
      },
      {
        id: 'm2',
        name: 'Miner B',
        ip: '10.0.0.2',
        isOnline: true,
        status: {
          hashRate: 300,
          temperature: 68,
          power: 1000,
          sharesAccepted: 800,
          sharesRejected: 5,
        },
      },
    ],
    getSnapshots: jest.fn().mockResolvedValue([]),
  });
  (detectAnomalies as jest.Mock).mockReturnValue([]);
});

it('fleet trends section renders with hashrate trend indicator', async () => {
  const snapshots = [
    { hashRate: 520, temperature: 70, power: 1200, timestamp: Date.now() },
    { hashRate: 510, temperature: 70, power: 1200, timestamp: Date.now() - 1000 },
    { hashRate: 500, temperature: 70, power: 1200, timestamp: Date.now() - 2000 },
    { hashRate: 400, temperature: 60, power: 1200, timestamp: Date.now() - 3000 },
    { hashRate: 390, temperature: 60, power: 1200, timestamp: Date.now() - 4000 },
    { hashRate: 380, temperature: 60, power: 1200, timestamp: Date.now() - 5000 },
  ];
  mockStoreState.getSnapshots.mockResolvedValue(snapshots);

  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Fleet Trends')).toBeTruthy();
    expect(screen.getByText('Hashrate')).toBeTruthy();
    expect(screen.getAllByText('↑').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Rising').length).toBeGreaterThanOrEqual(1);
  });
});

it('fleet trends shows temperature trend', async () => {
  const snapshots = [
    { hashRate: 500, temperature: 75, power: 1200, timestamp: Date.now() },
    { hashRate: 500, temperature: 74, power: 1200, timestamp: Date.now() - 1000 },
    { hashRate: 500, temperature: 73, power: 1200, timestamp: Date.now() - 2000 },
    { hashRate: 500, temperature: 60, power: 1200, timestamp: Date.now() - 3000 },
    { hashRate: 500, temperature: 60, power: 1200, timestamp: Date.now() - 4000 },
    { hashRate: 500, temperature: 60, power: 1200, timestamp: Date.now() - 5000 },
  ];
  mockStoreState.getSnapshots.mockResolvedValue(snapshots);

  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Temperature')).toBeTruthy();
    expect(screen.getByText('Rising')).toBeTruthy();
  });
});

it('estimated earnings section renders with BTC and USD values', async () => {
  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Estimated Earnings')).toBeTruthy();
    expect(screen.getByText('Daily (BTC)')).toBeTruthy();
    expect(screen.getByText('Monthly (USD)')).toBeTruthy();
  });
  await waitFor(() => {
    expect(screen.getByText('0.000192 BTC')).toBeTruthy();
    expect(screen.getByText('$19.20')).toBeTruthy();
    expect(screen.getByText('0.005760 BTC')).toBeTruthy();
    expect(screen.getByText('$576.00')).toBeTruthy();
  });
});

it('recommendations section shows temp warning when avg temp > 70', async () => {
  useMinerStore.setState({
    miners: [
      {
        id: 'm1',
        name: 'Miner A',
        ip: '10.0.0.1',
        isOnline: true,
        status: {
          hashRate: 500,
          temperature: 75,
          power: 1200,
          sharesAccepted: 1000,
          sharesRejected: 10,
        },
      },
      {
        id: 'm2',
        name: 'Miner B',
        ip: '10.0.0.2',
        isOnline: true,
        status: {
          hashRate: 300,
          temperature: 73,
          power: 1000,
          sharesAccepted: 800,
          sharesRejected: 5,
        },
      },
    ],
  });

  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Recommendations')).toBeTruthy();
    expect(screen.getByText('Temperature warning — avg temp above 70°C')).toBeTruthy();
  });
});

it('recommendations section shows power optimization when total power > 3000', async () => {
  useMinerStore.setState({
    miners: [
      {
        id: 'm1',
        name: 'Miner A',
        ip: '10.0.0.1',
        isOnline: true,
        status: {
          hashRate: 500,
          temperature: 65,
          power: 1600,
          sharesAccepted: 1000,
          sharesRejected: 10,
        },
      },
      {
        id: 'm2',
        name: 'Miner B',
        ip: '10.0.0.2',
        isOnline: true,
        status: {
          hashRate: 300,
          temperature: 68,
          power: 1500,
          sharesAccepted: 800,
          sharesRejected: 5,
        },
      },
    ],
  });

  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Recommendations')).toBeTruthy();
    expect(screen.getByText('Power optimization — consider scheduling downtime')).toBeTruthy();
  });
});

it('health timeline renders miner bars', async () => {
  const snapshots = [
    { hashRate: 500, temperature: 65, power: 1200, timestamp: Date.now() },
    { hashRate: 480, temperature: 64, power: 1200, timestamp: Date.now() - 1000 },
    { hashRate: 490, temperature: 65, power: 1200, timestamp: Date.now() - 2000 },
  ];
  mockStoreState.getSnapshots.mockResolvedValue(snapshots);

  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Health Timeline')).toBeTruthy();
    expect(screen.getAllByText('Miner A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Miner B').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('B+').length).toBeGreaterThanOrEqual(1);
  });
});

it('empty state still works with new sections', async () => {
  useMinerStore.setState({ miners: [] });

  await render(<FleetHealthScreen />);
  await waitFor(() => {
    expect(screen.getByText('Add miners to see fleet health overview.')).toBeTruthy();
  });
  expect(screen.queryByText('Fleet Trends')).toBeNull();
  expect(screen.queryByText('Estimated Earnings')).toBeNull();
  expect(screen.queryByText('Health Timeline')).toBeNull();
  expect(screen.queryByText('Recommendations')).toBeNull();
});
