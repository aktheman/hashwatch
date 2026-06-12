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
}));

import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { AddMinerScreen } from '../src/screens/AddMinerScreen';
import { setTheme, darkTheme } from '../src/theme';
import { useMinerStore } from '../src/store/miners';
import { useSubscriptionStore } from '../src/store/subscription';

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

beforeEach(() => {
  setTheme(darkTheme);
  useSubscriptionStore.setState({
    tier: 'free',
    isPro: false,
    maxMiners: 999,
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

it('renders Add by IP section', async () => {
  await render(<AddMinerScreen navigation={navigation} />);
  expect(screen.getByText('Add by IP')).toBeTruthy();
  expect(screen.getByPlaceholderText('192.168.1.100')).toBeTruthy();
  expect(screen.getByPlaceholderText('Name (optional)')).toBeTruthy();
});

it('renders Scan Network section', async () => {
  await render(<AddMinerScreen navigation={navigation} />);
  expect(screen.getByText('Scan Network')).toBeTruthy();
  expect(screen.getByText('Find Miners')).toBeTruthy();
});

it('shows "or" divider', async () => {
  await render(<AddMinerScreen navigation={navigation} />);
  expect(screen.getByText('or')).toBeTruthy();
});
