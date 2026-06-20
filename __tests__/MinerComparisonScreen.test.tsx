jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  setLogLevel: jest.fn(),
  getOfferings: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
  addCustomerInfoUpdateListener: jest.fn(),
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-network', () => ({
  getIpAddressAsync: jest.fn(),
}));

import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { MinerComparisonScreen } from '../src/screens/MinerComparisonScreen';
import { setTheme, darkTheme } from '../src/theme';
import { useMinerStore } from '../src/store/miners';

const makeMiner = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'm1',
    name: 'Miner1',
    ip: '192.168.1.100',
    port: 80,
    isOnline: true,
    status: {
      hashRate: 500,
      hashRateUnit: 'GH/s',
      temperature: 45,
      power: 12,
      uptimeSeconds: 3600,
      sharesAccepted: 100,
      sharesRejected: 2,
      frequency: 400,
      coreVoltage: 1.2,
      bestDiff: '1.2M',
      pool: 'ckpool.org',
      poolPort: 3333,
      fanSpeed: 60,
      fanRpm: 3000,
      vrTemp: 40,
      voltage: 12,
      current: 1,
      bestSessionDiff: '1.0M',
      poolUser: 'user1',
      poolResponseTime: 100,
    },
    ...overrides,
  }) as any;

const route = (minerIds: string[]) => ({ params: { minerIds } }) as any;
const navigation = {} as any;

beforeEach(() => {
  setTheme(darkTheme);
  useMinerStore.setState({
    miners: [],
    initialized: true,
    loading: false,
  });
});

it('shows empty state when fewer than 2 miners', async () => {
  useMinerStore.setState({ miners: [makeMiner()] });
  await render(<MinerComparisonScreen route={route(['m1'])} navigation={navigation} />);
  expect(screen.getByText('comparison.selectAtLeastTwo')).toBeTruthy();
});

it('shows empty state when no minerIds match', async () => {
  await render(<MinerComparisonScreen route={route(['nonexistent'])} navigation={navigation} />);
  expect(screen.getByText('comparison.selectAtLeastTwo')).toBeTruthy();
});

it('renders comparison table with 2 miners', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner A' }),
      makeMiner({ id: 'm2', name: 'Miner B', ip: '192.168.1.101' }),
    ],
  });
  await render(<MinerComparisonScreen route={route(['m1', 'm2'])} navigation={navigation} />);
  expect(screen.getByText('comparison.title')).toBeTruthy();
  expect(screen.getByText('Miner A')).toBeTruthy();
  expect(screen.getByText('Miner B')).toBeTruthy();
  expect(screen.getByText('192.168.1.100')).toBeTruthy();
  expect(screen.getByText('192.168.1.101')).toBeTruthy();
});

it('shows stat headers', async () => {
  useMinerStore.setState({
    miners: [makeMiner({ id: 'm1' }), makeMiner({ id: 'm2', ip: '192.168.1.101' })],
  });
  await render(<MinerComparisonScreen route={route(['m1', 'm2'])} navigation={navigation} />);
  expect(screen.getAllByText('common.online').length).toBe(2);
});

it('shows miner stat values', async () => {
  useMinerStore.setState({
    miners: [makeMiner({ id: 'm1' }), makeMiner({ id: 'm2', ip: '192.168.1.101' })],
  });
  await render(<MinerComparisonScreen route={route(['m1', 'm2'])} navigation={navigation} />);
  expect(screen.getAllByText('500.0 GH/s').length).toBe(2);
  expect(screen.getAllByText('45°C').length).toBe(2);
  expect(screen.getAllByText('12.00W').length).toBe(2);
});

it('shows offline status for offline miners', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', isOnline: false }),
      makeMiner({ id: 'm2', ip: '192.168.1.101', isOnline: true }),
    ],
  });
  await render(<MinerComparisonScreen route={route(['m1', 'm2'])} navigation={navigation} />);
  expect(screen.getByText('common.offline')).toBeTruthy();
});

it('handles miners with missing status', async () => {
  useMinerStore.setState({
    miners: [makeMiner({ id: 'm1', status: null }), makeMiner({ id: 'm2', ip: '192.168.1.101' })],
  });
  await render(<MinerComparisonScreen route={route(['m1', 'm2'])} navigation={navigation} />);
  expect(screen.getByText('comparison.miner')).toBeTruthy();
});
