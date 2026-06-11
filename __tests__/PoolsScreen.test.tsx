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
}));

jest.mock('../src/api/client', () => ({
  BASE_URL: 'http://localhost:4000',
  configureClient: jest.fn(),
  pushStats: jest.fn(),
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
import { PoolsScreen } from '../src/screens/PoolsScreen';
import { setTheme, darkTheme } from '../src/theme';
import { useMinerStore } from '../src/store/miners';

const navigation = { navigate: jest.fn() };

beforeEach(() => {
  setTheme(darkTheme);
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

it('renders empty state when no miners', async () => {
  await render(<PoolsScreen navigation={navigation} />);
  expect(screen.getByText('Pools')).toBeTruthy();
  expect(screen.getByText('No Pools Yet')).toBeTruthy();
});

it('renders pool groups when miners have pool data', async () => {
  useMinerStore.setState({
    miners: [
      {
        id: 'm1',
        name: 'Miner 1',
        ip: '192.168.1.1',
        port: 80,
        isOnline: true,
        info: null,
        lastSeen: Date.now(),
        addedAt: Date.now(),
        status: {
          hashRate: 500,
          hashRateUnit: 'GH/s',
          temperature: 45,
          vrTemp: 0,
          voltage: 3200,
          current: 420,
          power: 12,
          sharesAccepted: 100,
          sharesRejected: 2,
          bestDiff: '1M',
          bestSessionDiff: '2M',
          uptimeSeconds: 3600,
          coreVoltage: 800,
          frequency: 400,
          fanSpeed: 50,
          fanRpm: 3000,
          pool: 'stratum.example.com',
          poolPort: 3333,
          poolUser: 'worker.1',
          poolResponseTime: 45,
        },
      },
      {
        id: 'm2',
        name: 'Miner 2',
        ip: '192.168.1.2',
        port: 80,
        isOnline: true,
        info: null,
        lastSeen: Date.now(),
        addedAt: Date.now(),
        status: {
          hashRate: 400,
          hashRateUnit: 'GH/s',
          temperature: 50,
          vrTemp: 0,
          voltage: 3200,
          current: 380,
          power: 10,
          sharesAccepted: 50,
          sharesRejected: 1,
          bestDiff: '1M',
          bestSessionDiff: '2M',
          uptimeSeconds: 7200,
          coreVoltage: 800,
          frequency: 400,
          fanSpeed: 40,
          fanRpm: 2800,
          pool: 'stratum.example.com',
          poolPort: 3333,
          poolUser: 'worker.1',
          poolResponseTime: 60,
        },
      },
    ] as any[],
  });
  await render(<PoolsScreen navigation={navigation} />);
  expect(screen.getByText('stratum.example.com:3333')).toBeTruthy();
  expect(screen.getByText('worker.1')).toBeTruthy();
  expect(screen.getByText('Miner 1')).toBeTruthy();
  expect(screen.getByText('Miner 2')).toBeTruthy();
});

it('groups miners by pool', async () => {
  useMinerStore.setState({
    miners: [
      {
        id: 'm1',
        name: 'Miner 1',
        ip: '192.168.1.1',
        port: 80,
        isOnline: true,
        info: null,
        lastSeen: Date.now(),
        addedAt: Date.now(),
        status: {
          hashRate: 500,
          hashRateUnit: 'GH/s',
          temperature: 45,
          vrTemp: 0,
          voltage: 3200,
          current: 420,
          power: 12,
          sharesAccepted: 100,
          sharesRejected: 2,
          bestDiff: '1M',
          bestSessionDiff: '2M',
          uptimeSeconds: 3600,
          coreVoltage: 800,
          frequency: 400,
          fanSpeed: 50,
          fanRpm: 3000,
          pool: 'pool.a.com',
          poolPort: 3333,
          poolUser: 'user.1',
          poolResponseTime: 45,
        },
      },
      {
        id: 'm2',
        name: 'Miner 2',
        ip: '192.168.1.2',
        port: 80,
        isOnline: true,
        info: null,
        lastSeen: Date.now(),
        addedAt: Date.now(),
        status: {
          hashRate: 400,
          hashRateUnit: 'GH/s',
          temperature: 50,
          vrTemp: 0,
          voltage: 3200,
          current: 380,
          power: 10,
          sharesAccepted: 50,
          sharesRejected: 1,
          bestDiff: '1M',
          bestSessionDiff: '2M',
          uptimeSeconds: 7200,
          coreVoltage: 800,
          frequency: 400,
          fanSpeed: 40,
          fanRpm: 2800,
          pool: 'pool.b.com',
          poolPort: 3333,
          poolUser: 'user.2',
          poolResponseTime: 60,
        },
      },
    ] as any[],
  });
  await render(<PoolsScreen navigation={navigation} />);
  expect(screen.getByText('pool.a.com:3333')).toBeTruthy();
  expect(screen.getByText('pool.b.com:3333')).toBeTruthy();
});
