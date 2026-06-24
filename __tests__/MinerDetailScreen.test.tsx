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

jest.mock('../src/api/bitaxe', () => ({
  BitAxeClient: jest.fn().mockImplementation(() => ({
    restart: jest.fn().mockResolvedValue(true),
  })),
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

const mockShowUndo = jest.fn(({ onConfirm }: any) => {
  onConfirm();
});
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

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Share, Alert } from 'react-native';
import { MinerDetailScreen } from '../src/screens/MinerDetailScreen';
import { setTheme, darkTheme } from '../src/theme';
import { useMinerStore } from '../src/store/miners';

jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const route = { params: { minerId: 'm1' } };

const onlineMiner: any = {
  id: 'm1',
  name: 'TestMiner',
  ip: '192.168.1.100',
  port: 80,
  isOnline: true,
  info: { hostname: 'bitaxe-1234' },
  status: {
    hashRate: 500,
    hashRateUnit: 'GH/s',
    frequency: 450,
    temperature: 45,
    vrTemp: 38,
    voltage: 3200,
    current: 420,
    power: 12,
    coreVoltage: 800,
    fanRpm: 3200,
    fanSpeed: 80,
    sharesAccepted: 1500,
    sharesRejected: 12,
    uptimeSeconds: 86400,
    pool: 'stratum.solomining.io',
    poolPort: 3333,
    poolUser: 'test.worker',
    poolResponseTime: 45,
    bestDiff: 256,
    bestSessionDiff: 512,
  },
};

beforeEach(() => {
  setTheme(darkTheme);
  useMinerStore.setState({
    miners: [onlineMiner],
    initialized: true,
    loading: false,
    scanning: false,
    scanProgress: null,
    error: null,
  });
  useMinerStore.setState({ getSnapshots: jest.fn().mockResolvedValue([]) } as any);
  jest.clearAllMocks();
});

it('renders miner name and IP', async () => {
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  expect(screen.getAllByText('TestMiner').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('192.168.1.100').length).toBeGreaterThanOrEqual(1);
}, 30000);

it('shows LIVE badge', async () => {
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  expect(screen.getByText('minerDetail.live')).toBeTruthy();
});

it('shows hostname when available', async () => {
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  expect(screen.getByText('bitaxe-1234')).toBeTruthy();
});

it('renders stat widgets', async () => {
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  const sections = [
    'minerDetail.hashrate',
    'minerDetail.frequency',
    'minerDetail.bestDiff',
    'minerDetail.bestSession',
    'minerDetail.boardTemp',
    'minerDetail.voltage',
    'minerDetail.current',
    'minerDetail.power',
    'minerDetail.efficiency',
    'minerDetail.coreV',
    'minerDetail.fan',
    'minerDetail.accepted',
    'minerDetail.rejected',
    'minerDetail.uptime',
  ];
  for (const s of sections) {
    expect(screen.getByText(s)).toBeTruthy();
  }
});

it('shows pool information', async () => {
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  expect(screen.getByText(/stratum\.solomining\.io:3333/)).toBeTruthy();
  expect(screen.getByText('test.worker')).toBeTruthy();
  expect(screen.getByText(/45 ms/)).toBeTruthy();
});

it('shows hashrate history section', async () => {
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  expect(screen.getByText(/minerDetail.hashrateHistory/)).toBeTruthy();
});

it('shows Danger Zone with remove button', async () => {
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  expect(screen.getByText('minerDetail.removeMiner')).toBeTruthy();
});

it('shows confirm dialog when remove is tapped', async () => {
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  fireEvent.press(screen.getByText('minerDetail.removeMiner'));
  expect(await screen.findByText(/minerDetail.removeConfirm/)).toBeTruthy();
  expect(screen.getByText('minerDetail.yesRemove')).toBeTruthy();
});

it('shows offline state when miner has no status', async () => {
  const offlineMiner: any = {
    id: 'm2',
    name: 'OfflineMiner',
    ip: '192.168.1.200',
    port: 80,
    isOnline: false,
  };
  useMinerStore.setState({ miners: [offlineMiner] });
  const offlineRoute = { params: { minerId: 'm2' } };
  await render(<MinerDetailScreen route={offlineRoute} navigation={navigation} />);
  expect(screen.getByText('minerDetail.offline')).toBeTruthy();
  expect(screen.getByText('common.retry')).toBeTruthy();
});

it('shows not found state for unknown miner', async () => {
  const badRoute = { params: { minerId: 'nonexistent' } };
  await render(<MinerDetailScreen route={badRoute} navigation={navigation} />);
  expect(screen.getByText('minerDetail.notFound')).toBeTruthy();
  expect(screen.getByText('common.goBack')).toBeTruthy();
});

it('calls goBack when Go Back is pressed in not found state', async () => {
  const badRoute = { params: { minerId: 'nonexistent' } };
  await render(<MinerDetailScreen route={badRoute} navigation={navigation} />);
  fireEvent.press(screen.getByText('common.goBack'));
  expect(navigation.goBack).toHaveBeenCalled();
});

it('calls refreshMiner when Retry is pressed in offline state', async () => {
  const refreshMinerSpy = jest
    .spyOn(useMinerStore.getState(), 'refreshMiner')
    .mockResolvedValue(undefined);
  const offlineMiner: any = {
    id: 'm3',
    name: 'OfflineMiner2',
    ip: '10.0.0.1',
    port: 80,
    isOnline: false,
  };
  useMinerStore.setState({ miners: [offlineMiner] });
  const offlineRoute = { params: { minerId: 'm3' } };
  await render(<MinerDetailScreen route={offlineRoute} navigation={navigation} />);
  fireEvent.press(screen.getByText('common.retry'));
  expect(refreshMinerSpy).toHaveBeenCalledWith('m3');
  refreshMinerSpy.mockRestore();
});

it('shows Share Stats button and calls Share.share on press', async () => {
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  expect(screen.getByText('minerDetail.shareStats')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Share Stats'));
  await waitFor(() => {
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('TestMiner') }),
    );
  });
});

it('navigates back and removes miner after confirming remove', async () => {
  const removeMiner = jest.fn().mockResolvedValue(undefined);
  useMinerStore.setState({ removeMiner } as any);
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  fireEvent.press(screen.getByText('minerDetail.removeMiner'));
  await waitFor(() => expect(screen.getByText('minerDetail.yesRemove')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Yes, Remove'));
  await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  expect(removeMiner).toHaveBeenCalledWith('m1');
});

it('shows undo toast after removing miner', async () => {
  useMinerStore.setState({ removeMiner: jest.fn().mockResolvedValue(undefined) } as any);
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  fireEvent.press(screen.getByText('minerDetail.removeMiner'));
  await waitFor(() => expect(screen.getByText('minerDetail.yesRemove')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Yes, Remove'));
  await waitFor(() =>
    expect(mockShowUndo).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'minerDetail.minerRemoved',
      }),
    ),
  );
});

it('shows wallet picker with No wallet option and selects none', async () => {
  const mockSetMinerWallet = jest.fn();
  useMinerStore.setState({ setMinerWallet: mockSetMinerWallet } as any);
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  const assignButton = screen.getByLabelText('Assign wallet');
  fireEvent.press(assignButton);
  expect(await screen.findByText('common.none')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('No wallet'));
  expect(mockSetMinerWallet).toHaveBeenCalledWith('m1', undefined);
});

it('shows group tag input and updates on change', async () => {
  jest.useFakeTimers();
  const mockSetMinerGroup = jest.fn();
  useMinerStore.setState({ setMinerGroup: mockSetMinerGroup } as any);
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  const input = screen.getByLabelText('Group tag input');
  fireEvent.changeText(input, 'lab-1');
  jest.advanceTimersByTime(600);
  expect(mockSetMinerGroup).toHaveBeenCalledWith('m1', 'lab-1');
  jest.useRealTimers();
});

it('shows efficiency trend when snapshots exist', async () => {
  useMinerStore.setState({
    getSnapshots: jest.fn().mockResolvedValue([
      { hashRate: 100, hashRateUnit: 'GH/s', timestamp: Date.now() - 60000 },
      { hashRate: 200, hashRateUnit: 'GH/s', timestamp: Date.now() },
    ] as any),
  } as any);
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  await waitFor(() => {
    expect(screen.getByText(/minerDetail\.efficiencyTrend/)).toBeTruthy();
  });
});

it('shows restart miner button and calls restart API', async () => {
  const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<MinerDetailScreen route={route} navigation={navigation} />);
  fireEvent.press(screen.getByLabelText('Restart Miner'));
  await waitFor(() => {
    expect(mockAlert).toHaveBeenCalledWith(
      'minerDetail.restartSent',
      'minerDetail.restartSentBody',
    );
  });
  mockAlert.mockRestore();
});
