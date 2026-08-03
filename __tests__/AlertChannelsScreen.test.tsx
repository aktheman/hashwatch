import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { AlertChannelsScreen } from '../src/screens/AlertChannelsScreen';

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

const mockTokenState = { current: 'tok123' };

jest.mock('../src/store/auth', () => {
  const fn: any = jest.fn(() => ({ token: mockTokenState.current }));
  fn.getState = () => ({ token: mockTokenState.current });
  return { useAuthStore: fn };
});

jest.mock('../src/api/client', () => ({
  getBaseUrl: () => 'http://test',
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const smsChannel = {
  id: 'abc',
  type: 'sms',
  config: { phoneNumber: '+15551234567' },
  createdAt: 123,
};
const telegramChannel = {
  id: 'def',
  type: 'telegram',
  config: { chatId: '@mybot' },
  createdAt: 456,
};

function captureAlertButtons() {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons?: any[]) => {
    (alertSpy as any).__buttons = buttons ?? [];
  });
  return alertSpy;
}

function mockFetchSuccess(channels: unknown[]) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ channels }),
  });
}

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockTokenState.current = 'tok123';
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('fetches and renders the channel list', async () => {
  mockFetchSuccess([smsChannel, telegramChannel]);
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  expect(screen.getAllByText('alertChannels.title').length).toBeGreaterThanOrEqual(1);
  await waitFor(() => {
    expect(screen.getByText('+15551234567')).toBeTruthy();
  });
  expect(screen.getByText('@mybot')).toBeTruthy();
  expect(screen.getAllByText('alertChannels.sms')).toHaveLength(2);
  expect(screen.getAllByText('alertChannels.telegram')).toHaveLength(2);
  expect(screen.getByText('📱')).toBeTruthy();
  expect(screen.getByText('✈️')).toBeTruthy();
});

it('sends the bearer token with the fetch request', async () => {
  mockFetchSuccess([]);
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await waitFor(() => {
    expect((global as any).fetch).toHaveBeenCalledWith(
      'http://test/api/alert-channels',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok123' }),
      }),
    );
  });
});

it('skips fetching when there is no token', async () => {
  mockTokenState.current = null;
  (global as any).fetch = jest.fn();
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await waitFor(() => {
    expect(screen.getByText('alertChannels.noChannels')).toBeTruthy();
  });
  expect(global.fetch).not.toHaveBeenCalled();
});

it('shows the empty state when there are no channels', async () => {
  mockFetchSuccess([]);
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await waitFor(() => {
    expect(screen.getByText('alertChannels.noChannels')).toBeTruthy();
  });
});

it('handles a fetch error gracefully', async () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  (global as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await waitFor(() => {
    expect(warnSpy).toHaveBeenCalled();
  });
  await waitFor(() => {
    expect(screen.getByText('alertChannels.noChannels')).toBeTruthy();
  });
});

it('adds an sms channel through the modal', async () => {
  mockFetchSuccess([]);
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await fireEvent.press(screen.getByLabelText('alertChannels.addChannel'));
  await fireEvent.changeText(screen.getByLabelText('alertChannels.phoneNumber'), '+15550001111');
  await fireEvent.press(screen.getAllByLabelText('alertChannels.addChannel')[1]);
  await waitFor(() => {
    const postCall = (global.fetch as jest.Mock).mock.calls.find(
      (c: any[]) => c[1]?.method === 'POST',
    );
    expect(postCall).toBeTruthy();
    expect(JSON.parse(postCall![1].body)).toEqual({
      type: 'sms',
      config: { phoneNumber: '+15550001111' },
    });
  });
  await waitFor(() => {
    expect(screen.queryByLabelText('alertChannels.phoneNumber')).toBeNull();
  });
});

it('switches to telegram type and adds a telegram channel', async () => {
  mockFetchSuccess([]);
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await fireEvent.press(screen.getByLabelText('alertChannels.addChannel'));
  await fireEvent.press(screen.getByLabelText('alertChannels.telegram'));
  expect(screen.queryByLabelText('alertChannels.phoneNumber')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('alertChannels.chatId'), '@mybot');
  await fireEvent.press(screen.getAllByLabelText('alertChannels.addChannel')[1]);
  await waitFor(() => {
    const postCall = (global.fetch as jest.Mock).mock.calls.find(
      (c: any[]) => c[1]?.method === 'POST',
    );
    expect(postCall).toBeTruthy();
    expect(JSON.parse(postCall![1].body)).toEqual({
      type: 'telegram',
      config: { chatId: '@mybot' },
    });
  });
});

it('shows an alert when adding a channel fails', async () => {
  mockFetchSuccess([]);
  const alertSpy = captureAlertButtons();
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Bad Request' }),
  });
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await fireEvent.press(screen.getByLabelText('alertChannels.addChannel'));
  await fireEvent.changeText(screen.getByLabelText('alertChannels.phoneNumber'), '+15550001111');
  await fireEvent.press(screen.getAllByLabelText('alertChannels.addChannel')[1]);
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('common.error', 'Bad Request');
  });
});

it('cancels the add channel modal and clears fields', async () => {
  mockFetchSuccess([]);
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await fireEvent.press(screen.getByLabelText('alertChannels.addChannel'));
  await fireEvent.changeText(screen.getByLabelText('alertChannels.phoneNumber'), '+15550001111');
  await fireEvent.press(screen.getByLabelText('common.cancel'));
  await waitFor(() => {
    expect(screen.queryByLabelText('alertChannels.phoneNumber')).toBeNull();
  });
});

it('deletes a channel after confirmation', async () => {
  mockFetchSuccess([smsChannel]);
  const alertSpy = captureAlertButtons();
  const { success } = require('../src/utils/haptics');
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await waitFor(() => {
    expect(screen.getByText('+15551234567')).toBeTruthy();
  });
  await fireEvent.press(screen.getByLabelText('alertChannels.delete'));
  await act(async () => {
    alertSpy.__buttons[1].onPress();
  });
  await waitFor(() => {
    const deleteCall = (global.fetch as jest.Mock).mock.calls.find(
      (c: any[]) => c[1]?.method === 'DELETE',
    );
    expect(deleteCall).toBeTruthy();
    expect(deleteCall![0]).toBe('http://test/api/alert-channels/abc');
  });
  expect(success).toHaveBeenCalled();
});

it('shows an alert when deleting a channel fails', async () => {
  mockFetchSuccess([smsChannel]);
  const alertSpy = captureAlertButtons();
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await waitFor(() => {
    expect(screen.getByText('+15551234567')).toBeTruthy();
  });
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Not Found' }),
  });
  await fireEvent.press(screen.getByLabelText('alertChannels.delete'));
  await act(async () => {
    alertSpy.__buttons[1].onPress();
  });
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('common.error', 'Not Found');
  });
});

it('tests a channel and shows success', async () => {
  mockFetchSuccess([smsChannel]);
  const alertSpy = captureAlertButtons();
  const { success } = require('../src/utils/haptics');
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await waitFor(() => {
    expect(screen.getByText('+15551234567')).toBeTruthy();
  });
  await fireEvent.press(screen.getByLabelText('alertChannels.test'));
  await waitFor(() => {
    const testCall = (global.fetch as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === 'http://test/api/alert-channels/abc/test',
    );
    expect(testCall).toBeTruthy();
  });
  expect(success).toHaveBeenCalled();
  expect(alertSpy).toHaveBeenCalledWith('alertChannels.testSent', '');
});

it('shows an alert when testing a channel fails', async () => {
  mockFetchSuccess([smsChannel]);
  const alertSpy = captureAlertButtons();
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await waitFor(() => {
    expect(screen.getByText('+15551234567')).toBeTruthy();
  });
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 404,
    json: async () => ({}),
  });
  await fireEvent.press(screen.getByLabelText('alertChannels.test'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('common.error', 'HTTP 404');
  });
});

it('refresh control re-fetches the channels', async () => {
  mockFetchSuccess([smsChannel]);
  await render(<AlertChannelsScreen navigation={mockNavigation as any} />);
  await waitFor(() => {
    expect(screen.getByText('+15551234567')).toBeTruthy();
  });
  const refreshControl = screen.root.props.refreshControl;
  expect(refreshControl).toBeTruthy();
  await act(async () => {
    await refreshControl.props.onRefresh();
  });
  await waitFor(() => {
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
