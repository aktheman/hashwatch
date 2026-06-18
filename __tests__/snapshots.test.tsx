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
  removeCustomerInfoUpdateListener: jest.fn(),
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

const mockRestoreSession = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/store/auth', () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = {
      token: null,
      userId: null,
      email: null,
      syncing: false,
      synced: false,
      login: jest.fn().mockResolvedValue(false),
      register: jest.fn().mockResolvedValue(false),
      logout: jest.fn().mockResolvedValue(undefined),
      restoreSession: mockRestoreSession,
    };
    return selector ? selector(state) : state;
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

jest.mock('../src/utils/export', () => ({
  exportAllData: jest.fn().mockResolvedValue(undefined),
  exportJSON: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-chart-kit', () => ({
  LineChart: () => null,
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

import { render, cleanup } from '@testing-library/react-native';
import React from 'react';
import { DashboardScreen } from '../src/screens/DashboardScreen';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { AnalyticsScreen } from '../src/screens/AnalyticsScreen';
import { PoolsScreen } from '../src/screens/PoolsScreen';
import { setTheme, darkTheme } from '../src/theme';
import { useMinerStore } from '../src/store/miners';
import { useSubscriptionStore } from '../src/store/subscription';

const navigation = { navigate: jest.fn() };

beforeEach(() => {
  cleanup();
  jest.useFakeTimers();
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
});

afterEach(() => {
  jest.useRealTimers();
});

it('DashboardScreen empty state matches snapshot', async () => {
  const tree = await render(<DashboardScreen navigation={navigation} />);
  expect(tree.toJSON()).toMatchSnapshot();
});

it('SettingsScreen matches snapshot', async () => {
  const tree = await render(<SettingsScreen navigation={navigation} />);
  expect(tree.toJSON()).toMatchSnapshot();
});

it('AnalyticsScreen empty state matches snapshot', async () => {
  const tree = await render(<AnalyticsScreen />);
  expect(tree.toJSON()).toMatchSnapshot();
});

it('PoolsScreen empty state matches snapshot', async () => {
  const tree = await render(<PoolsScreen navigation={navigation} />);
  expect(tree.toJSON()).toMatchSnapshot();
});
