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

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import React from 'react';
import { DashboardScreen } from '../src/screens/DashboardScreen';
import { setTheme, darkTheme } from '../src/theme';
import { useMinerStore } from '../src/store/miners';
import { useSubscriptionStore } from '../src/store/subscription';

const navigation = { navigate: jest.fn() };

const makeMiner = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'm1',
    name: 'TestMiner',
    ip: '192.168.1.100',
    port: 80,
    isOnline: true,
    status: { hashRate: 500, hashRateUnit: 'GH/s', power: 12, temperature: 45 },
    ...overrides,
  }) as any;

beforeEach(() => {
  cleanup();
  setTheme(darkTheme);
  useSubscriptionStore.setState({
    tier: 'free',
    isPro: false,
    maxMiners: 999,
    initialized: true,
    loading: false,
    initialize: jest.fn(),
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
    removeMiner: jest.fn().mockResolvedValue(undefined),
    clearError: jest.fn(),
  });
  jest.clearAllMocks();
  const { loadWallets } = require('../src/db/database');
  (loadWallets as jest.Mock).mockResolvedValue([]);
});

it('renders HashWatch title', async () => {
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('HashWatch')).toBeTruthy();
}, 20000);

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

it('shows add miner button when under limit', async () => {
  useMinerStore.setState({
    miners: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }] as any[],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('+')).toBeTruthy();
});

it('navigates to AddMiner from FAB', async () => {
  useMinerStore.setState({
    miners: [{ id: 'm1' }] as any[],
  });
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('+'));
  expect(navigation.navigate).toHaveBeenCalledWith('AddMiner');
});

it('navigates to Subscription when miner limit reached', async () => {
  useSubscriptionStore.setState({ maxMiners: 1 });
  useMinerStore.setState({
    miners: [makeMiner()],
  });
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('+'));
  expect(navigation.navigate).toHaveBeenCalledWith('Subscription');
});

it('shows upgrade banner when at limit', async () => {
  useSubscriptionStore.setState({ maxMiners: 1 });
  useMinerStore.setState({
    miners: [makeMiner()],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText(/Upgrade to Pro/)).toBeTruthy();
});

it('upgrade banner navigates to Subscription', async () => {
  useSubscriptionStore.setState({ maxMiners: 1 });
  useMinerStore.setState({
    miners: [makeMiner()],
  });
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByLabelText('Upgrade to Pro'));
  expect(navigation.navigate).toHaveBeenCalledWith('Subscription');
});

it('shows ErrorBanner when error is set', async () => {
  useMinerStore.setState({ error: 'Connection failed' });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText(/Connection failed/)).toBeTruthy();
});

it('error banner retry calls loadMiners', async () => {
  const loadMinersMock = jest.fn().mockResolvedValue(undefined);
  useMinerStore.setState({ error: 'Failed', loadMiners: loadMinersMock });
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('Retry'));
  expect(loadMinersMock).toHaveBeenCalled();
});

it('error banner dismiss calls clearError', async () => {
  const clearErrorMock = jest.fn();
  useMinerStore.setState({ error: 'Failed', clearError: clearErrorMock });
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByLabelText('Dismiss error'));
  expect(clearErrorMock).toHaveBeenCalled();
});

it('shows scanning banner when scanning', async () => {
  useMinerStore.setState({ scanning: true, scanProgress: { scanned: 50, total: 254, found: 3 } });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText(/Scanning 50\/254/)).toBeTruthy();
});

it('shows scanning banner with default values when scanProgress is null', async () => {
  useMinerStore.setState({ scanning: true, scanProgress: null });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText(/Scanning 0\/254/)).toBeTruthy();
});

it('shows wallet filter chips', async () => {
  const { loadWallets } = require('../src/db/database');
  (loadWallets as jest.Mock).mockResolvedValue([{ id: 'w1', name: 'My Wallet' }]);
  useMinerStore.setState({
    miners: [makeMiner({ walletId: 'w1' })],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('All')).toBeTruthy();
  expect(screen.getByText('My Wallet')).toBeTruthy();
});

it('filters miners by wallet', async () => {
  const { loadWallets } = require('../src/db/database');
  (loadWallets as jest.Mock).mockResolvedValue([
    { id: 'w1', name: 'Wallet1' },
    { id: 'w2', name: 'Wallet2' },
  ]);
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', walletId: 'w1' }),
      makeMiner({ id: 'm2', name: 'Miner2', walletId: 'w2' }),
    ],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('Miner1')).toBeTruthy();
  expect(screen.getByText('Miner2')).toBeTruthy();

  fireEvent.press(screen.getByLabelText('Filter by wallet: Wallet1'));
  expect(screen.getByText('Miner1')).toBeTruthy();
  await waitFor(() => {
    expect(screen.queryByText('Miner2')).toBeNull();
  });
});

it('toggles wallet filter off on second press', async () => {
  const { loadWallets } = require('../src/db/database');
  (loadWallets as jest.Mock).mockResolvedValue([
    { id: 'w1', name: 'Wallet1' },
    { id: 'w2', name: 'Wallet2' },
  ]);
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', walletId: 'w1' }),
      makeMiner({ id: 'm2', name: 'Miner2', walletId: 'w2' }),
    ],
  });
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByLabelText('Filter by wallet: Wallet1'));
  await waitFor(() => {
    expect(screen.queryByText('Miner2')).toBeNull();
  });
  fireEvent.press(screen.getByLabelText('Filter by wallet: Wallet1'));
  await waitFor(() => {
    expect(screen.getByText('Miner1')).toBeTruthy();
    expect(screen.getByText('Miner2')).toBeTruthy();
  });
});

it('shows group filter chips', async () => {
  useMinerStore.setState({
    miners: [makeMiner({ group: 'rack-a' })],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText(/rack-a/)).toBeTruthy();
});

it('filters miners by group', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', group: 'rack-a' }),
      makeMiner({ id: 'm2', name: 'Miner2', group: 'rack-b' }),
    ],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('Miner1')).toBeTruthy();
  expect(screen.getByText('Miner2')).toBeTruthy();

  fireEvent.press(screen.getByLabelText('Filter by group: rack-a'));
  expect(screen.getByText('Miner1')).toBeTruthy();
  await waitFor(() => {
    expect(screen.queryByText('Miner2')).toBeNull();
  });
});

it('toggles group filter off on second press', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', group: 'rack-a' }),
      makeMiner({ id: 'm2', name: 'Miner2', group: 'rack-b' }),
    ],
  });
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByLabelText('Filter by group: rack-a'));
  await waitFor(() => {
    expect(screen.queryByText('Miner2')).toBeNull();
  });
  fireEvent.press(screen.getByLabelText('Filter by group: rack-a'));
  await waitFor(() => {
    expect(screen.getByText('Miner1')).toBeTruthy();
    expect(screen.getByText('Miner2')).toBeTruthy();
  });
});

it('All chip resets both wallet and group filters', async () => {
  const { loadWallets } = require('../src/db/database');
  (loadWallets as jest.Mock).mockResolvedValue([{ id: 'w1', name: 'Wallet1' }]);
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', walletId: 'w1', group: 'rack-a' }),
      makeMiner({ id: 'm2', name: 'Miner2' }),
    ],
  });
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByLabelText('Filter by wallet: Wallet1'));
  await waitFor(() => {
    expect(screen.queryByText('Miner2')).toBeNull();
  });
  fireEvent.press(screen.getByLabelText('Filter: All'));
  await waitFor(() => {
    expect(screen.getByText('Miner2')).toBeTruthy();
  });
});

it('shows high temperature in danger color', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ status: { hashRate: 500, hashRateUnit: 'GH/s', power: 12, temperature: 85 } }),
    ],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('85°')).toBeTruthy();
});

it('shows dash when no temperature data', async () => {
  useMinerStore.setState({
    miners: [makeMiner({ status: { hashRate: 500, hashRateUnit: 'GH/s', power: 12 } })],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('—°')).toBeTruthy();
});
