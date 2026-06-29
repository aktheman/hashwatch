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

// Strips raw React element props (e.g. refreshControl={<RefreshControl />})
// from the toJSON() tree, because pretty-format deeply serializes React elements'
// fiber internals (_owner, _store, etc.), causing RangeError: Invalid string length.
function stripReactElementProps(tree) {
  if (!tree || typeof tree !== 'object') return tree;
  if (String(tree.$$typeof) !== 'Symbol(react.test.json)') return null;

  let propsClean = tree.props;
  if (propsClean) {
    const keys = Object.keys(propsClean);
    for (let i = 0; i < keys.length; i++) {
      const val = propsClean[keys[i]];
      if (
        val &&
        typeof val === 'object' &&
        typeof val.$$typeof === 'symbol' &&
        String(val.$$typeof) !== 'Symbol(react.test.json)'
      ) {
        propsClean = { ...propsClean };
        delete propsClean[keys[i]];
      }
    }
  }
  let childrenClean = tree.children;
  if (childrenClean && Array.isArray(childrenClean)) {
    childrenClean = childrenClean.map(stripReactElementProps);
  }
  if (propsClean !== tree.props || childrenClean !== tree.children) {
    return { ...tree, props: propsClean, children: childrenClean };
  }
  return tree;
}

it('DashboardScreen empty state matches snapshot', async () => {
  const tree = await render(<DashboardScreen navigation={navigation} />);
  expect(stripReactElementProps(tree.toJSON())).toMatchSnapshot();
});

it('SettingsScreen matches snapshot', async () => {
  const { act } = require('react');
  const TestRenderer = require('react-test-renderer');
  let renderer;
  await act(() => {
    renderer = TestRenderer.create(<SettingsScreen navigation={navigation} />);
  });
  const cleaned = stripReactElementProps(renderer.toJSON());
  expect(cleaned).toMatchSnapshot();
});

it('AnalyticsScreen renders empty state', async () => {
  const tree = await render(<AnalyticsScreen />);
  expect(tree.getByText('analytics.title')).toBeTruthy();
});

it('PoolsScreen empty state matches snapshot', async () => {
  const tree = await render(<PoolsScreen navigation={navigation} />);
  expect(stripReactElementProps(tree.toJSON())).toMatchSnapshot();
});
