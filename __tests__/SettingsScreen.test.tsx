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

import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { setTheme, darkTheme } from '../src/theme';
import { useMinerStore } from '../src/store/miners';
import { useSubscriptionStore } from '../src/store/subscription';
import { useAuthStore } from '../src/store/auth';

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
  loadMiners: jest.fn().mockResolvedValue([]),
  saveMiner: jest.fn().mockResolvedValue(undefined),
  deleteMiner: jest.fn().mockResolvedValue(undefined),
  saveSnapshot: jest.fn().mockResolvedValue(undefined),
  getSnapshots: jest.fn().mockResolvedValue([]),
}));

jest.mock('../src/api/client', () => ({
  BASE_URL: 'http://localhost:4000',
  configureClient: jest.fn(),
  pushStats: jest.fn(),
}));

jest.mock('../src/services/websocket', () => ({
  connectWebSocket: jest.fn(),
  disconnectWebSocket: jest.fn(),
}));

jest.mock('../src/services/pushRegistration', () => ({
  registerPushToken: jest.fn(),
}));

jest.mock('../src/api/bitaxe', () => ({
  BitAxeClient: { probe: jest.fn() },
}));

const navigation = { navigate: jest.fn() };

beforeEach(() => {
  setTheme(darkTheme);
  useMinerStore.setState({
    miners: [],
    initialized: true,
    loading: false,
    scanProgress: null,
    scanning: false,
    error: null,
  });
  useSubscriptionStore.setState({
    tier: 'free',
    isPro: false,
    maxMiners: 3,
    initialized: true,
    loading: false,
  });
  useAuthStore.setState({ token: null, userId: null, email: null });
  jest.clearAllMocks();
});

it('renders settings title', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('Settings')).toBeTruthy();
});

it('shows plan as Free by default', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('Free')).toBeTruthy();
});

it('navigates to Subscription on plan press', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('Plan'));
  expect(navigation.navigate).toHaveBeenCalledWith('Subscription');
});

it('shows Pro badge when subscribed', async () => {
  useSubscriptionStore.getState().setPro();
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('Pro')).toBeTruthy();
});

it('shows Remote Sync section', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('Remote Sync')).toBeTruthy();
});

it('shows Dark Mode toggle', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('Dark Mode')).toBeTruthy();
});

it('shows miner count', async () => {
  useMinerStore.setState({ miners: [{ id: 'm1', name: 'T' }] as any[] });
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('Total Miners')).toBeTruthy();
});

it('shows version', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('1.0.0')).toBeTruthy();
});
