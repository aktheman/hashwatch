import { render, screen, cleanup } from '@testing-library/react-native';
import React from 'react';
import { ActivityFeedScreen } from '../src/screens/ActivityFeedScreen';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a0f',
    surface: '#12121a',
    text: '#e2e0ff',
    textDim: '#9694b0',
    primary: '#6c63ff',
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

const mockEvents = [
  {
    id: 'e1',
    type: 'miner_online' as const,
    title: 'Miner Online',
    description: 'Miner A is back online',
    timestamp: Date.now(),
    severity: 'success' as const,
    read: false,
  },
  {
    id: 'e2',
    type: 'alert_fired' as const,
    title: 'Alert Fired',
    description: 'High temperature detected',
    timestamp: Date.now() - 3600000,
    severity: 'warning' as const,
    read: true,
  },
];

let mockFeedState: {
  events: typeof mockEvents;
  markRead: jest.Mock;
  markAllRead: jest.Mock;
  clearEvents: jest.Mock;
};

jest.mock('../src/store/activityFeed', () => ({
  useActivityFeedStore: jest.fn((sel: (s: typeof mockFeedState) => unknown) => sel(mockFeedState)),
}));

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockFeedState = {
    events: [],
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    clearEvents: jest.fn(),
  };
});

it('renders the screen', async () => {
  const tree = await render(<ActivityFeedScreen />);
  expect(tree.toJSON()).toBeTruthy();
});

it('shows stats section when events exist', async () => {
  mockFeedState = { ...mockFeedState, events: mockEvents };
  await render(<ActivityFeedScreen />);
  expect(screen.getByText('Total')).toBeTruthy();
  expect(screen.getByText('Unread')).toBeTruthy();
  expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(1);
});

it('shows filter bar when events exist', async () => {
  mockFeedState = { ...mockFeedState, events: mockEvents };
  await render(<ActivityFeedScreen />);
  expect(screen.getByText('All')).toBeTruthy();
  expect(screen.getByText('Alerts')).toBeTruthy();
  expect(screen.getByText('Firmware')).toBeTruthy();
});

it('shows empty state when no events', async () => {
  await render(<ActivityFeedScreen />);
  expect(screen.getByText('No activity yet')).toBeTruthy();
});

it('renders events when they exist', async () => {
  mockFeedState = { ...mockFeedState, events: mockEvents };
  await render(<ActivityFeedScreen />);
  expect(screen.getByText('Miner Online')).toBeTruthy();
  expect(screen.getByText('Alert Fired')).toBeTruthy();
  expect(screen.getByText('Miner A is back online')).toBeTruthy();
});

it('shows mark all read button', async () => {
  mockFeedState = { ...mockFeedState, events: mockEvents };
  await render(<ActivityFeedScreen />);
  expect(screen.getByText('Mark All Read')).toBeTruthy();
});

it('shows clear all button', async () => {
  mockFeedState = { ...mockFeedState, events: mockEvents };
  await render(<ActivityFeedScreen />);
  expect(screen.getByText('Clear All')).toBeTruthy();
});

it('filter chips are rendered', async () => {
  mockFeedState = { ...mockFeedState, events: mockEvents };
  await render(<ActivityFeedScreen />);
  expect(screen.getByText('Miner Online/Offline')).toBeTruthy();
  expect(screen.getByText('Maintenance')).toBeTruthy();
  expect(screen.getByText('Teams')).toBeTruthy();
  expect(screen.getByText('Settings')).toBeTruthy();
});
