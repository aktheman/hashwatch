import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { AlertChannelsScreen } from '../src/screens/AlertChannelsScreen';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    text: '#e2e0ff',
    textDim: '#9694b0',
    primary: '#6c63ff',
    primaryDark: '#5a52d5',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    border: '#2a2940',
    surfaceLight: '#1a1a24',
    textMuted: '#6b6990',
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
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

jest.mock('../src/store/auth', () => {
  const useAuthStore = Object.assign(
    (selector?: (s: any) => any) => {
      const state = { token: 'mock-token' };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ token: 'mock-token' }),
    },
  );
  return { useAuthStore };
});

jest.mock('../src/api/client', () => ({
  getBaseUrl: jest.fn().mockReturnValue('http://localhost:4000'),
}));

let mockChannels: any[] = [];
const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockChannels = [];
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes('alert-channels') && !url.includes('/test') && !url.includes('DELETE')) {
      return { ok: true, json: async () => ({ channels: mockChannels }) };
    }
    return { ok: true, json: async () => ({}) };
  });
  global.fetch = mockFetch;
});

it('renders the screen title', async () => {
  await render(<AlertChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  expect(screen.getAllByText('alertChannels.title').length).toBeGreaterThanOrEqual(1);
});

it('shows empty state when no channels', async () => {
  await render(<AlertChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  expect(screen.getByText('alertChannels.noChannels')).toBeTruthy();
});

it('shows add channel button', async () => {
  await render(<AlertChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  expect(screen.getByText(/alertChannels.addChannel/)).toBeTruthy();
});

it('displays existing channels', async () => {
  mockChannels = [
    { id: 'ch1', type: 'sms', config: { phoneNumber: '+1234567890' }, createdAt: Date.now() },
  ];
  await render(<AlertChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getAllByText('alertChannels.sms').length).toBeGreaterThanOrEqual(1);
  });
});

it('opens add modal on press', async () => {
  await render(<AlertChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  await act(async () => {
    fireEvent.press(screen.getByText(/alertChannels.addChannel/));
  });
  await waitFor(() => {
    expect(screen.getByText('alertChannels.type')).toBeTruthy();
  });
});

it('can cancel the add modal', async () => {
  await render(<AlertChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  await act(async () => {
    fireEvent.press(screen.getByText(/alertChannels.addChannel/));
  });
  await waitFor(() => {
    expect(screen.getByText('alertChannels.type')).toBeTruthy();
  });
  await act(async () => {
    fireEvent.press(screen.getByLabelText('common.cancel'));
  });
});

it('shows test and delete buttons for channels', async () => {
  mockChannels = [
    { id: 'ch1', type: 'telegram', config: { chatId: '12345' }, createdAt: Date.now() },
  ];
  await render(<AlertChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('alertChannels.test')).toBeTruthy();
    expect(screen.getByText('alertChannels.delete')).toBeTruthy();
  });
});
