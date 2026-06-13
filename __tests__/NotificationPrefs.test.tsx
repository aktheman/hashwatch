import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { NotificationPrefs } from '../src/components/NotificationPrefs';

const mockGetPrefs = jest.fn();
let mockToken: string | null = 'test-token';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
  }),
}));

jest.mock('../src/api/client', () => ({
  getNotificationPrefs: () => mockGetPrefs(),
  setNotificationPref: jest.fn(),
}));

jest.mock('../src/store/auth', () => ({
  useAuthStore: (selector: (s: { token: string | null }) => unknown) =>
    selector({ token: mockToken }),
}));

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockToken = 'test-token';
  mockGetPrefs.mockResolvedValue({
    offline: true,
    online: false,
    hot: true,
    hashrate_drop: true,
    pool_lost: false,
    long_uptime: true,
  });
});

describe('NotificationPrefs', () => {
  it('renders notification toggles when authenticated', async () => {
    await render(<NotificationPrefs minerId="miner-1" />);
    expect(await screen.findByText('Notifications')).toBeTruthy();
    expect(await screen.findByText('Offline')).toBeTruthy();
    expect(await screen.findByText('High Temperature')).toBeTruthy();
  });

  it('renders notification toggles when not authenticated (local prefs)', async () => {
    mockToken = null;
    await render(<NotificationPrefs minerId="miner-1" />);
    expect(await screen.findByText('Notifications')).toBeTruthy();
    expect(await screen.findByText('Offline')).toBeTruthy();
  });
});
