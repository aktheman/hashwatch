jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-token' }),
}));

jest.mock('expo-network', () => ({
  getIpAddressAsync: jest.fn(),
}));

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

jest.mock('../src/db/database', () => ({
  loadMiners: jest.fn().mockResolvedValue([]),
  saveMiner: jest.fn().mockResolvedValue(undefined),
  deleteMiner: jest.fn().mockResolvedValue(undefined),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
  saveSnapshot: jest.fn().mockResolvedValue(undefined),
  getSnapshots: jest.fn().mockResolvedValue([]),
  loadWallets: jest.fn().mockResolvedValue([]),
  saveWallet: jest.fn().mockResolvedValue(undefined),
  deleteWallet: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/api/client', () => ({
  BASE_URL: 'http://localhost:4000',
  configureClient: jest.fn(),
  pushStats: jest.fn(),
  fetchMiners: jest.fn().mockResolvedValue([]),
  createMiner: jest.fn(),
  deleteMinerAPI: jest.fn(),
}));

jest.mock('../src/services/minerSync', () => ({
  syncMinersWithBackend: jest.fn().mockResolvedValue([]),
  createRemoteMiner: jest.fn(),
  deleteRemoteMiner: jest.fn(),
}));

jest.mock('../src/store/auth', () => ({
  useAuthStore: {
    getState: () => ({ token: null, restoreSession: jest.fn().mockResolvedValue(undefined) }),
  },
}));

jest.mock('../src/api/bitaxe', () => ({
  BitAxeClient: { probe: jest.fn() },
}));

jest.mock('../src/services/revenuecat', () => ({
  configureRevenueCat: jest.fn().mockResolvedValue(undefined),
  checkProStatus: jest.fn().mockResolvedValue(false),
  purchasePro: jest.fn(),
  restorePurchases: jest.fn(),
  getOfferings: jest.fn(),
  listenForProChanges: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('../src/services/notifications', () => ({
  checkMinerAlerts: jest.fn(),
}));

jest.mock('../src/services/pushRegistration', () => ({
  registerPushToken: jest.fn(),
}));

jest.mock('../src/services/websocket', () => ({
  connectWebSocket: jest.fn(),
  disconnectWebSocket: jest.fn(),
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { DashboardScreen } from '../src/screens/DashboardScreen';
import { setTheme, darkTheme } from '../src/theme';
import { useMinerStore } from '../src/store/miners';
import { useSubscriptionStore } from '../src/store/subscription';

const navigation = { navigate: jest.fn() };

beforeEach(() => {
  setTheme(darkTheme);
  useSubscriptionStore.setState({
    tier: 'free',
    isPro: false,
    maxMiners: 3,
    initialized: true,
    loading: false,
  });
  useMinerStore.setState({
    miners: [],
    initialized: true,
    loading: false,
    scanning: false,
    scanProgress: null,
    error: null,
    loadMiners: jest.fn().mockResolvedValue(undefined),
    syncWithBackend: jest.fn().mockResolvedValue(undefined),
    startPolling: jest.fn().mockReturnValue(jest.fn()),
    refreshAll: jest.fn().mockResolvedValue(undefined),
    scanNetwork: jest.fn(),
  });
  jest.clearAllMocks();
});

it('renders HashWatch title', async () => {
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('HashWatch')).toBeTruthy();
}, 10000);

it('shows empty state when no miners', async () => {
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('No Miners Yet')).toBeTruthy();
  expect(screen.getByText('Add Miner')).toBeTruthy();
  expect(screen.getByText('Scan Network')).toBeTruthy();
});

it('shows loading state', async () => {
  useMinerStore.setState({ loading: true, initialized: false });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('Loading miners...')).toBeTruthy();
});

it('navigates to AddMiner from empty state', async () => {
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('Add Miner'));
  expect(navigation.navigate).toHaveBeenCalledWith('AddMiner');
});

it('navigates to Settings', async () => {
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('⚙'));
  expect(navigation.navigate).toHaveBeenCalledWith('Settings');
});

it('shows summary stats with miners', async () => {
  useMinerStore.setState({
    miners: [
      {
        id: 'm1',
        name: 'TestMiner',
        ip: '192.168.1.100',
        port: 80,
        isOnline: true,
        status: { hashRate: 500, hashRateUnit: 'GH/s', power: 12, temperature: 45 },
      },
    ] as any[],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('Miners')).toBeTruthy();
  expect(screen.getByText('Online')).toBeTruthy();
  expect(screen.getAllByText('Hashrate').length).toBeGreaterThan(0);
  expect(screen.getByText('Power (W)')).toBeTruthy();
  expect(screen.getByText('Avg Temp')).toBeTruthy();
  expect(screen.getByText('Efficiency')).toBeTruthy();
}, 15000);

it('shows miner card when miners exist', async () => {
  useMinerStore.setState({
    miners: [
      {
        id: 'm1',
        name: 'TestMiner',
        ip: '192.168.1.100',
        port: 80,
        isOnline: true,
        status: { hashRate: 500, hashRateUnit: 'GH/s', power: 12, temperature: 45 },
      },
    ] as any[],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('TestMiner')).toBeTruthy();
});

it('navigates to MinerDetail on miner press', async () => {
  useMinerStore.setState({
    miners: [
      {
        id: 'm1',
        name: 'TestMiner',
        ip: '192.168.1.100',
        port: 80,
        isOnline: true,
        status: { hashRate: 500, hashRateUnit: 'GH/s', power: 12, temperature: 45 },
      },
    ] as any[],
  });
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('TestMiner'));
  expect(navigation.navigate).toHaveBeenCalledWith('MinerDetail', { minerId: 'm1' });
});

it('shows upgrade banner when at miner limit', async () => {
  useMinerStore.setState({
    miners: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }] as any[],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText(/Upgrade to Pro/)).toBeTruthy();
});

it('navigates to Subscription from upgrade banner', async () => {
  useMinerStore.setState({
    miners: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }] as any[],
  });
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByText(/Upgrade to Pro/));
  expect(navigation.navigate).toHaveBeenCalledWith('Subscription');
});

it('navigates to Subscription when adding beyond limit', async () => {
  useMinerStore.setState({
    miners: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }] as any[],
  });
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('+'));
  expect(navigation.navigate).toHaveBeenCalledWith('Subscription');
});
