import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NotificationSettingsScreen } from '../src/screens/NotificationSettingsScreen';
import { useNotificationSettingsStore } from '../src/store/notificationSettings';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    surfaceLight: '#1a1a24',
    text: '#e2e0ff',
    textDim: '#9694b0',
    textMuted: '#6b6a80',
    primary: '#6c63ff',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    border: '#2a2940',
  }),
}));

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/notifications', () => ({
  requestNotificationPermission: jest.fn().mockResolvedValue(true),
  sendMinerAlert: jest.fn().mockResolvedValue(undefined),
  DEFAULT_THRESHOLDS: {
    tempWarning: 70,
    tempCritical: 85,
    hashrateDropPercent: 50,
    offlineTimeoutMin: 5,
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  useNotificationSettingsStore.setState({
    thresholds: {
      tempWarning: 70,
      tempCritical: 85,
      hashrateDropPercent: 50,
      offlineTimeoutMin: 5,
    },
    channels: { push: true, email: false, webhook: false },
    quietHoursStart: 22,
    quietHoursEnd: 7,
    loaded: true,
    loadSettings: jest.fn().mockResolvedValue(undefined),
    updateThresholds: jest.fn(),
    toggleChannel: jest.fn(),
    setQuietHours: jest.fn(),
  });
});

async function renderScreen() {
  return render(<NotificationSettingsScreen />);
}

describe('NotificationSettingsScreen', () => {
  it('renders title', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('notificationSettings.title')).toBeTruthy();
  });

  it('renders threshold section', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('notificationSettings.thresholds')).toBeTruthy();
  });

  it('renders channel section', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('notificationSettings.channels')).toBeTruthy();
  });

  it('renders quiet hours section', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('notificationSettings.quietHours')).toBeTruthy();
  });

  it('renders test notification button', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('notificationSettings.testNotification')).toBeTruthy();
  });

  it('renders all channel labels', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('notificationSettings.channel_push')).toBeTruthy();
    expect(getByText('notificationSettings.channel_email')).toBeTruthy();
    expect(getByText('notificationSettings.channel_webhook')).toBeTruthy();
  });

  it('renders all threshold controls', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('notificationSettings.tempWarning')).toBeTruthy();
    expect(getByText('notificationSettings.tempCritical')).toBeTruthy();
    expect(getByText('notificationSettings.hashrateDrop')).toBeTruthy();
    expect(getByText('notificationSettings.offlineTimeout')).toBeTruthy();
  });

  it('renders time labels', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('notificationSettings.startTime')).toBeTruthy();
    expect(getByText('notificationSettings.endTime')).toBeTruthy();
  });

  it('returns null when not loaded', async () => {
    useNotificationSettingsStore.setState({ loaded: false } as any);
    const { toJSON } = await renderScreen();
    expect(toJSON()).toBeNull();
  });
});
