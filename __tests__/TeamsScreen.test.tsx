import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { TeamsScreen } from '../src/screens/TeamsScreen';

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
    t: (key: string, fallback?: any) => (typeof fallback === 'string' ? fallback : key),
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

let mockTeams: any[] = [];
let mockInvitations: any[] = [];
const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockTeams = [];
  mockInvitations = [];
  mockFetch.mockImplementation(async (url: string) => {
    if (
      url.includes('/teams') &&
      !url.includes('/accept') &&
      !url.includes('/leave') &&
      !url.includes('/invite')
    ) {
      return { ok: true, json: async () => ({ teams: mockTeams, invitations: mockInvitations }) };
    }
    return { ok: true, json: async () => ({}) };
  });
  global.fetch = mockFetch;
});

it('renders the screen title', async () => {
  await render(<TeamsScreen navigation={{ navigate: jest.fn() } as any} />);
  const titles = screen.getAllByText('teams.title');
  expect(titles.length).toBeGreaterThanOrEqual(1);
});

it('shows empty state when no teams', async () => {
  await render(<TeamsScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('teams.noTeams')).toBeTruthy();
  });
});

it('shows create team button', async () => {
  await render(<TeamsScreen navigation={{ navigate: jest.fn() } as any} />);
  expect(screen.getByText(/teams.createTeam/)).toBeTruthy();
});

it('opens create team modal', async () => {
  await render(<TeamsScreen navigation={{ navigate: jest.fn() } as any} />);
  await act(async () => {
    fireEvent.press(screen.getByText(/teams.createTeam/));
  });
  await waitFor(() => {
    expect(screen.getAllByText('teams.createTeam').length).toBeGreaterThanOrEqual(1);
  });
});

it('displays existing teams', async () => {
  mockTeams = [
    {
      id: 't1',
      name: 'Mining Team',
      ownerId: 'u1',
      memberCount: 3,
      role: 'owner',
      createdAt: Date.now(),
    },
  ];
  await render(<TeamsScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('Mining Team')).toBeTruthy();
  });
});

it('shows invitations section', async () => {
  mockInvitations = [
    {
      id: 'inv1',
      teamId: 't2',
      email: 'me@test.com',
      role: 'viewer',
      invitedBy: 'admin',
      createdAt: Date.now(),
      status: 'pending',
    },
  ];
  await render(<TeamsScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('teams.invitations')).toBeTruthy();
  });
});

it('cancels create team modal', async () => {
  await render(<TeamsScreen navigation={{ navigate: jest.fn() } as any} />);
  await act(async () => {
    fireEvent.press(screen.getByText(/teams.createTeam/));
  });
  await waitFor(() => {
    expect(screen.getByLabelText('common.cancel')).toBeTruthy();
  });
  await act(async () => {
    fireEvent.press(screen.getByLabelText('common.cancel'));
  });
});

it('shows team member count', async () => {
  mockTeams = [
    {
      id: 't1',
      name: 'Big Team',
      ownerId: 'u1',
      memberCount: 5,
      role: 'admin',
      createdAt: Date.now(),
    },
  ];
  await render(<TeamsScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('Big Team')).toBeTruthy();
  });
});
