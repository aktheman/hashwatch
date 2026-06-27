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

jest.mock('../src/utils/export', () => ({
  exportAllData: jest.fn(),
}));

jest.mock('../src/theme', () => ({
  ...(jest.requireActual('../src/theme') as object),
  setThemeMode: jest.fn(),
  getThemeMode: jest.fn(() => 'dark' as const),
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
import { Alert, Platform } from 'react-native';
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
  const { loadWallets, getSetting } = require('../src/db/database');
  (loadWallets as jest.Mock).mockResolvedValue([]);
  (getSetting as jest.Mock).mockResolvedValue(null);
});

it('renders HashWatch title', async () => {
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('HashWatch')).toBeTruthy();
}, 20000);

it('shows empty state when no miners', async () => {
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('dashboard.noMiners')).toBeTruthy();
  expect(screen.getByText('dashboard.addMiner')).toBeTruthy();
  expect(screen.getByText('dashboard.scanNetwork')).toBeTruthy();
});

it('shows loading state', async () => {
  useMinerStore.setState({ loading: true, initialized: false });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.queryByText('dashboard.noMiners')).toBeNull();
}, 15000);

it('navigates to AddMiner from empty state', async () => {
  await render(<DashboardScreen navigation={navigation} />);
  fireEvent.press(screen.getByText('dashboard.addMiner'));
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
  expect(screen.getByText('1')).toBeTruthy();
  expect(screen.getAllByText('dashboard.hashrate').length).toBeGreaterThan(0);
  expect(screen.getByText('dashboard.power')).toBeTruthy();
  expect(screen.getByText('dashboard.temp')).toBeTruthy();
  expect(screen.getByText('dashboard.efficiency')).toBeTruthy();
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
  expect(screen.getAllByText('TestMiner')[0]).toBeTruthy();
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
  fireEvent.press(screen.getByLabelText('TestMiner, online, 500.0 GH/s'));
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
  expect(screen.getByText(/dashboard.upgradePro/)).toBeTruthy();
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
  fireEvent.press(screen.getByText('common.retry'));
  expect(loadMinersMock).toHaveBeenCalled();
});

it('error banner dismiss calls clearError', async () => {
  const clearErrorMock = jest.fn();
  useMinerStore.setState({ error: 'Failed', clearError: clearErrorMock });
  await render(<DashboardScreen />);
  fireEvent.press(screen.getByLabelText('errorBoundary.unexpectedError'));
  expect(clearErrorMock).toHaveBeenCalled();
});

it('shows scanning banner when scanning', async () => {
  useMinerStore.setState({ scanning: true, scanProgress: { scanned: 50, total: 254, found: 3 } });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('dashboard.scanning')).toBeTruthy();
});

it('shows scanning banner with default values when scanProgress is null', async () => {
  useMinerStore.setState({ scanning: true, scanProgress: null });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('dashboard.scanning')).toBeTruthy();
});

it('shows wallet filter chips', async () => {
  const { loadWallets } = require('../src/db/database');
  (loadWallets as jest.Mock).mockResolvedValue([{ id: 'w1', name: 'My Wallet' }]);
  useMinerStore.setState({
    miners: [makeMiner({ walletId: 'w1' })],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('common.all')).toBeTruthy();
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
  expect(screen.getAllByText('Miner1').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Miner2').length).toBeGreaterThanOrEqual(1);

  fireEvent.press(screen.getByLabelText('Filter by wallet: Wallet1'));
  expect(screen.getAllByText('Miner1').length).toBeGreaterThanOrEqual(1);
  await waitFor(() => {
    expect(screen.queryAllByText('Miner2').length).toBe(0);
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
    expect(screen.queryAllByText('Miner2').length).toBe(0);
  });
  fireEvent.press(screen.getByLabelText('Filter by wallet: Wallet1'));
  await waitFor(() => {
    expect(screen.getAllByText('Miner1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Miner2').length).toBeGreaterThanOrEqual(1);
  });
});

it('shows group filter chips', async () => {
  useMinerStore.setState({
    miners: [makeMiner({ group: 'rack-a' })],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getAllByText(/rack-a/).length).toBeGreaterThanOrEqual(1);
});

it('filters miners by group', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', group: 'rack-a' }),
      makeMiner({ id: 'm2', name: 'Miner2', group: 'rack-b' }),
    ],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getAllByText('Miner1').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Miner2').length).toBeGreaterThanOrEqual(1);

  fireEvent.press(screen.getByLabelText('Filter by group: rack-a'));
  expect(screen.getAllByText('Miner1').length).toBeGreaterThanOrEqual(1);
  await waitFor(() => {
    expect(screen.queryAllByText('Miner2').length).toBe(0);
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
    expect(screen.queryAllByText('Miner2').length).toBe(0);
  });
  fireEvent.press(screen.getByLabelText('Filter by group: rack-a'));
  await waitFor(() => {
    expect(screen.getAllByText('Miner1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Miner2').length).toBeGreaterThanOrEqual(1);
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
    expect(screen.queryAllByText('Miner2').length).toBe(0);
  });
  fireEvent.press(screen.getByLabelText('Filter: All'));
  await waitFor(() => {
    expect(screen.getAllByText('Miner2').length).toBeGreaterThanOrEqual(1);
  });
});

it('shows high temperature in danger color', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ status: { hashRate: 500, hashRateUnit: 'GH/s', power: 12, temperature: 85 } }),
    ],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getAllByText('85°').length).toBeGreaterThanOrEqual(1);
});

it('shows dash when no temperature data', async () => {
  useMinerStore.setState({
    miners: [makeMiner({ status: { hashRate: 500, hashRateUnit: 'GH/s', power: 12 } })],
  });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.getByText('—°')).toBeTruthy();
});

describe('comparison selection mode', () => {
  it('shows Compare button in header when miners exist', async () => {
    useMinerStore.setState({
      miners: [makeMiner()],
    });
    await render(<DashboardScreen navigation={navigation} />);
    expect(screen.getByLabelText('Compare miners')).toBeTruthy();
  });

  it('enters selection mode when Compare is pressed', async () => {
    useMinerStore.setState({
      miners: [makeMiner()],
    });
    await render(<DashboardScreen navigation={navigation} />);
    const btn = await screen.findByLabelText('Compare miners');
    fireEvent.press(btn);
    expect(await screen.findByLabelText('Cancel selection')).toBeTruthy();
  });

  it('shows selection count in action bar', async () => {
    useMinerStore.setState({
      miners: [makeMiner({ id: 'm1', name: 'Miner1' }), makeMiner({ id: 'm2', name: 'Miner2' })],
    });
    await render(<DashboardScreen navigation={navigation} />);
    const btn = await screen.findByLabelText('Compare miners');
    fireEvent.press(btn);
    expect(await screen.findByText('comparison.nSelected')).toBeTruthy();
  });

  it('toggles miner selection on press in selection mode', async () => {
    useMinerStore.setState({
      miners: [makeMiner({ id: 'm1', name: 'Miner1' })],
    });
    await render(<DashboardScreen navigation={navigation} />);
    const btn = await screen.findByLabelText('Compare miners');
    fireEvent.press(btn);
    const [, miner1] = await screen.findAllByText('Miner1');
    fireEvent.press(miner1);
    expect(await screen.findByText('comparison.compare')).toBeTruthy();
  });

  it('Compare button is disabled with fewer than 2 miners selected', async () => {
    useMinerStore.setState({
      miners: [makeMiner()],
    });
    await render(<DashboardScreen navigation={navigation} />);
    const btn = await screen.findByLabelText('Compare miners');
    fireEvent.press(btn);
    const compareBtn = await screen.findByLabelText('Compare');
    await waitFor(() => {
      expect(compareBtn.props.accessibilityState.disabled).toBe(true);
    });
  });

  it('navigates to MinerComparison with selected miner ids', async () => {
    useMinerStore.setState({
      miners: [makeMiner({ id: 'm1', name: 'Miner1' }), makeMiner({ id: 'm2', name: 'Miner2' })],
    });
    await render(<DashboardScreen navigation={navigation} />);
    const btn = await screen.findByLabelText('Compare miners');
    fireEvent.press(btn);
    const [, miner1] = await screen.findAllByText('Miner1');
    fireEvent.press(miner1);
    const [, miner2] = await screen.findAllByText('Miner2');
    fireEvent.press(miner2);
    const compareAction = await screen.findByText('comparison.compare');
    fireEvent.press(compareAction);
    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith('MinerComparison', {
        minerIds: ['m1', 'm2'],
      });
    });
  });

  it('Cancel clears selection and exits selection mode', async () => {
    useMinerStore.setState({
      miners: [makeMiner({ id: 'm1', name: 'Miner1' })],
    });
    await render(<DashboardScreen navigation={navigation} />);
    const btn = await screen.findByLabelText('Compare miners');
    fireEvent.press(btn);
    const [, miner1] = await screen.findAllByText('Miner1');
    fireEvent.press(miner1);
    expect(await screen.findByLabelText('Cancel selection')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Cancel selection'));
    expect(await screen.findByLabelText('Compare miners')).toBeTruthy();
  });
});

describe('batch operations', () => {
  it('shows batch action buttons in selection mode', async () => {
    useMinerStore.setState({
      miners: [makeMiner()],
    });
    await render(<DashboardScreen navigation={navigation} />);
    fireEvent.press(await screen.findByLabelText('Compare miners'));
    expect(await screen.findByLabelText('Batch group')).toBeTruthy();
    expect(await screen.findByLabelText('Batch wallet')).toBeTruthy();
    expect(await screen.findByLabelText('Batch delete')).toBeTruthy();
  });

  it('calls setMinerGroup when group is assigned via batch', async () => {
    const mockSetGroup = jest.fn();
    useMinerStore.setState({
      miners: [makeMiner({ id: 'm1', name: 'Miner1' }), makeMiner({ id: 'm2', name: 'Miner2' })],
      setMinerGroup: mockSetGroup,
    });
    const promptSpy = jest.spyOn(Alert, 'prompt').mockImplementation(() => {});
    await render(<DashboardScreen navigation={navigation} />);
    fireEvent.press(await screen.findByLabelText('Compare miners'));
    fireEvent.press((await screen.findAllByText('Miner1'))[1]);
    fireEvent.press((await screen.findAllByText('Miner2'))[1]);
    fireEvent.press(await screen.findByLabelText('Batch group'));
    const promptArgs = promptSpy.mock.calls[0];
    const okButton = promptArgs?.[2]?.find((b: any) => b.text === 'common.ok');
    okButton?.onPress?.('Rack-A');
    await waitFor(() => {
      expect(mockSetGroup).toHaveBeenCalledTimes(2);
    });
    promptSpy.mockRestore();
  });

  it('calls setMinerWallet when wallet is assigned via batch picker', async () => {
    const mockSetWallet = jest.fn();
    const { loadWallets } = require('../src/db/database');
    (loadWallets as jest.Mock).mockResolvedValue([
      { id: 'w1', name: 'Test Wallet', color: '#f00' },
    ]);
    useMinerStore.setState({
      miners: [makeMiner({ id: 'm1', name: 'Miner1' }), makeMiner({ id: 'm2', name: 'Miner2' })],
      setMinerWallet: mockSetWallet,
    });
    await render(<DashboardScreen navigation={navigation} />);
    fireEvent.press(await screen.findByLabelText('Compare miners'));
    fireEvent.press((await screen.findAllByText('Miner1'))[1]);
    fireEvent.press((await screen.findAllByText('Miner2'))[1]);
    fireEvent.press(await screen.findByLabelText('Batch wallet'));
    expect(await screen.findByLabelText('Assign wallet: Test Wallet')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Assign wallet: Test Wallet'));
    await waitFor(() => {
      expect(mockSetWallet).toHaveBeenNthCalledWith(1, 'm1', 'w1');
      expect(mockSetWallet).toHaveBeenNthCalledWith(2, 'm2', 'w1');
    });
  });

  it('calls removeMiner for each selected miner on batch delete', async () => {
    const mockRemoveMiner = jest.fn();
    const mockShowUndo = jest.fn();
    useMinerStore.setState({
      miners: [makeMiner({ id: 'm1', name: 'Miner1' }), makeMiner({ id: 'm2', name: 'Miner2' })],
      removeMiner: mockRemoveMiner,
    });
    const { useToastStore } = require('../src/store/toast');
    useToastStore.setState({ showUndo: mockShowUndo });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<DashboardScreen navigation={navigation} />);
    fireEvent.press(await screen.findByLabelText('Compare miners'));
    fireEvent.press((await screen.findAllByText('Miner1'))[1]);
    fireEvent.press((await screen.findAllByText('Miner2'))[1]);
    fireEvent.press(await screen.findByLabelText('Batch delete'));
    const alertArgs = alertSpy.mock.calls[0];
    const deleteButton = alertArgs?.[2]?.find((b: any) => b.text === 'common.delete');
    deleteButton?.onPress?.();
    await waitFor(() => {
      expect(mockShowUndo).toHaveBeenCalledTimes(2);
    });
    alertSpy.mockRestore();
  });
});

it('shows sort chips and sorts by hashrate', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({
        id: 'm1',
        name: 'MinerA',
        status: { hashRate: 100, hashRateUnit: 'GH/s', power: 12, temperature: 45 },
      }),
      makeMiner({
        id: 'm2',
        name: 'MinerB',
        status: { hashRate: 500, hashRateUnit: 'GH/s', power: 12, temperature: 45 },
      }),
    ],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  expect(r.getByText('Sort:')).toBeTruthy();
  await fireEvent.press(r.getByLabelText('Sort by hashrate'));
  expect(r.getAllByText(/MinerA|MinerB/).length).toBeGreaterThanOrEqual(2);
});

it('shows sort chips and sorts by temp', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({
        id: 'm1',
        name: 'MinerA',
        status: { hashRate: 500, hashRateUnit: 'GH/s', power: 12, temperature: 30 },
      }),
      makeMiner({
        id: 'm2',
        name: 'MinerB',
        status: { hashRate: 500, hashRateUnit: 'GH/s', power: 12, temperature: 60 },
      }),
    ],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Sort by temp'));
  expect(r.getAllByText(/MinerA|MinerB/).length).toBeGreaterThanOrEqual(2);
});

it('groups miners by location', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Loc1Miner', location: 'Home' }),
      makeMiner({ id: 'm2', name: 'Loc2Miner', location: 'Office' }),
    ],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByText('📍 Loc'));
  expect(r.getByText('Home')).toBeTruthy();
  expect(r.getByText('Office')).toBeTruthy();
});

it('groups miners by tag', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Tag1Miner', tags: ['gpu'] }),
      makeMiner({ id: 'm2', name: 'Tag2Miner', tags: ['asic'] }),
    ],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByText('📍 Loc'));
  await fireEvent.press(r.getByText('🏷️ Tag'));
  expect(r.getAllByText(/gpu/).length).toBeGreaterThanOrEqual(1);
  expect(r.getAllByText(/asic/).length).toBeGreaterThanOrEqual(1);
});

it('restores saved section visibility from DB', async () => {
  const { getSetting: mockGetSetting } = jest.requireMock('../src/db/database');
  mockGetSetting.mockImplementation((key: string) => {
    if (key === 'dashboard_sections') return Promise.resolve(JSON.stringify({ sort: false }));
    if (key === 'kiosk_mode') return Promise.resolve(null);
    if (key === 'power_cost') return Promise.resolve(null);
    return Promise.resolve(null);
  });
  useMinerStore.setState({
    miners: [makeMiner()],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  expect(r.queryByText('Sort:')).toBeNull();
});

it('filters miners by location chip', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', location: 'Home' }),
      makeMiner({ id: 'm2', name: 'Miner2', location: 'Office' }),
    ],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  expect(r.getAllByLabelText(/Filter by location:/).length).toBe(2);
  await fireEvent.press(r.getByLabelText('Filter by location: Home'));
  expect(r.getAllByText('Miner1').length).toBeGreaterThanOrEqual(1);
  await waitFor(() => {
    expect(r.queryAllByText('Miner2').length).toBe(0);
  });
});

it('toggles location filter off on second press', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', location: 'Home' }),
      makeMiner({ id: 'm2', name: 'Miner2', location: 'Office' }),
    ],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Filter by location: Home'));
  await waitFor(() => {
    expect(r.queryAllByText('Miner2').length).toBe(0);
  });
  await fireEvent.press(r.getByLabelText('Filter by location: Home'));
  await waitFor(() => {
    expect(r.getAllByText('Miner1').length).toBeGreaterThanOrEqual(1);
    expect(r.getAllByText('Miner2').length).toBeGreaterThanOrEqual(1);
  });
});

it('filters miners by tag chip', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', tags: ['gpu'] }),
      makeMiner({ id: 'm2', name: 'Miner2', tags: ['asic'] }),
    ],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Filter by tag: gpu'));
  expect(r.getAllByText('Miner1').length).toBeGreaterThanOrEqual(1);
  await waitFor(() => {
    expect(r.queryAllByText('Miner2').length).toBe(0);
  });
});

it('toggles tag filter off on second press', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', tags: ['gpu'] }),
      makeMiner({ id: 'm2', name: 'Miner2', tags: ['asic'] }),
    ],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Filter by tag: gpu'));
  await waitFor(() => {
    expect(r.queryAllByText('Miner2').length).toBe(0);
  });
  await fireEvent.press(r.getByLabelText('Filter by tag: gpu'));
  await waitFor(() => {
    expect(r.getAllByText('Miner1').length).toBeGreaterThanOrEqual(1);
    expect(r.getAllByText('Miner2').length).toBeGreaterThanOrEqual(1);
  });
});

it('collapse group header hides miners in that group', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', location: 'Home' }),
      makeMiner({ id: 'm2', name: 'Miner2', location: 'Home' }),
    ],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByText('📍 Loc'));
  const header = r.getByLabelText('Home group, 2 miners');
  expect(r.queryByText('▶')).toBeNull();
  await fireEvent.press(header);
  await waitFor(() => {
    expect(r.getByText('▶')).toBeTruthy();
  });
  await waitFor(() => {
    expect(r.queryByLabelText('Miner1, online, 500.0 GH/s')).toBeNull();
    expect(r.queryByLabelText('Miner2, online, 500.0 GH/s')).toBeNull();
  });
});

it('expand collapsed group shows miners again', async () => {
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', location: 'Home' }),
      makeMiner({ id: 'm2', name: 'Miner2', location: 'Home' }),
    ],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByText('📍 Loc'));
  await fireEvent.press(r.getByLabelText('Home group, 2 miners'));
  await waitFor(() => {
    expect(r.getByText('▶')).toBeTruthy();
  });
  await fireEvent.press(r.getByLabelText('Home group, 2 miners'));
  await waitFor(() => {
    expect(r.getByText('▼')).toBeTruthy();
  });
  await waitFor(() => {
    expect(r.getByLabelText('Miner1, online, 500.0 GH/s')).toBeTruthy();
    expect(r.getByLabelText('Miner2, online, 500.0 GH/s')).toBeTruthy();
  });
});

it('export button calls exportAllData', async () => {
  useMinerStore.setState({
    miners: [makeMiner()],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Export data'));
  const { exportAllData } = jest.requireMock('../src/utils/export');
  expect(exportAllData).toHaveBeenCalledTimes(1);
});

it('theme button cycles mode', async () => {
  useMinerStore.setState({
    miners: [makeMiner()],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Switch theme'));
  const { setThemeMode } = jest.requireMock('../src/theme');
  expect(setThemeMode).toHaveBeenCalledWith('neon');
});

it('deselects miner on second tap in selection mode', async () => {
  useMinerStore.setState({
    miners: [makeMiner({ id: 'm1', name: 'Miner1' }), makeMiner({ id: 'm2', name: 'Miner2' })],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Compare miners'));
  const minerCards = await r.findAllByText('Miner1');
  await fireEvent.press(minerCards[minerCards.length - 1]);
  await waitFor(() => {
    expect(r.getByText('comparison.nSelected')).toBeTruthy();
  });
  const minerCards2 = await r.findAllByText('Miner1');
  await fireEvent.press(minerCards2[minerCards2.length - 1]);
  await waitFor(() => {
    expect(r.getByLabelText('Compare').props.accessibilityState.disabled).toBe(true);
  });
});

it('batch Remove Group clears groups on selected miners', async () => {
  const mockSetGroup = jest.fn();
  const promptSpy = jest.spyOn(Alert, 'prompt').mockImplementation((...args) => {});
  useMinerStore.setState({
    miners: [makeMiner({ id: 'm1', name: 'Miner1' }), makeMiner({ id: 'm2', name: 'Miner2' })],
    setMinerGroup: mockSetGroup,
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Compare miners'));
  await fireEvent.press((await r.findAllByText('Miner1'))[1]);
  await fireEvent.press((await r.findAllByText('Miner2'))[1]);
  await fireEvent.press(r.getByLabelText('Batch group'));
  const promptArgs = promptSpy.mock.calls[0];
  const removeBtn = promptArgs?.[2]?.find((b: any) => b.text === 'dashboard.removeGroup');
  removeBtn?.onPress?.();
  await waitFor(() => {
    expect(mockSetGroup).toHaveBeenCalledWith('m1', undefined);
    expect(mockSetGroup).toHaveBeenCalledWith('m2', undefined);
  });
  promptSpy.mockRestore();
});

describe('kiosk mode', () => {
  it('renders exit kiosk button when kiosk mode is enabled', async () => {
    const { getSetting } = jest.requireMock('../src/db/database');
    (getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'kiosk_mode') return Promise.resolve('true');
      if (key === 'dashboard_sections') return Promise.resolve(null);
      if (key === 'power_cost') return Promise.resolve(null);
      return Promise.resolve(null);
    });
    useMinerStore.setState({
      miners: [makeMiner()],
    });
    const r = await render(<DashboardScreen navigation={navigation} />);
    expect(r.getByLabelText('Exit kiosk mode')).toBeTruthy();
  });

  it('kiosk exit alert calls setSetting', async () => {
    const { getSetting } = jest.requireMock('../src/db/database');
    (getSetting as jest.Mock).mockImplementation((key: string) => {
      if (key === 'kiosk_mode') return Promise.resolve('true');
      if (key === 'dashboard_sections') return Promise.resolve(null);
      if (key === 'power_cost') return Promise.resolve(null);
      return Promise.resolve(null);
    });
    useMinerStore.setState({
      miners: [makeMiner()],
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = await render(<DashboardScreen navigation={navigation} />);
    await fireEvent.press(r.getByLabelText('Exit kiosk mode'));
    const alertArgs = alertSpy.mock.calls[0];
    const exitButton = alertArgs?.[2]?.find((b: any) => b.text === 'Exit');
    exitButton?.onPress?.();
    const { setSetting } = jest.requireMock('../src/db/database');
    expect(setSetting).toHaveBeenCalledWith('kiosk_mode', 'false');
    alertSpy.mockRestore();
  });
});

describe('pool details', () => {
  it('renders pool section when miners have pool info', async () => {
    useMinerStore.setState({
      miners: [
        makeMiner({
          status: {
            hashRate: 500,
            hashRateUnit: 'GH/s',
            power: 12,
            temperature: 45,
            pool: 'stratum+tcp://pool.example.com:3333',
            sharesAccepted: 10,
            sharesRejected: 2,
            poolResponseTime: 45,
          },
        }),
      ],
    });
    const r = await render(<DashboardScreen navigation={navigation} />);
    expect(r.getByLabelText(/pool details/)).toBeTruthy();
  });

  it('expands pool to show miner shares', async () => {
    useMinerStore.setState({
      miners: [
        makeMiner({
          id: 'm1',
          name: 'PoolMiner',
          status: {
            hashRate: 500,
            hashRateUnit: 'GH/s',
            power: 12,
            temperature: 45,
            pool: 'stratum+tcp://pool.example.com:3333',
            sharesAccepted: 10,
            sharesRejected: 2,
            poolResponseTime: 45,
          },
        }),
      ],
    });
    const r = await render(<DashboardScreen navigation={navigation} />);
    await fireEvent.press(r.getByLabelText(/pool details/));
    expect(r.getAllByText('PoolMiner').length).toBeGreaterThanOrEqual(1);
    expect(r.getAllByText('+10').length).toBeGreaterThanOrEqual(1);
    expect(r.getAllByText('-2').length).toBeGreaterThanOrEqual(1);
  });
});

it('customize dashboard button opens customizer', async () => {
  useMinerStore.setState({
    miners: [makeMiner()],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Customize dashboard'));
  expect(r.getByText('Customize Dashboard')).toBeTruthy();
});

it('"No wallet" option clears wallet assignment in batch picker', async () => {
  const mockSetWallet = jest.fn();
  useMinerStore.setState({
    miners: [makeMiner({ id: 'm1', name: 'Miner1' })],
    setMinerWallet: mockSetWallet,
  });
  const { loadWallets } = require('../src/db/database');
  (loadWallets as jest.Mock).mockResolvedValue([{ id: 'w1', name: 'Test Wallet', color: '#f00' }]);
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Compare miners'));
  await fireEvent.press((await r.findAllByText('Miner1'))[1]);
  await fireEvent.press(r.getByLabelText('Batch wallet'));
  expect(r.getByLabelText('No wallet')).toBeTruthy();
  await fireEvent.press(r.getByLabelText('No wallet'));
  await waitFor(() => {
    expect(mockSetWallet).toHaveBeenCalledWith('m1', undefined);
  });
});

it('batch delete onConfirm calls removeMiner', async () => {
  const mockRemoveMiner = jest.fn();
  const capturedOptions: any[] = [];
  const mockShowUndo = jest.fn((opts: any) => capturedOptions.push(opts));
  useMinerStore.setState({
    miners: [makeMiner({ id: 'm1', name: 'Miner1' }), makeMiner({ id: 'm2', name: 'Miner2' })],
    removeMiner: mockRemoveMiner,
  });
  const { useToastStore } = require('../src/store/toast');
  useToastStore.setState({ showUndo: mockShowUndo });
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Compare miners'));
  await fireEvent.press((await r.findAllByText('Miner1'))[1]);
  await fireEvent.press((await r.findAllByText('Miner2'))[1]);
  await fireEvent.press(r.getByLabelText('Batch delete'));
  const alertArgs = alertSpy.mock.calls[0];
  const deleteButton = alertArgs?.[2]?.find((b: any) => b.text === 'common.delete');
  deleteButton?.onPress?.();
  expect(mockShowUndo).toHaveBeenCalledTimes(2);
  capturedOptions[0].onConfirm();
  expect(mockRemoveMiner).toHaveBeenCalledWith('m1');
  capturedOptions[1].onConfirm();
  expect(mockRemoveMiner).toHaveBeenCalledWith('m2');
  alertSpy.mockRestore();
});

it('long press miner card triggers delete toast', async () => {
  const mockShowUndo = jest.fn();
  const { useToastStore } = require('../src/store/toast');
  useToastStore.setState({ showUndo: mockShowUndo });
  useMinerStore.setState({
    miners: [makeMiner({ id: 'm1', name: 'Miner1' })],
  });
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const r = await render(<DashboardScreen navigation={navigation} />);
  const card = r.getByLabelText('Miner1, online, 500.0 GH/s');
  fireEvent(card, 'onLongPress');
  const alertArgs = alertSpy.mock.calls[0];
  const removeButton = alertArgs?.[2]?.find((b: any) => b.text === 'minerCard.remove');
  removeButton?.onPress?.();
  expect(mockShowUndo).toHaveBeenCalledWith(expect.objectContaining({ id: 'delete-m1' }));
  alertSpy.mockRestore();
});

it('customizer Done button closes the customizer', async () => {
  useMinerStore.setState({
    miners: [makeMiner()],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Customize dashboard'));
  expect(r.getByText('Customize Dashboard')).toBeTruthy();
  await fireEvent.press(r.getByText('Done'));
  expect(r.queryByText('Customize Dashboard')).toBeNull();
});

it('customizer Reset button resets sections to defaults', async () => {
  useMinerStore.setState({
    miners: [makeMiner()],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Customize dashboard'));
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await fireEvent.press(r.getByText('Reset to Defaults'));
  const alertArgs = alertSpy.mock.calls[0];
  const resetButton = alertArgs?.[2]?.find((b: any) => b.text === 'Reset');
  resetButton?.onPress?.();
  const { setSetting } = jest.requireMock('../src/db/database');
  expect(setSetting).toHaveBeenCalledWith('dashboard_sections', expect.any(String));
  const saved = JSON.parse(setSetting.mock.calls[0][1]);
  expect(saved.sort).toBe(true);
  alertSpy.mockRestore();
});

it('toggle section via customizer switch hides that section', async () => {
  useMinerStore.setState({
    miners: [makeMiner()],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Customize dashboard'));
  const switches = r.getAllByRole('switch');
  expect(switches.length).toBeGreaterThanOrEqual(1);
  await fireEvent(switches[0], 'onValueChange', false);
  await fireEvent.press(r.getByText('Done'));
  const { setSetting } = jest.requireMock('../src/db/database');
  const lastCall = setSetting.mock.calls[setSetting.mock.calls.length - 1];
  const saved = JSON.parse(lastCall[1]);
  expect(saved.earnings).toBe(false);
});

it('computes lastRefreshTime from miner lastSeen', async () => {
  const now = Date.now();
  useMinerStore.setState({
    miners: [
      makeMiner({ id: 'm1', name: 'Miner1', lastSeen: now - 5000 }),
      makeMiner({ id: 'm2', name: 'Miner2', lastSeen: now - 10000 }),
    ],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  expect(r.getByText('HashWatch')).toBeTruthy();
});

it('web Escape key exits selection mode', async () => {
  const origOS = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true, writable: true });
  const addEventListener = jest.fn();
  const removeEventListener = jest.fn();
  (globalThis as any).window = { addEventListener, removeEventListener };
  useMinerStore.setState({
    miners: [makeMiner()],
  });
  const r = await render(<DashboardScreen navigation={navigation} />);
  await fireEvent.press(r.getByLabelText('Compare miners'));
  expect(r.getByLabelText('Cancel selection')).toBeTruthy();
  const keydownCalls = addEventListener.mock.calls.filter((c: any) => c[0] === 'keydown');
  const handler = keydownCalls[keydownCalls.length - 1][1];
  handler({ key: 'Escape' });
  await waitFor(() => {
    expect(r.queryByLabelText('Cancel selection')).toBeNull();
  });
  Object.defineProperty(Platform, 'OS', { value: origOS, configurable: true, writable: true });
});
