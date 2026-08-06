import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { TeamsScreen } from '../src/screens/TeamsScreen';
import { useActivityFeedStore } from '../src/store/activityFeed';

let mockToken: string | null = 't1';
const mockLogout = jest.fn();

jest.mock('../src/store/auth', () => ({
  useAuthStore: Object.assign(
    (selector?: (state: any) => any) => {
      const state = { token: mockToken, logout: mockLogout };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ token: mockToken, logout: mockLogout }) },
  ),
}));

jest.mock('../src/api/client', () => ({
  getBaseUrl: () => 'http://localhost:4000',
  fetchActivityFeed: jest.fn().mockResolvedValue([]),
  markActivityRead: jest.fn().mockResolvedValue({ ok: true }),
  markAllActivityRead: jest.fn().mockResolvedValue({ ok: true }),
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

let mockTeams: any[] = [];
let mockInvitations: any[] = [];
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const team = {
  id: 't1',
  name: 'Alpha',
  ownerId: 'u1',
  memberCount: 4,
  role: 'owner',
  createdAt: 1000,
};

const inv = {
  id: 'i1',
  teamId: 'invited-team',
  email: 'x@y.com',
  role: 'viewer',
  invitedBy: 'u9',
  createdAt: 1000,
  status: 'pending',
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

const navProps = { navigation: { navigate: jest.fn(), goBack: jest.fn() } as any };

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockToken = 't1';
  mockTeams = [];
  mockInvitations = [];
  useActivityFeedStore.setState({ events: [] });
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (url: string) => {
    if (
      url.includes('/api/teams') &&
      !url.includes('/accept') &&
      !url.includes('/leave') &&
      !url.includes('/invite')
    ) {
      return okJson({ teams: mockTeams, invitations: mockInvitations });
    }
    return okJson({});
  });
});

afterEach(() => jest.restoreAllMocks());

it('renders the screen title', async () => {
  await render(<TeamsScreen {...navProps} />);
  expect(screen.getAllByText('teams.title').length).toBeGreaterThanOrEqual(1);
});

it('shows empty state when no teams', async () => {
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => {
    expect(screen.getByText('teams.noTeams')).toBeTruthy();
  });
});

it('displays existing teams with member count', async () => {
  mockTeams = [team];
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => {
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('teams.memberCount')).toBeTruthy();
    expect(screen.getByText('teams.owner')).toBeTruthy();
  });
});

it('shows invitations with accept and decline', async () => {
  mockInvitations = [inv];
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => {
    expect(screen.getByText('invited-team')).toBeTruthy();
    expect(screen.getByLabelText('teams.accept')).toBeTruthy();
    expect(screen.getByLabelText('teams.decline')).toBeTruthy();
  });
});

it('accepts an invitation', async () => {
  mockInvitations = [inv];
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByLabelText('teams.accept')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('teams.accept'));
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/teams/invited-team/accept',
      expect.objectContaining({ method: 'POST' }),
    );
  });
  expect(hapticMocks().success).toHaveBeenCalled();
});

it('declining an invitation only triggers haptic', async () => {
  mockInvitations = [inv];
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByLabelText('teams.decline')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('teams.decline'));
  expect(hapticMocks().light).toHaveBeenCalled();
});

it('creates a new team', async () => {
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('teams.noTeams')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('teams.createTeam'));
  await waitFor(() => expect(screen.getByLabelText('teams.teamName')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('teams.teamName'), 'New Squad');
  const buttons = screen.getAllByLabelText('teams.createTeam');
  await fireEvent.press(buttons[buttons.length - 1]);
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/teams',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'New Squad' }),
      }),
    );
  });
  expect(hapticMocks().success).toHaveBeenCalled();
});

it('does not create a team with an empty name', async () => {
  await render(<TeamsScreen {...navProps} />);
  await fireEvent.press(screen.getByLabelText('teams.createTeam'));
  await waitFor(() => expect(screen.getByLabelText('teams.teamName')).toBeTruthy());
  const buttons = screen.getAllByLabelText('teams.createTeam');
  await fireEvent.press(buttons[buttons.length - 1]);
  expect(mockFetch).not.toHaveBeenCalledWith(
    'http://localhost:4000/api/teams',
    expect.objectContaining({ method: 'POST' }),
  );
});

it('shows error alert when team creation fails', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') throw new Error('boom');
    return okJson({ teams: mockTeams, invitations: mockInvitations });
  });
  await render(<TeamsScreen {...navProps} />);
  await fireEvent.press(screen.getByLabelText('teams.createTeam'));
  await waitFor(() => expect(screen.getByLabelText('teams.teamName')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('teams.teamName'), 'Fails');
  const buttons = screen.getAllByLabelText('teams.createTeam');
  await fireEvent.press(buttons[buttons.length - 1]);
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('common.error', 'boom');
  });
  alertSpy.mockRestore();
});

it('opens team detail on card tap', async () => {
  mockTeams = [team];
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Alpha, 4 members'));
  await waitFor(() => {
    expect(screen.getByText('teams.miners')).toBeTruthy();
    expect(screen.getByText('teams.members')).toBeTruthy();
  });
});

it('navigates back from team detail', async () => {
  mockTeams = [team];
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Alpha, 4 members'));
  await waitFor(() => expect(screen.getByLabelText('common.goBack')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('common.goBack'));
  await waitFor(() => {
    expect(screen.getByLabelText('Alpha, 4 members')).toBeTruthy();
  });
});

it('shows invite button but hides leave for owner', async () => {
  mockTeams = [{ ...team, role: 'owner' }];
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Alpha, 4 members'));
  await waitFor(() => expect(screen.getByLabelText('teams.inviteMember')).toBeTruthy());
  expect(screen.queryByLabelText('teams.leave')).toBeNull();
});

it('shows leave button but hides invite for viewer', async () => {
  mockTeams = [{ ...team, role: 'viewer' }];
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Alpha, 4 members'));
  await waitFor(() => expect(screen.getByLabelText('teams.leave')).toBeTruthy());
  expect(screen.queryByLabelText('teams.inviteMember')).toBeNull();
});

it('leaves a team when confirmed', async () => {
  const alertSpy = mockAlertButton('teams.leave');
  mockTeams = [{ ...team, role: 'viewer' }];
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Alpha, 4 members'));
  await waitFor(() => expect(screen.getByLabelText('teams.leave')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('teams.leave'));
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/teams/t1/leave',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
  alertSpy.mockRestore();
});

it('invites a member with the selected role', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockTeams = [{ ...team, role: 'admin' }];
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Alpha, 4 members'));
  await waitFor(() => expect(screen.getByLabelText('teams.inviteMember')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('teams.inviteMember'));
  await waitFor(() => expect(screen.getByLabelText('teams.email')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('teams.email'), 'friend@x.com');
  await fireEvent.press(screen.getByLabelText('teams.admin'));
  const submitButtons = screen.getAllByLabelText('teams.inviteMember');
  await fireEvent.press(submitButtons[submitButtons.length - 1]);
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/teams/t1/invite',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'friend@x.com', role: 'admin' }),
      }),
    );
  });
  expect(alertSpy).toHaveBeenCalledWith('common.success', 'teams.inviteSent');
  alertSpy.mockRestore();
});

it('does not invite with an empty email', async () => {
  mockTeams = [{ ...team, role: 'owner' }];
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Alpha, 4 members'));
  await waitFor(() => expect(screen.getByLabelText('teams.inviteMember')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('teams.inviteMember'));
  await waitFor(() => expect(screen.getByLabelText('teams.email')).toBeTruthy());
  const submitButtons = screen.getAllByLabelText('teams.inviteMember');
  await fireEvent.press(submitButtons[submitButtons.length - 1]);
  expect(mockFetch).not.toHaveBeenCalledWith(
    'http://localhost:4000/api/teams/t1/invite',
    expect.objectContaining({ method: 'POST' }),
  );
});

it('shows shared miners in team detail', async () => {
  mockTeams = [team];
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes('/api/teams/t1/miners') && !url.endsWith('/miners')) {
      return okJson({});
    }
    if (url.includes('/api/teams/t1/miners')) {
      return okJson({
        miners: [{ id: 'm1', name: 'Worker', ip: '10.0.0.5', ownerId: 'u1' }],
        memberIds: ['u1'],
      });
    }
    return okJson({ teams: mockTeams, invitations: mockInvitations });
  });
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Alpha, 4 members'));
  await waitFor(() => {
    expect(screen.getByText('Worker')).toBeTruthy();
    expect(screen.getByText('10.0.0.5')).toBeTruthy();
    expect(screen.getByLabelText('teams.shareMiner')).toBeTruthy();
  });
});

it('opens share modal listing unshared miners', async () => {
  mockTeams = [team];
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes('/api/teams/t1/miners')) {
      return okJson({ miners: [{ id: 'm1', name: 'Shared', ip: '1.1.1.1' }], memberIds: ['u1'] });
    }
    if (url === 'http://localhost:4000/api/miners') {
      return okJson([{ id: 'm2', name: 'MinerB', ip: '2.2.2.2' }]);
    }
    return okJson({ teams: mockTeams, invitations: mockInvitations });
  });
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Alpha, 4 members'));
  await waitFor(() => expect(screen.getByLabelText('teams.shareMiner')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('teams.shareMiner'));
  await waitFor(() => {
    expect(screen.getByText('MinerB')).toBeTruthy();
    expect(screen.getByText('2.2.2.2')).toBeTruthy();
  });
});

it('shares a miner with the team', async () => {
  mockTeams = [team];
  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      return okJson({ ok: true });
    }
    if (url.includes('/api/teams/t1/miners')) {
      return okJson({ miners: [{ id: 'm1', name: 'Shared', ip: '1.1.1.1' }], memberIds: ['u1'] });
    }
    if (url === 'http://localhost:4000/api/miners') {
      return okJson([{ id: 'm2', name: 'MinerB', ip: '2.2.2.2' }]);
    }
    return okJson({ teams: mockTeams, invitations: mockInvitations });
  });
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Alpha, 4 members'));
  await waitFor(() => expect(screen.getByLabelText('teams.shareMiner')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('teams.shareMiner'));
  await waitFor(() => expect(screen.getByText('MinerB')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('teams.shareMiner: MinerB'));
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/teams/t1/miners',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ minerId: 'm2' }),
      }),
    );
  });
  expect(hapticMocks().success).toHaveBeenCalled();
});

it('unshares a miner from the team', async () => {
  const alertSpy = mockAlertButton('teams.unshare');
  mockTeams = [team];
  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') {
      return okJson({ ok: true });
    }
    if (url.includes('/api/teams/t1/miners')) {
      return okJson({
        miners: [{ id: 'm1', name: 'Worker', ip: '10.0.0.5', ownerId: 'u1' }],
        memberIds: ['u1'],
      });
    }
    return okJson({ teams: mockTeams, invitations: mockInvitations });
  });
  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Alpha, 4 members'));
  await waitFor(() => expect(screen.getByLabelText('teams.unshare')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('teams.unshare'));
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/teams/t1/miners/m1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
  alertSpy.mockRestore();
});

it('hides unread badge when there are no team events', async () => {
  await render(<TeamsScreen {...navProps} />);
  expect(screen.queryByLabelText('teams.markTeamRead')).toBeNull();
});

it('shows unread badge with team event count', async () => {
  useActivityFeedStore.setState({
    events: [
      {
        id: 'e1',
        type: 'team_invite',
        title: 'Invite',
        description: '',
        timestamp: 1,
        severity: 'info',
        read: false,
      },
      {
        id: 'e2',
        type: 'miner_shared',
        title: 'Shared',
        description: '',
        timestamp: 2,
        severity: 'info',
        read: false,
      },
      {
        id: 'e3',
        type: 'miner_offline',
        title: 'Offline',
        description: '',
        timestamp: 3,
        severity: 'error',
        read: false,
      },
    ],
  });

  await render(<TeamsScreen {...navProps} />);

  expect(screen.getByText('2')).toBeTruthy();
  expect(screen.getByLabelText('teams.markTeamRead')).toBeTruthy();
});

it('marks team events read when badge is pressed', async () => {
  useActivityFeedStore.setState({
    events: [
      {
        id: 'e1',
        type: 'team_invite',
        title: 'Invite',
        description: '',
        timestamp: 1,
        severity: 'info',
        read: false,
      },
      {
        id: 'e2',
        type: 'miner_offline',
        title: 'Offline',
        description: '',
        timestamp: 2,
        severity: 'error',
        read: false,
      },
    ],
  });

  await render(<TeamsScreen {...navProps} />);
  await waitFor(() => expect(screen.getByLabelText('teams.markTeamRead')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('teams.markTeamRead'));

  await waitFor(() => {
    expect(useActivityFeedStore.getState().getTeamUnreadCount()).toBe(0);
  });
  expect(useActivityFeedStore.getState().events.find((e) => e.id === 'e2')?.read).toBe(false);
});
