jest.mock('../src/db/database', () => ({
  getSetting: jest.fn(),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/api/client', () => ({
  getNotificationPrefs: jest.fn(),
  setNotificationPref: jest.fn().mockResolvedValue(undefined),
}));

let mockToken: string | null = null;

jest.mock('../src/store/auth', () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = { token: mockToken, userId: null, email: null };
    return selector ? selector(state) : state;
  },
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { NotificationPrefs } from '../src/components/NotificationPrefs';
import { setTheme, darkTheme } from '../src/theme';
import * as DB from '../src/db/database';
import * as Client from '../src/api/client';

const mockGetNotificationPrefs = Client.getNotificationPrefs as jest.Mock;
const mockSetNotificationPref = Client.setNotificationPref as jest.Mock;
const mockGetSetting = DB.getSetting as jest.Mock;
const mockSetSetting = DB.setSetting as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockToken = null;
  setTheme(darkTheme);
  mockGetSetting.mockResolvedValue(null);
});

it('renders notifications title when local prefs loaded', async () => {
  mockGetSetting.mockResolvedValue(JSON.stringify({}));
  await render(<NotificationPrefs minerId="m1" />);
  await waitFor(() => {
    expect(screen.getByText('notificationPrefs.title')).toBeTruthy();
  });
});

it('renders all alert labels', async () => {
  mockGetSetting.mockResolvedValue(JSON.stringify({}));
  await render(<NotificationPrefs minerId="m1" />);
  await waitFor(() => {
    expect(screen.getByText('notificationPrefs.offline')).toBeTruthy();
  });
  expect(screen.getByText('notificationPrefs.online')).toBeTruthy();
  expect(screen.getByText('notificationPrefs.hot')).toBeTruthy();
  expect(screen.getByText('notificationPrefs.hashrateDrop')).toBeTruthy();
  expect(screen.getByText('notificationPrefs.poolLost')).toBeTruthy();
  expect(screen.getByText('notificationPrefs.longUptime')).toBeTruthy();
});

it('defaults switches to true when prefs are empty', async () => {
  mockGetSetting.mockResolvedValue(JSON.stringify({}));
  await render(<NotificationPrefs minerId="m1" />);
  await waitFor(() => {
    expect(screen.getByText('notificationPrefs.offline')).toBeTruthy();
  });
  expect(screen.getByLabelText('notificationPrefs.offline notification').props.value).toBe(true);
});

it('reads persisted prefs from local DB', async () => {
  mockGetSetting.mockResolvedValue(JSON.stringify({ offline: false, hot: true }));
  await render(<NotificationPrefs minerId="m1" />);
  await waitFor(() => {
    expect(screen.getByLabelText('notificationPrefs.offline notification').props.value).toBe(false);
  });
  expect(screen.getByLabelText('notificationPrefs.hot notification').props.value).toBe(true);
});

it('toggles a local pref and persists to DB', async () => {
  mockGetSetting.mockResolvedValue(JSON.stringify({ offline: true }));
  await render(<NotificationPrefs minerId="m1" />);
  await waitFor(() => {
    expect(screen.getByLabelText('notificationPrefs.offline notification')).toBeTruthy();
  });
  fireEvent(
    screen.getByLabelText('notificationPrefs.offline notification'),
    'onValueChange',
    false,
  );
  await waitFor(() => {
    expect(mockSetSetting).toHaveBeenCalledWith(
      'notify_m1',
      expect.stringContaining('"offline":false'),
    );
  });
});

it('reverts switch on local persist failure', async () => {
  mockSetSetting.mockRejectedValueOnce(new Error('db fail'));
  mockGetSetting.mockResolvedValue(JSON.stringify({ offline: true }));
  await render(<NotificationPrefs minerId="m1" />);
  await waitFor(() => {
    expect(screen.getByLabelText('notificationPrefs.offline notification').props.value).toBe(true);
  });
  fireEvent(
    screen.getByLabelText('notificationPrefs.offline notification'),
    'onValueChange',
    false,
  );
  await waitFor(() => {
    expect(mockSetSetting).toHaveBeenCalled();
  });
  expect(screen.getByLabelText('notificationPrefs.offline notification').props.value).toBe(true);
});

it('loads prefs from remote when authed', async () => {
  mockToken = 'abc';
  mockGetNotificationPrefs.mockResolvedValue({ offline: false });
  await render(<NotificationPrefs minerId="m1" />);
  await waitFor(() => {
    expect(mockGetNotificationPrefs).toHaveBeenCalledWith('m1');
  });
});

it('toggles remote pref when authed', async () => {
  mockToken = 'abc';
  mockGetNotificationPrefs.mockResolvedValue({});
  await render(<NotificationPrefs minerId="m1" />);
  await waitFor(() => {
    expect(screen.getByText('notificationPrefs.offline')).toBeTruthy();
  });
  fireEvent(
    screen.getByLabelText('notificationPrefs.offline notification'),
    'onValueChange',
    false,
  );
  await waitFor(() => {
    expect(mockSetNotificationPref).toHaveBeenCalledWith('m1', 'offline', false);
  });
});

it('reverts remote toggle on failure', async () => {
  mockToken = 'abc';
  mockSetNotificationPref.mockRejectedValueOnce(new Error('network fail'));
  mockGetNotificationPrefs.mockResolvedValue({ offline: true });
  await render(<NotificationPrefs minerId="m1" />);
  await waitFor(() => {
    expect(screen.getByLabelText('notificationPrefs.offline notification').props.value).toBe(true);
  });
  fireEvent(
    screen.getByLabelText('notificationPrefs.offline notification'),
    'onValueChange',
    false,
  );
  await waitFor(() => {
    expect(mockSetNotificationPref).toHaveBeenCalled();
  });
  expect(screen.getByLabelText('notificationPrefs.offline notification').props.value).toBe(true);
});

it('handles remote fetch error gracefully', async () => {
  mockToken = 'abc';
  mockGetNotificationPrefs.mockRejectedValueOnce(new Error('fail'));
  await render(<NotificationPrefs minerId="m1" />);
  await waitFor(() => {
    expect(mockGetNotificationPrefs).toHaveBeenCalledWith('m1');
  });
  expect(screen.queryByText('notificationPrefs.title')).toBeNull();
});
