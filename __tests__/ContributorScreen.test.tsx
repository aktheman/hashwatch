import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ContributorScreen } from '../src/screens/ContributorScreen';

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

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Linking = { openURL: jest.fn() };
  return RN;
});

const mockFetchContributors = jest.fn();
const mockFetchRepoStats = jest.fn();

jest.mock('../src/api/github', () => ({
  fetchContributors: (...args: any[]) => mockFetchContributors(...args),
  fetchRepoStats: (...args: any[]) => mockFetchRepoStats(...args),
  getContributorRank: (index: number) => {
    if (index === 0) return { badge: '🥇' };
    if (index === 1) return { badge: '🥈' };
    if (index === 2) return { badge: '🥉' };
    return { badge: null };
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchContributors.mockResolvedValue([
    { id: 1, login: 'alice', avatar_url: 'https://img.test/a.png', contributions: 42 },
    { id: 2, login: 'bob', avatar_url: 'https://img.test/b.png', contributions: 15 },
  ]);
  mockFetchRepoStats.mockResolvedValue({
    stargazers_count: 100,
    forks_count: 20,
    open_issues_count: 5,
    subscribers_count: 10,
  });
});

it('renders the screen title', async () => {
  await render(<ContributorScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('contributors.title')).toBeTruthy();
  });
});

it('shows loading state initially', async () => {
  mockFetchContributors.mockReturnValue(new Promise(() => {}));
  mockFetchRepoStats.mockReturnValue(new Promise(() => {}));
  await render(<ContributorScreen navigation={{ navigate: jest.fn() } as any} />);
  expect(screen.getByText('contributors.loading')).toBeTruthy();
});

it('shows contributor names after loading', async () => {
  await render(<ContributorScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('alice')).toBeTruthy();
    expect(screen.getByText('bob')).toBeTruthy();
  });
});

it('shows repo stats after loading', async () => {
  await render(<ContributorScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('contributors.totalContributors')).toBeTruthy();
    expect(screen.getByText('contributors.totalCommits')).toBeTruthy();
    expect(screen.getByText('contributors.openIssues')).toBeTruthy();
  });
});

it('shows error state on fetch failure', async () => {
  mockFetchContributors.mockRejectedValue(new Error('Network error'));
  mockFetchRepoStats.mockRejectedValue(new Error('Network error'));
  await render(<ContributorScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('Network error')).toBeTruthy();
    expect(screen.getByText('common.retry')).toBeTruthy();
  });
});

it('shows contribute button', async () => {
  await render(<ContributorScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getByText('contributors.contribute')).toBeTruthy();
  });
});

it('shows contribution counts', async () => {
  await render(<ContributorScreen navigation={{ navigate: jest.fn() } as any} />);
  await waitFor(() => {
    expect(screen.getAllByText(/contributors.contributions/).length).toBeGreaterThanOrEqual(1);
  });
});
