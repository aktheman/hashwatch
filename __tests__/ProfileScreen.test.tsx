jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-token' }),
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
}));

jest.mock('../src/store/auth', () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = {
      token: 'test-token',
      userId: 'user-1',
      email: 'test@example.com',
      logout: mockLogout,
    };
    return selector ? selector(state) : state;
  },
  queueSetting: jest.fn(),
}));

jest.mock('../src/store/miners', () => ({
  useMinerStore: (selector?: (state: any) => any) => {
    const state = {
      miners: [
        { id: '1', name: 'Miner 1', ip: '192.168.1.10', status: 'online' },
        { id: '2', name: 'Miner 2', ip: '192.168.1.11', status: 'offline' },
        { id: '3', name: 'Miner 3', ip: '192.168.1.12', status: 'online' },
      ],
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('../src/store/subscription', () => ({
  useSubscriptionStore: (selector?: (state: any) => any) => {
    const state = {
      isPro: true,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    text: '#e2e0ff',
    textDim: '#9694b0',
    primary: '#6c63ff',
    success: '#22c55e',
    danger: '#ef4444',
    border: '#2a2940',
    surfaceLight: '#1a1a24',
  }),
}));

jest.mock('../src/api/client', () => ({
  putSetting: jest.fn(),
}));

jest.mock('../src/utils/haptics', () => ({
  light: jest.fn(),
  medium: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    setOptions: jest.fn(),
  }),
}));

const mockLogout = jest.fn().mockResolvedValue(undefined);

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import ProfileScreen from '../src/screens/ProfileScreen';

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders profile screen', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByTestId('profile-screen')).toBeTruthy();
});

it('displays user email', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByText('test@example.com')).toBeTruthy();
});

it('displays Pro badge', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByText('settings.pro')).toBeTruthy();
});

it('shows miner stats', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
  expect(screen.getByText('1')).toBeTruthy();
});

it('shows change password section', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByText('profile.changePassword')).toBeTruthy();
});

it('shows sign out button', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByText('profile.signOut')).toBeTruthy();
});

it('shows delete account button', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByText('profile.deleteAccount')).toBeTruthy();
});

it('shows password inputs', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByLabelText('profile.currentPassword')).toBeTruthy();
  expect(screen.getByLabelText('profile.newPassword')).toBeTruthy();
  expect(screen.getByLabelText('profile.confirmPassword')).toBeTruthy();
});

it('shows danger zone section', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByText('profile.dangerZone')).toBeTruthy();
});

it('shows update password button', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByText('profile.updatePassword')).toBeTruthy();
});
