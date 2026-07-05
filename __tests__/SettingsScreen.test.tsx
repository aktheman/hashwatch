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
  putSetting: jest.fn().mockResolvedValue(undefined),
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
  exportMinerStatusCSV: jest.fn().mockResolvedValue(undefined),
  importFromCSV: jest.fn().mockResolvedValue({ imported: 0, errors: [] }),
}));

jest.mock('../src/services/backup', () => ({
  exportBackup: jest.fn().mockResolvedValue(undefined),
  importBackup: jest.fn().mockResolvedValue({ success: true }),
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
import { Alert, Platform } from 'react-native';
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
  expect(await screen.findByText('settings.title', {}, { timeout: 15000 })).toBeTruthy();
}, 20000);

it('shows plan as Free by default', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByText('settings.free')).toBeTruthy();
});

it('navigates to Subscription on plan press', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByText('settings.plan'));
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
  await fireEvent.press(screen.getByText('settings.wallets'));
  expect(navigation.navigate).toHaveBeenCalledWith('Wallets');
});

it('navigates to Groups', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByText('settings.groups'));
  expect(navigation.navigate).toHaveBeenCalledWith('Groups');
});

it('navigates to ImportData', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getAllByText('settings.importData')[0]);
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
  const r = await render(<SettingsScreen navigation={navigation} />);
  await waitFor(() => {
    expect(r.getByText('settings.remoteSync')).toBeTruthy();
  });
  await fireEvent.press(r.getByLabelText('Remote Sync'));
  const emailInput = await r.findByLabelText('Email input');
  await fireEvent.changeText(emailInput, 'test@test.com');
  await fireEvent.changeText(r.getByLabelText('Password input'), 'password123');
  await fireEvent.press(r.getByLabelText('Sign In'));
  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123');
  });
});

it('shows error on failed login', async () => {
  mockLogin.mockResolvedValueOnce(false);
  const r = await render(<SettingsScreen navigation={navigation} />);
  await waitFor(() => {
    expect(r.getByText('settings.remoteSync')).toBeTruthy();
  });
  await fireEvent.press(r.getByLabelText('Remote Sync'));
  const emailInput = await r.findByLabelText('Email input');
  await fireEvent.changeText(emailInput, 'bad@test.com');
  await fireEvent.changeText(r.getByLabelText('Password input'), 'wrong');
  await fireEvent.press(r.getByLabelText('Sign In'));
  await waitFor(() => {
    expect(r.getByText('settings.loginFailed')).toBeTruthy();
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
  await fireEvent.press(lightThemeBtn);
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
  await fireEvent.press(screen.getByText('settings.refreshAll'));
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

it('calls exportAllData on Export CSV press', async () => {
  const { exportAllData: mockExport } = jest.requireMock('../src/utils/export');
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByLabelText('Export CSV'));
  expect(mockExport).toHaveBeenCalled();
});

it('calls exportJSON on Export JSON backup press', async () => {
  const { exportJSON: mockExport } = jest.requireMock('../src/utils/export');
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByLabelText('Export JSON backup'));
  expect(mockExport).toHaveBeenCalled();
});

it('switches language via language chip', async () => {
  const { setSetting: mockSetSetting } = jest.requireMock('../src/db/database');
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByLabelText('Switch language to es'));
  expect(mockSetSetting).toHaveBeenCalledWith('language', 'es');
});

it('disables dark mode schedule via Off button', async () => {
  const { setSetting: mockSetSetting } = jest.requireMock('../src/db/database');
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByLabelText('Disable dark mode schedule'));
  expect(mockSetSetting).toHaveBeenCalledWith('auto_dark_hour', '');
});

it('schedules dark mode at selected hour', async () => {
  const { setSetting: mockSetSetting } = jest.requireMock('../src/db/database');
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByLabelText('Schedule dark mode at 20:00'));
  expect(mockSetSetting).toHaveBeenCalledWith('auto_dark_hour', '20');
});

it('calls exportMinerStatusCSV on Export Status CSV press', async () => {
  const { exportMinerStatusCSV: mockExport } = jest.requireMock('../src/utils/export');
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByLabelText('Export Status CSV'));
  expect(mockExport).toHaveBeenCalled();
});

it('shows alert when exportAllData fails', async () => {
  const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { exportAllData: mockExport } = jest.requireMock('../src/utils/export');
  mockExport.mockRejectedValue(new Error('fail'));
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(screen.getByLabelText('Export CSV'));
  await waitFor(() => expect(mockAlert).toHaveBeenCalled());
  mockAlert.mockRestore();
});

it('shows proxy URL section on web platform', async () => {
  const origOS = (Platform as any).OS;
  (Platform as any).OS = 'web';
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.getByLabelText('Proxy URL input')).toBeTruthy();
  expect(screen.getByLabelText('settings.saveProxyUrl')).toBeTruthy();
  (Platform as any).OS = origOS;
});

it('saves proxy URL on web platform', async () => {
  const origOS = (Platform as any).OS;
  (Platform as any).OS = 'web';
  const { setSetting: mockSetSetting } = jest.requireMock('../src/db/database');
  await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.changeText(screen.getByLabelText('Proxy URL input'), 'http://proxy:4567');
  await fireEvent.press(screen.getByLabelText('settings.saveProxyUrl'));
  await waitFor(() => {
    expect(mockSetSetting).toHaveBeenCalledWith('proxy_url', 'http://proxy:4567');
  });
  (Platform as any).OS = origOS;
});

it('toggles RevenueCat debug panel', async () => {
  await render(<SettingsScreen navigation={navigation} />);
  expect(screen.queryByText('▼ settings.debugMenu')).toBeTruthy();
  await fireEvent.press(screen.getByText('▼ settings.debugMenu'));
  expect(screen.queryByText('▲ settings.hideDebug')).toBeTruthy();
  expect(screen.getByLabelText('Restore purchases')).toBeTruthy();
});

it('shows last sync display when authenticated', async () => {
  mockAuthToken = 't1';
  const now = Date.now();
  const r = await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Remote Sync'));
  await waitFor(() => {
    expect(r.getByText('settings.lastSync')).toBeTruthy();
  });
});

it('shows "now" for last sync within 60s', async () => {
  mockAuthToken = 't1';
  const { setSetting } = require('../src/db/database');
  (setSetting as jest.Mock).mockClear();
  const RealDate = Date;
  const mockDate = new Date('2025-01-01T12:00:30Z').getTime();
  global.Date.now = jest.fn(() => mockDate);
  const r = await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Remote Sync'));
  await waitFor(() => {
    expect(r.getByText('settings.lastSync')).toBeTruthy();
  });
  global.Date.now = RealDate.now;
});

it('calls logout on Disconnect', async () => {
  mockAuthToken = 't1';
  const r = await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Remote Sync'));
  await fireEvent.press(r.getByLabelText('Disconnect'));
  expect(mockLogout).toHaveBeenCalled();
});

it('shows registration error on failed register', async () => {
  mockRegister.mockResolvedValueOnce(false);
  const r = await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Remote Sync'));
  await fireEvent.press(r.getByLabelText('Switch to create account'));
  await waitFor(() => expect(r.getByLabelText('Create Account')).toBeTruthy());
  await fireEvent.changeText(r.getByLabelText('Email input'), 'new@test.com');
  await fireEvent.changeText(r.getByLabelText('Password input'), 'pass');
  await fireEvent.press(r.getByLabelText('Create Account'));
  await waitFor(() => {
    expect(r.getByText('settings.registrationFailed')).toBeTruthy();
  });
});

it('toggles push notifications switch', async () => {
  const { setSetting } = require('../src/db/database');
  const r = await render(<SettingsScreen navigation={navigation} />);
  const toggle = r.getByLabelText('Toggle push notifications');
  fireEvent(toggle, 'onValueChange', false);
  await waitFor(() => {
    expect(setSetting).toHaveBeenCalledWith('notifications_enabled', 'false');
  });
});

it('navigates to AlertHistory', async () => {
  const r = await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(r.getByText('settings.alertHistory'));
  expect(navigation.navigate).toHaveBeenCalledWith('AlertHistory');
});

it('calls scanNetwork on Scan Network press', async () => {
  const mockScanNetwork = jest.fn();
  useMinerStore.setState({ scanNetwork: mockScanNetwork } as any);
  const r = await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(r.getByText('settings.scanNetwork'));
  expect(mockScanNetwork).toHaveBeenCalled();
});

it('shows scanning disabled state', async () => {
  useMinerStore.setState({ scanning: true } as any);
  const r = await render(<SettingsScreen navigation={navigation} />);
  expect(r.getByText('settings.scanning')).toBeTruthy();
});

it('calls importFromCSV on CSV import', async () => {
  const { importFromCSV } = jest.requireMock('../src/utils/export');
  const r = await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Import CSV'));
  const input = r.getByPlaceholderText('settings.csvPlaceholder');
  await fireEvent.changeText(input, 'name,ip,port\nM1,10.0.0.1,80');
  await fireEvent.press(r.getByLabelText('Import CSV data'));
  await waitFor(() => {
    expect(importFromCSV).toHaveBeenCalledWith(expect.stringContaining('name,ip,port'));
  });
});

it('calls exportBackup on Export all data press', async () => {
  const { exportBackup } = jest.requireMock('../src/services/backup');
  const r = await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Export all data'));
  expect(exportBackup).toHaveBeenCalled();
});

it('shows error alert when exportBackup fails', async () => {
  const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { exportBackup } = jest.requireMock('../src/services/backup');
  (exportBackup as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  const r = await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Export all data'));
  await waitFor(() => {
    expect(mockAlert).toHaveBeenCalledWith('settings.exportFailed', 'disk full');
  });
  mockAlert.mockRestore();
});

it('loads saved language from settings on mount', async () => {
  const { getSetting } = require('../src/db/database');
  (getSetting as jest.Mock).mockImplementation(async (key: string) => {
    if (key === 'language') return 'es';
    return null;
  });
  await render(<SettingsScreen navigation={navigation} />);
  await waitFor(() => {
    expect(getSetting).toHaveBeenCalledWith('language');
  });
});

it('closes auth form on successful login', async () => {
  mockLogin.mockResolvedValueOnce(true);
  mockAuthToken = null;
  const r = await render(<SettingsScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Remote Sync'));
  await waitFor(() => expect(r.getByLabelText('Email input')).toBeTruthy());
  await fireEvent.changeText(r.getByLabelText('Email input'), 'a@b.com');
  await fireEvent.changeText(r.getByLabelText('Password input'), 'pass');
  await fireEvent.press(r.getByLabelText('Sign In'));
  await waitFor(() => {
    expect(r.queryByLabelText('Email input')).toBeNull();
  });
});
