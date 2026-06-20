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
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
  loadMiners: jest.fn().mockResolvedValue([]),
  saveMiner: jest.fn().mockResolvedValue(undefined),
  deleteMiner: jest.fn().mockResolvedValue(undefined),
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

jest.mock('../src/utils/export', () => ({
  exportAllData: jest.fn().mockResolvedValue(undefined),
  exportJSON: jest.fn().mockResolvedValue(undefined),
}));

let mockAuthToken: string | null = null;
let mockAuthSyncing = false;
const mockRestoreSession = jest.fn().mockResolvedValue(undefined);
const mockLogout = jest.fn().mockResolvedValue(undefined);
const mockSyncNow = jest.fn().mockResolvedValue(undefined);

const mockLogin = jest.fn().mockResolvedValue(false);
const mockRegister = jest.fn().mockResolvedValue(false);

jest.mock('../src/store/auth', () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = {
      token: mockAuthToken,
      userId: mockAuthToken ? 'u1' : null,
      email: mockAuthToken ? 'a@b.com' : null,
      syncing: mockAuthSyncing,
      synced: false,
      lastSyncTimestamp: mockAuthToken ? 1000000 : null,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      restoreSession: mockRestoreSession,
      syncNow: mockSyncNow,
    };
    return selector ? selector(state) : state;
  },
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { setTheme, darkTheme } from '../src/theme';
import { useMinerStore } from '../src/store/miners';
import { useSubscriptionStore } from '../src/store/subscription';

const navigation = { navigate: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthToken = null;
  mockAuthSyncing = false;
  setTheme(darkTheme);
  useMinerStore.setState({
    miners: [],
    initialized: true,
    loading: false,
    scanProgress: null,
    scanning: false,
    error: null,
    scanNetwork: jest.fn(),
    loadMiners: jest.fn().mockResolvedValue(undefined),
  });
  useSubscriptionStore.setState({
    tier: 'free',
    isPro: false,
    maxMiners: 999,
    initialized: true,
    loading: false,
  });
  mockLogin.mockResolvedValue(false);
  mockRegister.mockResolvedValue(false);
});

it('renders settings title', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('settings.title')).toBeTruthy();
});

it('shows plan as Free by default', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('settings.free')).toBeTruthy();
});

it('navigates to Subscription on plan press', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('settings.plan'));
  expect(navigation.navigate).toHaveBeenCalledWith('Subscription');
});

it('shows Pro badge when subscribed', async () => {
  useSubscriptionStore.getState().setPro();
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('settings.pro')).toBeTruthy();
});

it('shows Remote Sync section', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('settings.remoteSync')).toBeTruthy();
});

it('shows Theme selector', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('settings.theme')).toBeTruthy();
  expect(screen.getByText(/themes.system/)).toBeTruthy();
  expect(screen.getByText(/themes.dark/)).toBeTruthy();
  expect(screen.getByText(/themes.light/)).toBeTruthy();
});

it('shows miner count', async () => {
  useMinerStore.setState({ miners: [{ id: 'm1', name: 'T' }] as any[] });
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('settings.totalMiners')).toBeTruthy();
});

it('shows version', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('1.0.0')).toBeTruthy();
});

it('navigates to Wallets', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('settings.wallets'));
  expect(navigation.navigate).toHaveBeenCalledWith('Wallets');
});

it('navigates to Groups', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('settings.groups'));
  expect(navigation.navigate).toHaveBeenCalledWith('Groups');
});

it('navigates to ImportData', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('settings.importData'));
  expect(navigation.navigate).toHaveBeenCalledWith('ImportData');
});

it('shows Export CSV and Export JSON buttons', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('settings.exportCsv')).toBeTruthy();
  expect(screen.getByText('settings.exportJson')).toBeTruthy();
});

it('shows online miner count', async () => {
  useMinerStore.setState({
    miners: [
      { id: 'm1', name: 'T1', isOnline: true } as any,
      { id: 'm2', name: 'T2', isOnline: false } as any,
    ],
  });
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('settings.online')).toBeTruthy();
  expect(screen.getByText('1')).toBeTruthy();
});

it('shows auto-scan toggle', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('settings.autoScan')).toBeTruthy();
});

it('shows Refresh All and Scan Network buttons', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('settings.refreshAll')).toBeTruthy();
  expect(screen.getByText('settings.scanNetwork')).toBeTruthy();
});

it('toggles auth form when Remote Sync row is pressed', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.queryByLabelText('Email input')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Remote Sync'));
  expect(screen.getByLabelText('Email input')).toBeTruthy();
  expect(screen.getByLabelText('Password input')).toBeTruthy();
  expect(screen.getByLabelText('Sign In')).toBeTruthy();
});

it('calls login when auth form is submitted', async () => {
  mockLogin.mockResolvedValueOnce(true);
  render(<SettingsScreen navigation={navigation} />);
  await waitFor(() => {
    expect(screen.getByText('settings.remoteSync')).toBeTruthy();
  });
  await fireEvent.press(screen.getByLabelText('Remote Sync'));
  const emailInput = await screen.findByLabelText('Email input');
  await fireEvent.changeText(emailInput, 'test@test.com');
  await fireEvent.changeText(screen.getByLabelText('Password input'), 'password123');
  await fireEvent.press(screen.getByLabelText('Sign In'));
  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123');
  });
});

it('shows error on failed login', async () => {
  mockLogin.mockResolvedValueOnce(false);
  render(<SettingsScreen navigation={navigation} />);
  await waitFor(() => {
    expect(screen.getByText('settings.remoteSync')).toBeTruthy();
  });
  await fireEvent.press(screen.getByLabelText('Remote Sync'));
  const emailInput = await screen.findByLabelText('Email input');
  await fireEvent.changeText(emailInput, 'bad@test.com');
  await fireEvent.changeText(screen.getByLabelText('Password input'), 'wrong');
  await fireEvent.press(screen.getByLabelText('Sign In'));
  await waitFor(() => {
    expect(screen.getByText('settings.loginFailed')).toBeTruthy();
  });
});

it('toggles between register and sign in modes', async () => {
  mockRegister.mockResolvedValueOnce(false);
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByLabelText('Remote Sync'));
  await waitFor(() => expect(screen.getByLabelText('Sign In')).toBeTruthy());

  await fireEvent.press(screen.getByLabelText('Switch to create account'));
  await waitFor(() => expect(screen.getByLabelText('Create Account')).toBeTruthy());

  await fireEvent.changeText(screen.getByLabelText('Email input'), 'new@test.com');
  await fireEvent.changeText(screen.getByLabelText('Password input'), 'password123');
  await fireEvent.press(screen.getByLabelText('Create Account'));
  await waitFor(() => {
    expect(mockRegister).toHaveBeenCalledWith('new@test.com', 'password123');
  });
});

it('presses a theme button', async () => {
  const { getThemeMode } = require('../src/theme');
  const { setThemeMode } = require('../src/theme');
  await render(<SettingsScreen navigation={navigation} />);
  const lightThemeBtn = screen.getByLabelText('light theme');
  fireEvent.press(lightThemeBtn);
  expect(getThemeMode()).toBe('light');
});

it('changes power cost input', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  const powerInput = screen.getByLabelText('Power cost input');
  await fireEvent.changeText(powerInput, '0.15');
  await waitFor(() => {
    expect(screen.getByLabelText('Power cost input').props.value).toBe('0.15');
  });
});

it('toggles auto-scan switch', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  const switchEl = screen.getByLabelText('Auto-scan network');
  expect(switchEl).toBeTruthy();
  fireEvent(switchEl, 'onValueChange', true);
});

it('calls loadMiners on Refresh All press', async () => {
  const mockLoadMiners = jest.fn().mockResolvedValue(undefined);
  useMinerStore.setState({ loadMiners: mockLoadMiners } as any);
  await render(<SettingsScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('settings.refreshAll'));
  expect(mockLoadMiners).toHaveBeenCalled();
});

it('shows Sync Now button when authenticated', async () => {
  mockAuthToken = 't1';
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByLabelText('Remote Sync'));
  expect(screen.getByLabelText('Sync Now')).toBeTruthy();
});

it('calls syncNow when Sync Now button is pressed', async () => {
  mockAuthToken = 't1';
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByLabelText('Remote Sync'));
  await fireEvent.press(screen.getByLabelText('Sync Now'));
  expect(mockSyncNow).toHaveBeenCalled();
});

it('disables Sync Now button while syncing', async () => {
  mockAuthToken = 't1';
  mockAuthSyncing = true;
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByLabelText('Remote Sync'));
  const btn = screen.getByLabelText('Sync Now');
  expect(btn.props.accessibilityState.disabled).toBe(true);
});
