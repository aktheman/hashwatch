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
import { Alert } from 'react-native';
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
  expect(screen.getByText('dashboard.noMiners')).toBeTruthy();
  expect(screen.getByText('dashboard.addMiner')).toBeTruthy();
  expect(screen.getByText('dashboard.scanNetwork')).toBeTruthy();
});

it('shows loading state', async () => {
  useMinerStore.setState({ loading: true, initialized: false });
  await render(<DashboardScreen navigation={navigation} />);
  expect(screen.queryByText('dashboard.noMiners')).toBeNull();
});

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
    const miner1 = await screen.findByText('Miner1');
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
    const miner1 = await screen.findByText('Miner1');
    fireEvent.press(miner1);
    const miner2 = await screen.findByText('Miner2');
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
    const miner1 = await screen.findByText('Miner1');
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
    fireEvent.press(await screen.findByText('Miner1'));
    fireEvent.press(await screen.findByText('Miner2'));
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
    fireEvent.press(await screen.findByText('Miner1'));
    fireEvent.press(await screen.findByText('Miner2'));
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
    fireEvent.press(await screen.findByText('Miner1'));
    fireEvent.press(await screen.findByText('Miner2'));
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
