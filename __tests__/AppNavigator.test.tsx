jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn(),
  setSetting: jest.fn().mockResolvedValue(undefined),
  loadMiners: jest.fn().mockResolvedValue([]),
  saveMiner: jest.fn().mockResolvedValue(undefined),
  deleteMiner: jest.fn().mockResolvedValue(undefined),
  saveSnapshot: jest.fn().mockResolvedValue(undefined),
  getSnapshots: jest.fn().mockResolvedValue([]),
  loadWallets: jest.fn().mockResolvedValue([]),
  saveWallet: jest.fn().mockResolvedValue(undefined),
  deleteWallet: jest.fn().mockResolvedValue(undefined),
  cleanupOldSnapshots: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/revenuecat', () => ({
  configureRevenueCat: jest.fn(),
  checkProStatus: jest.fn().mockResolvedValue(false),
  purchasePro: jest.fn(),
  restorePurchases: jest.fn(),
}));

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

jest.mock('../src/api/bitaxe', () => {
  const MockBitAxeClient = jest.fn().mockImplementation(() => ({
    getSystemInfo: jest.fn().mockResolvedValue({ hostname: 'Test' }),
    getMinerStatus: jest.fn().mockResolvedValue({}),
    fetchAll: jest.fn().mockResolvedValue({ info: {}, status: {} }),
  }));
  MockBitAxeClient.probe = jest.fn();
  return { BitAxeClient: MockBitAxeClient };
});

jest.mock('../src/services/notifications', () => ({
  checkMinerAlerts: jest.fn(),
}));

const mockShowUndo = jest.fn();
jest.mock('../src/store/toast', () => ({
  useToastStore: Object.assign(
    (selector: any) =>
      selector({
        undo: null,
        showUndo: mockShowUndo,
        dismissUndo: jest.fn(),
      }),
    { getState: () => ({ showUndo: mockShowUndo, dismissUndo: jest.fn(), undo: null }) },
  ),
}));

jest.mock('../src/services/pushRegistration', () => ({
  registerPushToken: jest.fn(),
}));

jest.mock('../src/services/websocket', () => ({
  connectWebSocket: jest.fn(),
  disconnectWebSocket: jest.fn(),
}));

jest.mock('../src/discovery/localNetwork', () => ({
  scanNetwork: jest.fn(),
  getLocalSubnet: jest.fn(),
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { AppNavigator } from '../src/navigation/AppNavigator';
import { setTheme, darkTheme } from '../src/theme';
import { useSubscriptionStore } from '../src/store/subscription';
import { useMinerStore } from '../src/store/miners';
import * as DB from '../src/db/database';

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
  setTheme(darkTheme);
  useSubscriptionStore.setState({
    tier: 'free',
    isPro: false,
    maxMiners: 4,
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
  });
  jest.clearAllMocks();
  (DB.loadMiners as jest.Mock).mockResolvedValue([]);
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'empty_groups' || key === 'kiosk_mode') return null;
    return 'true';
  });
});

it('shows main app when onboarding_complete is true', async () => {
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'onboarding_complete') return 'true';
    return null;
  });
  await render(<AppNavigator />);
  expect(await screen.findByText('dashboard.noMiners')).toBeTruthy();
});

it('shows dashboard with all four tabs', async () => {
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'onboarding_complete') return 'true';
    return null;
  });
  await render(<AppNavigator />);
  expect(await screen.findByText('HashWatch')).toBeTruthy();
  expect(screen.getByText('tabs.dashboard')).toBeTruthy();
  expect(screen.getByText('tabs.pools')).toBeTruthy();
  expect(screen.getByText('tabs.analytics')).toBeTruthy();
  expect(screen.getByText('tabs.settings')).toBeTruthy();
});

it('shows miner card when miners exist', async () => {
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'onboarding_complete') return 'true';
    return null;
  });
  (DB.loadMiners as jest.Mock).mockResolvedValue([makeMiner()]);
  useMinerStore.setState({
    miners: [makeMiner()],
    initialized: true,
    loading: false,
    refreshAll: jest.fn(),
  });
  await render(<AppNavigator />);
  expect((await screen.findAllByText('TestMiner')).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('500.0 GH/s').length).toBeGreaterThanOrEqual(1);
});

it('shows OfflineBanner text when online', async () => {
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'onboarding_complete') return 'true';
    return null;
  });
  await render(<AppNavigator />);
  expect(await screen.findByText('HashWatch')).toBeTruthy();
});

it('renders Suspense loading fallback for lazy screens', async () => {
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'onboarding_complete') return 'true';
    return null;
  });
  await render(<AppNavigator />);
  expect(await screen.findByText('dashboard.noMiners')).toBeTruthy();
});

it('navigates to Pools tab', async () => {
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'onboarding_complete') return 'true';
    return null;
  });
  await render(<AppNavigator />);
  expect(await screen.findByText('HashWatch')).toBeTruthy();
  fireEvent.press(screen.getByText('tabs.pools'));
  expect(await screen.findByText('pools.noPools')).toBeTruthy();
});

it('navigates to Analytics tab', async () => {
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'onboarding_complete') return 'true';
    return null;
  });
  await render(<AppNavigator />);
  expect(await screen.findByText('HashWatch')).toBeTruthy();
  fireEvent.press(screen.getByText('tabs.analytics'));
  expect(await screen.findByText('analytics.title')).toBeTruthy();
});

it('navigates to Settings tab', async () => {
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'onboarding_complete') return 'true';
    return null;
  });
  await render(<AppNavigator />);
  expect(await screen.findByText('HashWatch')).toBeTruthy();
  fireEvent.press(screen.getByText('tabs.settings'));
  expect(await screen.findByText('settings.title')).toBeTruthy();
});

it('navigates to Subscription screen from Settings', async () => {
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'onboarding_complete') return 'true';
    return null;
  });
  await render(<AppNavigator />);
  expect(await screen.findByText('HashWatch')).toBeTruthy();
  fireEvent.press(screen.getByText('tabs.settings'));
  await screen.findByText('settings.title');
  fireEvent.press(screen.getByText('settings.plan'));
  expect(await screen.findByText('subscription.title')).toBeTruthy();
});

it('navigates to AddMiner screen', async () => {
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'onboarding_complete') return 'true';
    return null;
  });
  await render(<AppNavigator />);
  expect(await screen.findByText('HashWatch')).toBeTruthy();
  fireEvent.press(screen.getByText('dashboard.addMiner'));
  expect(await screen.findByText(/addMiner/i)).toBeTruthy();
});

it('navigates to Wallets screen from Settings', async () => {
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'onboarding_complete') return 'true';
    return null;
  });
  await render(<AppNavigator />);
  expect(await screen.findByText('HashWatch')).toBeTruthy();
  fireEvent.press(screen.getByText('tabs.settings'));
  await screen.findByText('settings.title');
  fireEvent.press(screen.getByText('settings.wallets'));
  expect(await screen.findByText('wallets.title')).toBeTruthy();
});

it('navigates to Groups screen from Settings', async () => {
  (DB.getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'onboarding_complete') return 'true';
    return null;
  });
  await render(<AppNavigator />);
  expect(await screen.findByText('HashWatch')).toBeTruthy();
  fireEvent.press(screen.getByText('tabs.settings'));
  await screen.findByText('settings.title');
  fireEvent.press(screen.getByText('settings.groups'));
  expect(await screen.findByText(/groups.title/)).toBeTruthy();
});
