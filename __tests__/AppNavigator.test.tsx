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

jest.mock('../src/api/bitaxe', () => ({
  BitAxeClient: { probe: jest.fn() },
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

jest.mock('../src/discovery/localNetwork', () => ({
  scanNetwork: jest.fn(),
  getLocalSubnet: jest.fn(),
}));

import { render, screen, act, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { AppNavigator } from '../src/navigation/AppNavigator';
import { setTheme, darkTheme } from '../src/theme';
import { useSubscriptionStore } from '../src/store/subscription';
import { useMinerStore } from '../src/store/miners';
import * as DB from '../src/db/database';

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
});

it('shows main app when onboarding_complete is true', async () => {
  (DB.getSetting as jest.Mock).mockResolvedValue('true');
  await act(async () => {
    await render(<AppNavigator />);
  });
  expect(await screen.findByText('No Miners Yet')).toBeTruthy();
});

it('shows dashboard with tabs', async () => {
  (DB.getSetting as jest.Mock).mockResolvedValue('true');
  await act(async () => {
    await render(<AppNavigator />);
  });
  expect(await screen.findByText('HashWatch')).toBeTruthy();
  expect(screen.getByText('Dashboard')).toBeTruthy();
});
