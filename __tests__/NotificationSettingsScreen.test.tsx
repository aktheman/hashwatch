import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { NotificationSettingsScreen } from '../src/screens/NotificationSettingsScreen';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    surfaceLight: '#1a1a24',
    border: '#2a2940',
    text: '#e2e0ff',
    textDim: '#9694b0',
    textMuted: '#6b6990',
    primary: '#6c63ff',
    primaryDark: '#5a52d5',
    accent: '#6c63ff',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#06b6d4',
    glow: '#6c63ff',
    glowSuccess: '#22c55e',
    glowDanger: '#ef4444',
    glowWarning: '#f59e0b',
  }),
}));

jest.mock('../src/utils/haptics', () => ({
  light: jest.fn(),
  medium: jest.fn(),
  heavy: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  selection: jest.fn(),
}));

const mockLoadSettings = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/services/notifications', () => ({
  requestNotificationPermission: jest.fn().mockResolvedValue(true),
  sendMinerAlert: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/api/client', () => ({
  sendTestPush: jest.fn().mockResolvedValue({ ok: true, sentTo: 1 }),
}));

const mockProfitState: { enabled: boolean; dropPercent: number } = {
  enabled: false,
  dropPercent: 5,
};

jest.mock('../src/services/profitAlerts', () => ({
  getProfitAlertSettings: jest.fn().mockResolvedValue(mockProfitState),
  setProfitAlertSettings: jest.fn().mockResolvedValue(undefined),
}));

let mockRequestPermission: jest.Mock;
let mockSendMinerAlert: jest.Mock;

const mockStoreState: any = {
  thresholds: { tempWarning: 70, tempCritical: 85, hashrateDropPercent: 50, offlineTimeoutMin: 5 },
  channels: { push: true, email: false, webhook: false },
  quietHoursStart: 22,
  quietHoursEnd: 7,
  loaded: true,
};

jest.mock('../src/store/notificationSettings', () => {
  const ReactMock = require('react');
  return {
    useNotificationSettingsStore: () => {
      const [, setVersion] = ReactMock.useState(0);
      const bump = () => setVersion((v: number) => v + 1);
      return {
        thresholds: mockStoreState.thresholds,
        channels: mockStoreState.channels,
        quietHoursStart: mockStoreState.quietHoursStart,
        quietHoursEnd: mockStoreState.quietHoursEnd,
        loaded: mockStoreState.loaded,
        loadSettings: mockLoadSettings,
        updateThresholds: (patch: any) => {
          mockStoreState.thresholds = { ...mockStoreState.thresholds, ...patch };
          bump();
        },
        toggleChannel: (ch: any) => {
          mockStoreState.channels = {
            ...mockStoreState.channels,
            [ch]: !mockStoreState.channels[ch],
          };
          bump();
        },
        setQuietHours: (start: number, end: number) => {
          mockStoreState.quietHoursStart = start;
          mockStoreState.quietHoursEnd = end;
          bump();
        },
      };
    },
  };
});

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockRequestPermission = jest.requireMock(
    '../src/services/notifications',
  ).requestNotificationPermission;
  mockSendMinerAlert = jest.requireMock('../src/services/notifications').sendMinerAlert;
  mockStoreState.thresholds = {
    tempWarning: 70,
    tempCritical: 85,
    hashrateDropPercent: 50,
    offlineTimeoutMin: 5,
  };
  mockStoreState.channels = { push: true, email: false, webhook: false };
  mockStoreState.quietHoursStart = 22;
  mockStoreState.quietHoursEnd = 7;
  mockStoreState.loaded = true;
  mockRequestPermission.mockResolvedValue(true);
  mockProfitState.enabled = false;
  mockProfitState.dropPercent = 5;
  jest
    .requireMock('../src/services/profitAlerts')
    .getProfitAlertSettings.mockResolvedValue(mockProfitState);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('loads settings on mount', async () => {
  await render(<NotificationSettingsScreen />);
  await waitFor(() => {
    expect(mockLoadSettings).toHaveBeenCalled();
  });
});

it('renders the title and threshold section', async () => {
  await render(<NotificationSettingsScreen />);
  expect(screen.getByText('notificationSettings.title')).toBeTruthy();
  expect(screen.getByText('notificationSettings.thresholds')).toBeTruthy();
  expect(screen.getByText('notificationSettings.tempWarning')).toBeTruthy();
  expect(screen.getByText('notificationSettings.tempCritical')).toBeTruthy();
  expect(screen.getByText('notificationSettings.hashrateDrop')).toBeTruthy();
  expect(screen.getByText('notificationSettings.offlineTimeout')).toBeTruthy();
});

it('shows default threshold values', async () => {
  await render(<NotificationSettingsScreen />);
  expect(screen.getByText('70°C')).toBeTruthy();
  expect(screen.getByText('85°C')).toBeTruthy();
  expect(screen.getByText('50%')).toBeTruthy();
  expect(screen.getByText('5min')).toBeTruthy();
});

it('renders all threshold preset chips', async () => {
  await render(<NotificationSettingsScreen />);
  expect(screen.getByLabelText('Set notificationSettings.tempWarning to 50°C')).toBeTruthy();
  expect(screen.getByLabelText('Set notificationSettings.tempWarning to 90°C')).toBeTruthy();
  expect(screen.getByLabelText('Set notificationSettings.tempCritical to 70°C')).toBeTruthy();
  expect(screen.getByLabelText('Set notificationSettings.tempCritical to 100°C')).toBeTruthy();
  expect(screen.getByLabelText('Set notificationSettings.hashrateDrop to 10%')).toBeTruthy();
  expect(screen.getByLabelText('Set notificationSettings.hashrateDrop to 90%')).toBeTruthy();
  expect(screen.getByLabelText('Set notificationSettings.offlineTimeout to 1min')).toBeTruthy();
  expect(screen.getByLabelText('Set notificationSettings.offlineTimeout to 30min')).toBeTruthy();
});

it('updates the temp warning threshold when a preset is tapped', async () => {
  await render(<NotificationSettingsScreen />);
  await fireEvent.press(screen.getByLabelText('Set notificationSettings.tempWarning to 75°C'));
  await waitFor(() => {
    expect(screen.getByText('75°C')).toBeTruthy();
  });
  expect(screen.queryByText('70°C')).toBeNull();
});

it('updates the temp critical threshold when a preset is tapped', async () => {
  await render(<NotificationSettingsScreen />);
  await fireEvent.press(screen.getByLabelText('Set notificationSettings.tempCritical to 90°C'));
  await waitFor(() => {
    expect(screen.getByText('90°C')).toBeTruthy();
  });
});

it('updates the hashrate drop threshold using step 5', async () => {
  await render(<NotificationSettingsScreen />);
  expect(screen.getByLabelText('Set notificationSettings.hashrateDrop to 45%')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Set notificationSettings.hashrateDrop to 45%'));
  await waitFor(() => {
    expect(screen.getByText('45%')).toBeTruthy();
  });
});

it('updates the offline timeout threshold when a preset is tapped', async () => {
  await render(<NotificationSettingsScreen />);
  await fireEvent.press(screen.getByLabelText('Set notificationSettings.offlineTimeout to 10min'));
  await waitFor(() => {
    expect(screen.getByText('10min')).toBeTruthy();
  });
});

it('renders the channel toggles with initial state', async () => {
  await render(<NotificationSettingsScreen />);
  expect(screen.getByText('notificationSettings.channels')).toBeTruthy();
  expect(screen.getByLabelText('push notifications toggle').props.value).toBe(true);
  expect(screen.getByLabelText('email notifications toggle').props.value).toBe(false);
  expect(screen.getByLabelText('webhook notifications toggle').props.value).toBe(false);
});

it('toggles the email channel on', async () => {
  await render(<NotificationSettingsScreen />);
  await fireEvent(screen.getByLabelText('email notifications toggle'), 'onValueChange', true);
  await waitFor(() => {
    expect(screen.getByLabelText('email notifications toggle').props.value).toBe(true);
  });
  expect(mockStoreState.channels.email).toBe(true);
});

it('toggles the push channel off', async () => {
  await render(<NotificationSettingsScreen />);
  await fireEvent(screen.getByLabelText('push notifications toggle'), 'onValueChange', false);
  await waitFor(() => {
    expect(screen.getByLabelText('push notifications toggle').props.value).toBe(false);
  });
  expect(mockStoreState.channels.push).toBe(false);
});

it('renders quiet hours section with default times', async () => {
  await render(<NotificationSettingsScreen />);
  expect(screen.getByText('notificationSettings.quietHours')).toBeTruthy();
  expect(screen.getByText('notificationSettings.quietHoursDesc')).toBeTruthy();
  expect(screen.getByText('notificationSettings.startTime')).toBeTruthy();
  expect(screen.getByText('notificationSettings.endTime')).toBeTruthy();
});

it('renders all 24 quiet hour chips for start and end', async () => {
  await render(<NotificationSettingsScreen />);
  expect(screen.getByLabelText('Set quiet hours start to 0:00')).toBeTruthy();
  expect(screen.getByLabelText('Set quiet hours start to 23:00')).toBeTruthy();
  expect(screen.getByLabelText('Set quiet hours end to 0:00')).toBeTruthy();
  expect(screen.getByLabelText('Set quiet hours end to 23:00')).toBeTruthy();
});

it('sets the quiet hours start time', async () => {
  await render(<NotificationSettingsScreen />);
  await fireEvent.press(screen.getByLabelText('Set quiet hours start to 23:00'));
  expect(mockStoreState.quietHoursStart).toBe(23);
  expect(mockStoreState.quietHoursEnd).toBe(7);
});

it('sets the quiet hours end time', async () => {
  await render(<NotificationSettingsScreen />);
  await fireEvent.press(screen.getByLabelText('Set quiet hours end to 6:00'));
  expect(mockStoreState.quietHoursEnd).toBe(6);
  expect(mockStoreState.quietHoursStart).toBe(22);
});

it('sends a test notification when permission is granted', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { medium } = require('../src/utils/haptics');
  await render(<NotificationSettingsScreen />);
  await fireEvent.press(screen.getByLabelText('notificationSettings.testNotification'));
  await waitFor(() => {
    expect(mockRequestPermission).toHaveBeenCalled();
  });
  await waitFor(() => {
    expect(mockSendMinerAlert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'test', name: 'Test Miner' }),
      'offline',
      mockStoreState.thresholds,
    );
  });
  const { sendTestPush } = jest.requireMock('../src/api/client');
  await waitFor(() => {
    expect(sendTestPush).toHaveBeenCalled();
  });
  expect(medium).toHaveBeenCalled();
  expect(alertSpy).toHaveBeenCalledWith(
    'notificationSettings.testSent',
    'notificationSettings.testSentBody',
  );
});

it('shows a permission denied alert and does not send', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockRequestPermission.mockResolvedValue(false);
  await render(<NotificationSettingsScreen />);
  await fireEvent.press(screen.getByLabelText('notificationSettings.testNotification'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith(
      'notificationSettings.permissionDenied',
      'notificationSettings.permissionDeniedBody',
    );
  });
  expect(mockSendMinerAlert).not.toHaveBeenCalled();
});

it('returns null before settings are loaded', async () => {
  mockStoreState.loaded = false;
  await render(<NotificationSettingsScreen />);
  expect(screen.queryByText('notificationSettings.title')).toBeNull();
});

it('renders the profitability price alert section', async () => {
  await render(<NotificationSettingsScreen />);
  await waitFor(() => {
    expect(screen.getByText('notificationSettings.profitTitle')).toBeTruthy();
  });
  expect(screen.getByText('notificationSettings.profitDesc')).toBeTruthy();
  expect(screen.getByText('notificationSettings.profitDrop')).toBeTruthy();
  expect(screen.getAllByText('5%').length).toBeGreaterThan(0);
  expect(screen.getByLabelText('profitability price alert toggle')).toBeTruthy();
});

it('enables profitability price alerts and persists the setting', async () => {
  const mockSetProfit = jest.requireMock('../src/services/profitAlerts').setProfitAlertSettings;
  await render(<NotificationSettingsScreen />);
  await fireEvent(screen.getByLabelText('profitability price alert toggle'), 'valueChange', true);
  await waitFor(() => {
    expect(mockSetProfit).toHaveBeenCalledWith({ enabled: true, dropPercent: 5 });
  });
});

it('selects a price drop threshold and persists it', async () => {
  const mockSetProfit = jest.requireMock('../src/services/profitAlerts').setProfitAlertSettings;
  await render(<NotificationSettingsScreen />);
  await fireEvent.press(screen.getByLabelText('Set price drop threshold to 10%'));
  await waitFor(() => {
    expect(mockSetProfit).toHaveBeenCalledWith({ enabled: false, dropPercent: 10 });
  });
});
