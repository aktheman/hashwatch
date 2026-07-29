import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { BotChannelsScreen } from '../src/screens/BotChannelsScreen';

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
    if (url.includes('bot-channels') && !url.includes('/test')) {
      return { ok: true, json: async () => ({ channels: mockChannels }) };
    }
    return { ok: true, json: async () => ({}) };
  });
  global.fetch = mockFetch;
});

it('renders the screen title', async () => {
  await render(<BotChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  expect(screen.getByText('botChannels.title')).toBeTruthy();
});

it('shows empty state when no channels', async () => {
  await render(<BotChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  expect(screen.getByText('botChannels.noChannels')).toBeTruthy();
});

it('shows FAB button to add bot', async () => {
  await render(<BotChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  expect(screen.getByLabelText('botChannels.addBot')).toBeTruthy();
});

it('displays existing channels', async () => {
  mockChannels = [
    {
      id: 'ch1',
      type: 'discord',
      webhookUrl: 'https://discord.com/wh',
      name: 'My Bot',
      createdAt: Date.now(),
    },
  ];
  await render(<BotChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('My Bot')).toBeTruthy();
    expect(screen.getByText('botChannels.discord')).toBeTruthy();
  });
});

it('opens add modal on FAB press', async () => {
  await render(<BotChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText('botChannels.addBot'));
  });
  await waitFor(() => {
    expect(screen.getByText('botChannels.addBot')).toBeTruthy();
  });
});

it('can cancel the add modal', async () => {
  await render(<BotChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText('botChannels.addBot'));
  });
  await waitFor(() => {
    expect(screen.getByLabelText('common.cancel')).toBeTruthy();
  });
  await act(async () => {
    fireEvent.press(screen.getByLabelText('common.cancel'));
  });
});

it('shows test and delete buttons per channel', async () => {
  mockChannels = [
    {
      id: 'ch1',
      type: 'telegram',
      webhookUrl: 'https://t.me/bot',
      name: 'TG Bot',
      createdAt: Date.now(),
    },
  ];
  await render(<BotChannelsScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('botChannels.test')).toBeTruthy();
    expect(screen.getByText('botChannels.delete')).toBeTruthy();
  });
});
