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

import { render, screen, act, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { AddMinerScreen } from '../src/screens/AddMinerScreen';
import { setTheme, darkTheme } from '../src/theme';
import { useMinerStore } from '../src/store/miners';
import { useSubscriptionStore } from '../src/store/subscription';

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const originalAddMiner = useMinerStore.getState().addMiner;
const originalCanAddMiner = useSubscriptionStore.getState().canAddMiner;

beforeEach(() => {
  setTheme(darkTheme);
  useSubscriptionStore.setState({
    tier: 'free',
    isPro: false,
    maxMiners: 999,
    initialized: true,
    loading: false,
    canAddMiner: originalCanAddMiner,
  });
  useMinerStore.setState({
    miners: [],
    initialized: true,
    loading: false,
    scanning: false,
    scanProgress: null,
    error: null,
    addMiner: originalAddMiner,
  });
  jest.clearAllMocks();
});

it('renders Add by IP section', async () => {
  await render(<AddMinerScreen navigation={navigation} />);
  expect(screen.getByText('addMiner.addByIp')).toBeTruthy();
  expect(screen.getByPlaceholderText('addMiner.ipPlaceholder')).toBeTruthy();
  expect(screen.getByPlaceholderText('addMiner.namePlaceholder')).toBeTruthy();
});

it('renders Scan Network section', async () => {
  await render(<AddMinerScreen navigation={navigation} />);
  expect(screen.getByText('addMiner.scanNetwork')).toBeTruthy();
  expect(screen.getByText('addMiner.findMiners')).toBeTruthy();
});

it('shows "or" divider', async () => {
  await render(<AddMinerScreen navigation={navigation} />);
  expect(screen.getByText('addMiner.or')).toBeTruthy();
});

it('shows Cancel Scan button while scanning', async () => {
  const { scanNetwork } = require('../src/discovery/localNetwork');
  let resolveScan: () => void;
  (scanNetwork as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      resolveScan = () => resolve([]);
    }),
  );

  await render(<AddMinerScreen navigation={navigation} />);
  await act(async () => {
    fireEvent.press(screen.getByText('addMiner.findMiners'));
  });
  expect(await screen.findByText('addMiner.cancelScan')).toBeTruthy();

  resolveScan!();
});

it('hides Cancel Scan after scan completes', async () => {
  const { scanNetwork } = require('../src/discovery/localNetwork');
  (scanNetwork as jest.Mock).mockResolvedValue([]);

  await render(<AddMinerScreen navigation={navigation} />);
  await act(async () => {
    fireEvent.press(screen.getByText('addMiner.findMiners'));
  });
  expect(screen.queryByText('addMiner.cancelScan')).toBeNull();
  expect(await screen.findByText('addMiner.findMiners')).toBeTruthy();
});

it('disables Add Miner button when IP is empty', async () => {
  await render(<AddMinerScreen navigation={navigation} />);
  const addBtn = screen.getByLabelText('Add Miner');
  expect(addBtn.props.accessibilityState.disabled).toBe(true);
});

it('shows pro limit error when adding beyond maxMiners', async () => {
  useSubscriptionStore.setState({ maxMiners: 0 });

  await render(<AddMinerScreen navigation={navigation} />);
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('IP address input'), '192.168.1.1');
  });
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Add Miner'));
  });
  expect(await screen.findByText(/addMiner.upgradePro/, {}, { timeout: 15000 })).toBeTruthy();
}, 20000);

it('shows error when addMiner throws', async () => {
  const addMinerMock = jest.fn().mockRejectedValue(new Error('Connection refused'));
  useMinerStore.setState({ addMiner: addMinerMock });

  await render(<AddMinerScreen navigation={navigation} />);
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('IP address input'), '192.168.1.1');
  });
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Add Miner'));
  });
  expect(await screen.findByText(/Connection refused/)).toBeTruthy();
});

it('cancels an active scan', async () => {
  const { scanNetwork } = require('../src/discovery/localNetwork');
  (scanNetwork as jest.Mock).mockImplementation(
    (_onProgress: unknown, _timeout: unknown, signal: AbortSignal) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    },
  );

  await render(<AddMinerScreen navigation={navigation} />);
  await act(async () => {
    fireEvent.press(screen.getByText('addMiner.findMiners'));
  });
  await act(async () => {
    fireEvent.press(await screen.findByText('addMiner.cancelScan'));
  });
  expect(await screen.findByText('addMiner.findMiners')).toBeTruthy();
});

it('shows error when scan fails', async () => {
  const { scanNetwork } = require('../src/discovery/localNetwork');
  (scanNetwork as jest.Mock).mockRejectedValue(new Error('Network error'));

  await render(<AddMinerScreen navigation={navigation} />);
  await act(async () => {
    fireEvent.press(screen.getByText('addMiner.findMiners'));
  });
  expect(await screen.findByText(/Network error/)).toBeTruthy();
});

it('displays discovered miners list', async () => {
  const { scanNetwork } = require('../src/discovery/localNetwork');
  (scanNetwork as jest.Mock).mockResolvedValue([
    { ip: '192.168.1.10', port: 80 },
    { ip: '192.168.1.20', port: 80 },
  ]);

  await render(<AddMinerScreen navigation={navigation} />);
  await act(async () => {
    fireEvent.press(screen.getByText('addMiner.findMiners'));
  });
  expect(await screen.findByText('addMiner.foundMiners')).toBeTruthy();
  expect(screen.getByLabelText('Add miner: 192.168.1.10')).toBeTruthy();
  expect(screen.getByLabelText('Add miner: 192.168.1.20')).toBeTruthy();
});

it('adds a discovered miner', async () => {
  const { scanNetwork } = require('../src/discovery/localNetwork');
  (scanNetwork as jest.Mock).mockResolvedValue([{ ip: '192.168.1.10', port: 80 }]);
  const addMinerMock = jest.fn().mockResolvedValue(undefined);
  useMinerStore.setState({ addMiner: addMinerMock });

  await render(<AddMinerScreen navigation={navigation} />);
  await act(async () => {
    fireEvent.press(screen.getByText('addMiner.findMiners'));
  });
  await act(async () => {
    fireEvent.press(await screen.findByLabelText('Add miner: 192.168.1.10'));
  });
  expect(addMinerMock).toHaveBeenCalledWith('192.168.1.10', 80);
  expect(navigation.goBack).toHaveBeenCalled();
});

it('shows pro limit error when adding discovered miner beyond max', async () => {
  useSubscriptionStore.setState({ maxMiners: 0 });
  const { scanNetwork } = require('../src/discovery/localNetwork');
  (scanNetwork as jest.Mock).mockResolvedValue([{ ip: '192.168.1.10', port: 80 }]);
  const addMinerMock = jest.fn().mockResolvedValue(undefined);
  useMinerStore.setState({ addMiner: addMinerMock });

  await render(<AddMinerScreen navigation={navigation} />);
  await act(async () => {
    fireEvent.press(screen.getByText('addMiner.findMiners'));
  });
  await act(async () => {
    fireEvent.press(await screen.findByLabelText('Add miner: 192.168.1.10'));
  });
  expect(await screen.findByText(/addMiner.upgradePro/)).toBeTruthy();
  expect(addMinerMock).not.toHaveBeenCalled();
});

it('shows scan progress bar during scan', async () => {
  const { scanNetwork } = require('../src/discovery/localNetwork');
  (scanNetwork as jest.Mock).mockImplementation(
    (onProgress: (f: number, s: number, t: number) => void) => {
      onProgress(3, 50, 254);
      return new Promise(() => {});
    },
  );

  await render(<AddMinerScreen navigation={navigation} />);
  await act(async () => {
    fireEvent.press(screen.getByText('addMiner.findMiners'));
  });
  expect(await screen.findByText(/addMiner.scanProgress/)).toBeTruthy();
});
