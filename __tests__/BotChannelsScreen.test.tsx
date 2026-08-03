import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { BotChannelsScreen } from '../src/screens/BotChannelsScreen';

let mockToken: string | null = 't1';

jest.mock('../src/store/auth', () => ({
  useAuthStore: Object.assign(
    (selector?: (state: any) => any) => {
      const state = { token: mockToken };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ token: mockToken }) },
  ),
}));

jest.mock('../src/api/client', () => ({
  getBaseUrl: () => 'http://localhost:4000',
}));

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
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    accent: '#3b82f6',
    info: '#06b6d4',
    glow: '#6c63ff33',
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

let mockChannels: any[] = [];
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const discordChannel = {
  id: 'c1',
  type: 'discord',
  webhookUrl: 'https://discord.com/api/webhooks/xyz',
  name: 'Alerts',
  createdAt: 1000,
};

const telegramChannel = {
  id: 'c2',
  type: 'telegram',
  webhookUrl: 'https://api.telegram.org/bot123/sendMessage',
  name: 'Telegram Alerts',
  createdAt: 2000,
};

function okJson(data: unknown) {
  return { ok: true, status: 200, json: async () => data };
}

function mockAlertButton(buttonText: string) {
  return jest
    .spyOn(Alert, 'alert')
    .mockImplementation(
      (
        _title?: string,
        _msg?: string,
        buttons?: Array<{ text?: string; onPress?: () => void }>,
      ) => {
        const btn = buttons?.find((b) => b.text === buttonText);
        if (btn?.onPress) btn.onPress();
      },
    );
}

function hapticMocks() {
  return jest.requireMock('../src/utils/haptics') as Record<string, jest.Mock>;
}

const navProps = { navigation: { navigate: jest.fn() } as any };

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockToken = 't1';
  mockChannels = [];
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes('/test')) return okJson({ success: true });
    return okJson({ channels: mockChannels });
  });
});

afterEach(() => jest.restoreAllMocks());

it('renders the screen title and fetches channels on mount', async () => {
  await render(<BotChannelsScreen {...navProps} />);
  expect(screen.getByText('botChannels.title')).toBeTruthy();
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/bot-channels',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer t1' }) }),
    );
  });
});

it('shows empty state when there are no channels', async () => {
  await render(<BotChannelsScreen {...navProps} />);
  await waitFor(() => {
    expect(screen.getByText('botChannels.noChannels')).toBeTruthy();
  });
});

it('renders discord and telegram channels', async () => {
  mockChannels = [discordChannel, telegramChannel];
  await render(<BotChannelsScreen {...navProps} />);
  await waitFor(() => {
    expect(screen.getByText('Alerts')).toBeTruthy();
    expect(screen.getByText('botChannels.discord')).toBeTruthy();
    expect(screen.getByText('Telegram Alerts')).toBeTruthy();
    expect(screen.getByText('botChannels.telegram')).toBeTruthy();
  });
});

it('does not fetch channels when logged out', async () => {
  mockToken = null;
  await render(<BotChannelsScreen {...navProps} />);
  await waitFor(() => {
    expect(screen.getByText('botChannels.noChannels')).toBeTruthy();
  });
  expect(mockFetch).not.toHaveBeenCalledWith(
    'http://localhost:4000/api/bot-channels',
    expect.anything(),
  );
});

it('logs a warning when fetching channels fails', async () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockFetch.mockRejectedValue(new Error('net'));
  await render(<BotChannelsScreen {...navProps} />);
  await waitFor(() => {
    expect(warnSpy).toHaveBeenCalledWith('Failed to fetch bot channels:', expect.any(Error));
  });
  expect(screen.getByText('botChannels.noChannels')).toBeTruthy();
  warnSpy.mockRestore();
});

it('tests a webhook successfully', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockChannels = [discordChannel];
  await render(<BotChannelsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alerts')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('botChannels.test'));
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/bot-channels/c1/test',
      expect.objectContaining({ method: 'POST' }),
    );
  });
  expect(hapticMocks().success).toHaveBeenCalled();
  expect(alertSpy).toHaveBeenCalledWith('botChannels.testSent', 'Alerts');
  alertSpy.mockRestore();
});

it('shows error alert when testing a webhook fails', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockChannels = [discordChannel];
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes('/test')) throw new Error('bad hook');
    return okJson({ channels: mockChannels });
  });
  await render(<BotChannelsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alerts')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('botChannels.test'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('common.error', 'bad hook');
  });
  alertSpy.mockRestore();
});

it('deletes a channel when confirmed', async () => {
  const alertSpy = mockAlertButton('common.delete');
  mockChannels = [discordChannel];
  await render(<BotChannelsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alerts')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('botChannels.delete'));
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/bot-channels/c1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
  expect(hapticMocks().light).toHaveBeenCalled();
  alertSpy.mockRestore();
});

it('cancels deleting a channel', async () => {
  const alertSpy = mockAlertButton('common.cancel');
  mockChannels = [discordChannel];
  await render(<BotChannelsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alerts')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('botChannels.delete'));
  const deleteCalls = mockFetch.mock.calls.filter(([, init]) => init?.method === 'DELETE');
  expect(deleteCalls).toHaveLength(0);
  alertSpy.mockRestore();
});

it('adds a new channel from the modal', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<BotChannelsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('botChannels.noChannels')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('botChannels.addBot'));
  await waitFor(() => expect(screen.getByLabelText('botChannels.botName')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('botChannels.botName'), 'Ops Alerts');
  await fireEvent.changeText(
    screen.getByLabelText('botChannels.webhookUrl'),
    'https://discord.com/api/webhooks/abc',
  );
  await fireEvent.press(screen.getByLabelText('botChannels.telegram'));
  await fireEvent.press(screen.getByLabelText('common.add'));
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/bot-channels',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          type: 'telegram',
          webhookUrl: 'https://discord.com/api/webhooks/abc',
          name: 'Ops Alerts',
        }),
      }),
    );
  });
  expect(hapticMocks().success).toHaveBeenCalled();
  await waitFor(() => {
    expect(screen.queryByLabelText('botChannels.webhookUrl')).toBeNull();
  });
  alertSpy.mockRestore();
});

it('does not add a channel when fields are empty', async () => {
  await render(<BotChannelsScreen {...navProps} />);
  await fireEvent.press(screen.getByLabelText('botChannels.addBot'));
  await waitFor(() => expect(screen.getByLabelText('common.add')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('common.add'));
  const postCalls = mockFetch.mock.calls.filter(([, init]) => init?.method === 'POST');
  expect(postCalls).toHaveLength(0);
});

it('shows error alert when adding a channel fails', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') throw new Error('post fail');
    return okJson({ channels: mockChannels });
  });
  await render(<BotChannelsScreen {...navProps} />);
  await fireEvent.press(screen.getByLabelText('botChannels.addBot'));
  await waitFor(() => expect(screen.getByLabelText('botChannels.botName')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('botChannels.botName'), 'Ops Alerts');
  await fireEvent.changeText(screen.getByLabelText('botChannels.webhookUrl'), 'https://x.io/hook');
  await fireEvent.press(screen.getByLabelText('common.add'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('common.error', 'post fail');
  });
  alertSpy.mockRestore();
});

it('cancels the add channel modal', async () => {
  await render(<BotChannelsScreen {...navProps} />);
  await fireEvent.press(screen.getByLabelText('botChannels.addBot'));
  await waitFor(() => expect(screen.getByLabelText('botChannels.botName')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('common.cancel'));
  await waitFor(() => {
    expect(screen.queryByLabelText('botChannels.botName')).toBeNull();
  });
});
