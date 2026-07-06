import { render, cleanup, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { NotificationHistoryScreen } from '../src/screens/NotificationHistoryScreen';
import { useNotificationHistoryStore } from '../src/store/notificationHistory';
import { Alert } from 'react-native';

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0d0d1a',
    surface: '#1a1a2e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    textMuted: '#666',
    primary: '#6C63FF',
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
  }),
}));

jest.mock('react-native-chart-kit', () => ({
  LineChart: () => null,
}));

const mockNavigate = jest.fn();

beforeEach(() => {
  cleanup();
  useNotificationHistoryStore.setState({ history: [] });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

it('shows empty state when no notifications', async () => {
  const tree = await render(
    <NotificationHistoryScreen navigation={{ navigate: mockNavigate } as any} />,
  );
  expect(tree.getByText('notificationHistory.title')).toBeTruthy();
  expect(tree.getByText('notificationHistory.noNotifications')).toBeTruthy();
});

it('renders notification entries grouped by date', async () => {
  useNotificationHistoryStore.setState({
    history: [
      {
        id: 'n1',
        token: 'tok1',
        title: 'Miner Offline',
        body: 'ASIC1 went offline',
        data: {},
        sentAt: Date.now(),
        status: 'sent',
      },
      {
        id: 'n2',
        token: 'tok1',
        title: 'High Temperature',
        body: 'ASIC1 is 75°C',
        data: {},
        sentAt: Date.now() - 86400000,
        status: 'failed',
      },
    ],
  });

  const tree = await render(
    <NotificationHistoryScreen navigation={{ navigate: mockNavigate } as any} />,
  );
  expect(tree.getByText('Miner Offline')).toBeTruthy();
  expect(tree.getByText('High Temperature')).toBeTruthy();
  expect(tree.getByText('Today')).toBeTruthy();
  expect(tree.getByText('Yesterday')).toBeTruthy();
});

it('renders multiple items in the same date group', async () => {
  const now = Date.now();
  useNotificationHistoryStore.setState({
    history: [
      {
        id: 'n1',
        token: 'tok1',
        title: 'Alert One',
        body: 'First',
        data: {},
        sentAt: now,
        status: 'sent',
      },
      {
        id: 'n2',
        token: 'tok1',
        title: 'Alert Two',
        body: 'Second',
        data: {},
        sentAt: now + 1000,
        status: 'sent',
      },
    ],
  });

  const tree = await render(
    <NotificationHistoryScreen navigation={{ navigate: mockNavigate } as any} />,
  );
  expect(tree.getByText('Alert One')).toBeTruthy();
  expect(tree.getByText('Alert Two')).toBeTruthy();
});

it('shows clear all button and triggers confirmation', async () => {
  useNotificationHistoryStore.setState({
    history: [
      {
        id: 'n1',
        token: 'tok1',
        title: 'Test',
        body: 'test body',
        data: {},
        sentAt: Date.now(),
        status: 'sent',
      },
    ],
  });

  const tree = await render(
    <NotificationHistoryScreen navigation={{ navigate: mockNavigate } as any} />,
  );
  const clearBtn = tree.getByText('notificationHistory.clearAction');
  expect(clearBtn).toBeTruthy();
  await fireEvent.press(clearBtn);
  expect(Alert.alert).toHaveBeenCalled();
});

it('renders status badge for sent and failed', async () => {
  useNotificationHistoryStore.setState({
    history: [
      {
        id: 'n1',
        token: 'tok1',
        title: 'Sent Alert',
        body: '',
        data: {},
        sentAt: Date.now(),
        status: 'sent',
      },
      {
        id: 'n2',
        token: 'tok1',
        title: 'Failed Alert',
        body: '',
        data: {},
        sentAt: Date.now(),
        status: 'failed',
      },
    ],
  });

  const tree = await render(
    <NotificationHistoryScreen navigation={{ navigate: mockNavigate } as any} />,
  );
  expect(tree.getByText('Sent Alert')).toBeTruthy();
  expect(tree.getByText('Failed Alert')).toBeTruthy();
});

it('does not render body when body is empty', async () => {
  useNotificationHistoryStore.setState({
    history: [
      {
        id: 'n1',
        token: 'tok1',
        title: 'No Body',
        body: '',
        data: {},
        sentAt: Date.now(),
        status: 'sent',
      },
    ],
  });

  const tree = await render(
    <NotificationHistoryScreen navigation={{ navigate: mockNavigate } as any} />,
  );
  expect(tree.getByText('No Body')).toBeTruthy();
});
