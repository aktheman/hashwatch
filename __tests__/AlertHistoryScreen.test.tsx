import { render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import React from 'react';
import type { AlertEvent } from '../src/store/alertHistory';

const mockNavigate = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkAllRead = jest.fn();
const mockClearAll = jest.fn();
const mockLoadEvents = jest.fn().mockResolvedValue(undefined);
const mockSyncFromBackend = jest.fn().mockResolvedValue(undefined);
const mockSyncToBackend = jest.fn().mockResolvedValue(undefined);

let mockEvents: AlertEvent[] = [];

jest.mock('../src/store/alertHistory', () => ({
  useAlertHistoryStore: jest.fn((sel: (s: unknown) => unknown) =>
    sel({
      events: mockEvents,
      syncing: false,
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      clearAll: mockClearAll,
      loadEvents: mockLoadEvents,
      syncFromBackend: mockSyncFromBackend,
      syncToBackend: mockSyncToBackend,
    }),
  ),
}));

jest.mock('../src/store/auth', () => ({
  useAuthStore: {
    getState: () => ({ token: null }),
  },
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a1a',
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#3B82F6',
    info: '#06B6D4',
  }),
}));

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

const offlineEvent: AlertEvent = {
  id: 'a1',
  minerId: 'm1',
  minerName: 'Miner One',
  type: 'offline',
  title: 'Miner One went offline',
  timestamp: Date.now(),
  read: false,
};

const onlineEvent: AlertEvent = {
  id: 'a2',
  minerId: 'm2',
  minerName: 'Miner Two',
  type: 'online',
  title: 'Miner Two reconnected',
  timestamp: Date.now() - 1000,
  read: true,
};

const renderScreen = () =>
  render(<AlertHistoryScreen navigation={{ navigate: mockNavigate } as never} />);

import { AlertHistoryScreen } from '../src/screens/AlertHistoryScreen';

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockEvents = [];
});

describe('AlertHistoryScreen', () => {
  it('renders the search input', async () => {
    await renderScreen();
    expect(screen.getByPlaceholderText('alertHistory.searchPlaceholder')).toBeTruthy();
  });

  it('loads events on mount', async () => {
    await renderScreen();
    expect(mockLoadEvents).toHaveBeenCalled();
  });

  it('renders filter chips', async () => {
    await renderScreen();
    expect(screen.getByText('alertHistory.filterAll')).toBeTruthy();
    expect(screen.getByText('alertHistory.filterOffline')).toBeTruthy();
    expect(screen.getByText('alertHistory.filterOnline')).toBeTruthy();
  });

  it('filters events by search query', async () => {
    mockEvents = [offlineEvent, onlineEvent];
    await renderScreen();
    expect(screen.getByText('Miner Two reconnected')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByPlaceholderText('alertHistory.searchPlaceholder'),
      'offline',
    );

    expect(screen.getByText('Miner One went offline')).toBeTruthy();
    expect(screen.queryByText('Miner Two reconnected')).toBeNull();
  });

  it('filters events by miner name in the search query', async () => {
    mockEvents = [offlineEvent, onlineEvent];
    await renderScreen();

    await fireEvent.changeText(
      screen.getByPlaceholderText('alertHistory.searchPlaceholder'),
      'miner two',
    );

    expect(screen.queryByText('Miner One went offline')).toBeNull();
    expect(screen.getByText('Miner Two reconnected')).toBeTruthy();
  });

  it('activates the filter when the Offline chip is pressed', async () => {
    mockEvents = [offlineEvent, onlineEvent];
    await renderScreen();
    expect(screen.getByText('Miner Two reconnected')).toBeTruthy();

    await fireEvent.press(screen.getByText('alertHistory.filterOffline'));

    const chip = screen.getByText('alertHistory.filterOffline').parent;
    expect(chip?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#6C63FF' })]),
    );
    expect(screen.getByText('Miner One went offline')).toBeTruthy();
    expect(screen.queryByText('Miner Two reconnected')).toBeNull();
  });

  it('shows the Clear filters button when a filter is active', async () => {
    mockEvents = [offlineEvent];
    await renderScreen();
    expect(screen.queryByText('alertHistory.clearFilters')).toBeNull();

    await fireEvent.press(screen.getByText('alertHistory.filterOffline'));

    expect(screen.getByText('alertHistory.clearFilters')).toBeTruthy();
  });

  it('shows the Clear filters button when a search is active', async () => {
    mockEvents = [offlineEvent];
    await renderScreen();

    await fireEvent.changeText(
      screen.getByPlaceholderText('alertHistory.searchPlaceholder'),
      'offline',
    );

    expect(screen.getByText('alertHistory.clearFilters')).toBeTruthy();
  });

  it('Clear filters resets the search query and active filter', async () => {
    mockEvents = [offlineEvent, onlineEvent];
    await renderScreen();

    await fireEvent.changeText(
      screen.getByPlaceholderText('alertHistory.searchPlaceholder'),
      'offline',
    );
    await fireEvent.press(screen.getByText('alertHistory.filterOffline'));
    expect(screen.queryByText('Miner Two reconnected')).toBeNull();

    await fireEvent.press(screen.getByText('alertHistory.clearFilters'));

    expect(screen.queryByText('alertHistory.clearFilters')).toBeNull();
    expect(screen.getByText('Miner One went offline')).toBeTruthy();
    expect(screen.getByText('Miner Two reconnected')).toBeTruthy();
    expect(screen.getByPlaceholderText('alertHistory.searchPlaceholder').props.value).toBe('');
  });

  it('shows the no-matching-alerts empty state when a filter is active but nothing matches', async () => {
    mockEvents = [offlineEvent];
    await renderScreen();

    await fireEvent.changeText(
      screen.getByPlaceholderText('alertHistory.searchPlaceholder'),
      'zzz-no-match',
    );

    expect(screen.getByText('alertHistory.noMatchingAlerts')).toBeTruthy();
    expect(screen.queryByText('alertHistory.noAlerts')).toBeNull();
  });

  it('shows the plain empty state when no filter is active', async () => {
    await renderScreen();
    expect(screen.getByText('alertHistory.noAlerts')).toBeTruthy();
    expect(screen.queryByText('alertHistory.noMatchingAlerts')).toBeNull();
  });
});
