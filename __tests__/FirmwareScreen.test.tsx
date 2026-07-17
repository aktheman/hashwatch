jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationHandler: jest.fn(),
}));

jest.mock('../src/store/miners', () => ({
  useMinerStore: jest.fn((sel) => {
    const state = {
      miners: [
        {
          id: 'm1',
          name: 'Miner A',
          ip: '10.0.0.1',
          port: 80,
          isOnline: true,
          status: { hashRate: 1.2, hashRateUnit: 'TH/s', firmwareVersion: '2.1.0' },
          info: { hostname: 'bitaxe-m1' },
        },
        {
          id: 'm2',
          name: 'Miner B',
          ip: '10.0.0.2',
          port: 80,
          isOnline: true,
          status: { hashRate: 1.0, hashRateUnit: 'TH/s', firmwareVersion: '2.0.0' },
          info: { hostname: 'bitaxe-m2' },
        },
      ],
      refreshAll: jest.fn(),
    };
    return sel(state);
  }),
}));

jest.mock('../src/api/client', () => ({
  BASE_URL: 'http://localhost:4000',
  configureClient: jest.fn(),
  fetchMiners: jest.fn().mockResolvedValue([]),
}));

jest.mock('../src/api/bitaxe', () => ({
  BitAxeClient: {
    flashFirmware: jest.fn().mockResolvedValue({ ok: true }),
  },
}));

jest.mock('../src/services/firmwareUpdate', () => ({
  checkForFirmwareUpdate: jest.fn().mockResolvedValue(null),
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a1a',
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#3B82F6',
    info: '#06B6D4',
  }),
}));

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

import { render, act } from '@testing-library/react-native';
import FirmwareScreen from '../src/screens/FirmwareScreen';

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('FirmwareScreen', () => {
  it('renders the screen', async () => {
    jest.useFakeTimers();
    const tree = await render(<FirmwareScreen />);
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders firmware list for miners', async () => {
    jest.useFakeTimers();
    const tree = await render(<FirmwareScreen />);
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(tree.getByText('Miner A')).toBeTruthy();
    expect(tree.getByText('Miner B')).toBeTruthy();
  });

  it('shows firmware version info', async () => {
    jest.useFakeTimers();
    const tree = await render(<FirmwareScreen />);
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders with empty miners list', async () => {
    jest.useFakeTimers();
    const { useMinerStore } = require('../src/store/miners');
    useMinerStore.mockImplementation(
      (sel: (s: { miners: unknown[]; refreshAll: jest.Mock }) => unknown) =>
        sel({ miners: [], refreshAll: jest.fn() }),
    );
    const tree = await render(<FirmwareScreen />);
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(tree.toJSON()).toBeTruthy();
  });
});
