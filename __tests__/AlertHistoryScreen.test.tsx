import { render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import React from 'react';
import { AlertHistoryScreen } from '../src/screens/AlertHistoryScreen';
import { useAlertHistoryStore } from '../src/store/alertHistory';

const mockNavigate = jest.fn();

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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) {
        return Object.entries(opts).reduce((s, [k, v]) => s.replace(`{{${k}}}`, String(v)), key);
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  useAlertHistoryStore.setState({ events: [] });
});

it('renders title and empty state', async () => {
  await render(<AlertHistoryScreen navigation={{ navigate: mockNavigate } as any} />);
  expect(screen.getByText('alertHistory.noAlerts')).toBeTruthy();
});

it('shows Mark All Read and Clear All buttons when events exist', async () => {
  useAlertHistoryStore.setState({
    events: [
      {
        id: 'a1',
        minerId: 'm1',
        minerName: 'Miner1',
        type: 'offline',
        title: 'Miner1 went offline',
        timestamp: Date.now(),
        read: false,
      },
    ],
  });
  await render(<AlertHistoryScreen navigation={{ navigate: mockNavigate } as any} />);
  expect(screen.getByText('alertHistory.markAllRead')).toBeTruthy();
  expect(screen.getByText('alertHistory.clearAll')).toBeTruthy();
});

it('renders event title and miner name', async () => {
  useAlertHistoryStore.setState({
    events: [
      {
        id: 'a1',
        minerId: 'm1',
        minerName: 'Miner1',
        type: 'offline',
        title: 'Miner1 went offline',
        timestamp: Date.now(),
        read: false,
      },
    ],
  });
  await render(<AlertHistoryScreen navigation={{ navigate: mockNavigate } as any} />);
  expect(screen.getByText('Miner1 went offline')).toBeTruthy();
  expect(screen.getAllByText(/Miner1/).length).toBeGreaterThanOrEqual(1);
});

it('marks event as read on press', async () => {
  const markRead = jest.fn();
  useAlertHistoryStore.setState({
    events: [
      {
        id: 'a1',
        minerId: 'm1',
        minerName: 'Miner1',
        type: 'offline',
        title: 'Miner1 went offline',
        timestamp: Date.now(),
        read: false,
      },
    ],
    markRead,
  });
  await render(<AlertHistoryScreen navigation={{ navigate: mockNavigate } as any} />);
  fireEvent.press(screen.getByText('Miner1 went offline'));
  expect(markRead).toHaveBeenCalledWith('a1');
});

it('calls markAllRead when button pressed', async () => {
  const markAllRead = jest.fn();
  useAlertHistoryStore.setState({
    events: [
      {
        id: 'a1',
        minerId: 'm1',
        minerName: 'Miner1',
        type: 'offline',
        title: 'Miner1 went offline',
        timestamp: Date.now(),
        read: false,
      },
    ],
    markAllRead,
  });
  await render(<AlertHistoryScreen navigation={{ navigate: mockNavigate } as any} />);
  fireEvent.press(screen.getByText('alertHistory.markAllRead'));
  expect(markAllRead).toHaveBeenCalled();
});

it('calls clearAll when button pressed', async () => {
  const clearAll = jest.fn();
  useAlertHistoryStore.setState({
    events: [
      {
        id: 'a1',
        minerId: 'm1',
        minerName: 'Miner1',
        type: 'offline',
        title: 'Miner1 went offline',
        timestamp: Date.now(),
        read: false,
      },
    ],
    clearAll,
  });
  await render(<AlertHistoryScreen navigation={{ navigate: mockNavigate } as any} />);
  fireEvent.press(screen.getByText('alertHistory.clearAll'));
  expect(clearAll).toHaveBeenCalled();
});

it('groups events by date', async () => {
  const now = Date.now();
  useAlertHistoryStore.setState({
    events: [
      {
        id: 'a1',
        minerId: 'm1',
        minerName: 'Miner1',
        type: 'offline',
        title: 'Miner1 went offline',
        timestamp: now,
        read: false,
      },
      {
        id: 'a2',
        minerId: 'm2',
        minerName: 'Miner2',
        type: 'online',
        title: 'Miner2 reconnected',
        timestamp: now - 86400000,
        read: true,
      },
    ],
  });
  await render(<AlertHistoryScreen navigation={{ navigate: mockNavigate } as any} />);
  expect(screen.getByText('alertHistory.today')).toBeTruthy();
  expect(screen.getByText('alertHistory.yesterday')).toBeTruthy();
});

it('renders alert icon based on type', async () => {
  useAlertHistoryStore.setState({
    events: [
      {
        id: 'a1',
        minerId: 'm1',
        minerName: 'Miner1',
        type: 'hot',
        title: 'Miner1 hot',
        timestamp: Date.now(),
        read: false,
      },
    ],
  });
  await render(<AlertHistoryScreen navigation={{ navigate: mockNavigate } as any} />);
  expect(screen.getByText('🔥')).toBeTruthy();
});

it('shows default bell icon for unknown alert type', async () => {
  useAlertHistoryStore.setState({
    events: [
      {
        id: 'a1',
        minerId: 'm1',
        minerName: 'Miner1',
        type: 'unknown_type',
        title: 'Unknown alert',
        timestamp: Date.now(),
        read: false,
      },
    ],
  });
  await render(<AlertHistoryScreen navigation={{ navigate: mockNavigate } as any} />);
  expect(screen.getByText('🔔')).toBeTruthy();
});
