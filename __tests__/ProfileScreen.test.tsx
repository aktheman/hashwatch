import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import ProfileScreen from '../src/screens/ProfileScreen';

let mockToken: string | null = null;
let mockEmail: string | null = null;
const mockLogout = jest.fn();
let mockMiners: any[] = [];
let mockIsPro = false;

jest.mock('../src/store/auth', () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = { token: mockToken, email: mockEmail, logout: mockLogout };
    return selector ? selector(state) : state;
  },
}));

jest.mock('../src/store/miners', () => ({
  useMinerStore: (selector?: (state: any) => any) => {
    const state = { miners: mockMiners };
    return selector ? selector(state) : state;
  },
}));

jest.mock('../src/store/subscription', () => ({
  useSubscriptionStore: (selector?: (state: any) => any) => {
    const state = { isPro: mockIsPro };
    return selector ? selector(state) : state;
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

jest.mock('../src/utils/haptics', () => ({
  light: jest.fn(),
  medium: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function okResponse(data: unknown) {
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

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockToken = 'token-123';
  mockEmail = 'test@example.com';
  mockMiners = [
    { id: 'm1', name: 'M1', ip: '10.0.0.1', isOnline: true },
    { id: 'm2', name: 'M2', ip: '10.0.0.2', isOnline: false },
    { id: 'm3', name: 'M3', ip: '10.0.0.3', isOnline: true },
  ];
  mockIsPro = false;
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(okResponse({}));
});

afterEach(() => jest.restoreAllMocks());

it('renders the screen with signed-out placeholder when logged out', async () => {
  mockToken = null;
  mockEmail = null;
  await render(<ProfileScreen />);
  expect(screen.getByTestId('profile-screen')).toBeTruthy();
  expect(screen.getByText('profile.notSignedIn')).toBeTruthy();
  expect(screen.queryByText('profile.changePassword')).toBeNull();
});

it('renders email and change password section when logged in', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByText('test@example.com')).toBeTruthy();
  expect(screen.getByText('profile.changePassword')).toBeTruthy();
});

it('shows avatar initial from email', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByText('T')).toBeTruthy();
});

it('shows free badge by default', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByText('settings.free')).toBeTruthy();
});

it('shows pro badge when subscribed', async () => {
  mockIsPro = true;
  await render(<ProfileScreen />);
  expect(screen.getByText('settings.pro')).toBeTruthy();
});

it('shows miner stats counts', async () => {
  await render(<ProfileScreen />);
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
  expect(screen.getByText('1')).toBeTruthy();
});

it('shows zero stats when there are no miners', async () => {
  mockMiners = [];
  await render(<ProfileScreen />);
  expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
});

it('alerts when new password is too short', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<ProfileScreen />);
  await fireEvent.changeText(screen.getByLabelText('profile.currentPassword'), 'oldpass');
  await fireEvent.changeText(screen.getByLabelText('profile.newPassword'), 'short');
  await fireEvent.changeText(screen.getByLabelText('profile.confirmPassword'), 'short');
  await fireEvent.press(screen.getByText('profile.updatePassword'));
  expect(alertSpy).toHaveBeenCalledWith('profile.error', 'profile.passwordTooShort');
  alertSpy.mockRestore();
});

it('alerts when passwords do not match', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<ProfileScreen />);
  await fireEvent.changeText(screen.getByLabelText('profile.currentPassword'), 'oldpass');
  await fireEvent.changeText(screen.getByLabelText('profile.newPassword'), 'newpass123');
  await fireEvent.changeText(screen.getByLabelText('profile.confirmPassword'), 'different');
  await fireEvent.press(screen.getByText('profile.updatePassword'));
  expect(alertSpy).toHaveBeenCalledWith('profile.error', 'profile.passwordMismatch');
  alertSpy.mockRestore();
});

it('changes password successfully', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<ProfileScreen />);
  await fireEvent.changeText(screen.getByLabelText('profile.currentPassword'), 'oldpass');
  await fireEvent.changeText(screen.getByLabelText('profile.newPassword'), 'newpass123');
  await fireEvent.changeText(screen.getByLabelText('profile.confirmPassword'), 'newpass123');
  await fireEvent.press(screen.getByText('profile.updatePassword'));
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/auth/change-password',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
        body: JSON.stringify({ currentPassword: 'oldpass', newPassword: 'newpass123' }),
      }),
    );
  });
  expect(hapticMocks().success).toHaveBeenCalled();
  expect(alertSpy).toHaveBeenCalledWith('profile.success', 'profile.passwordChanged');
  await waitFor(() => {
    expect(screen.getByLabelText('profile.newPassword').props.value).toBe('');
    expect(screen.getByLabelText('profile.confirmPassword').props.value).toBe('');
  });
  alertSpy.mockRestore();
});

it('shows server error message when password change is rejected', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockFetch.mockResolvedValue({
    ok: false,
    status: 400,
    json: async () => ({ error: 'Wrong password' }),
  });
  await render(<ProfileScreen />);
  await fireEvent.changeText(screen.getByLabelText('profile.currentPassword'), 'bad');
  await fireEvent.changeText(screen.getByLabelText('profile.newPassword'), 'newpass123');
  await fireEvent.changeText(screen.getByLabelText('profile.confirmPassword'), 'newpass123');
  await fireEvent.press(screen.getByText('profile.updatePassword'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('profile.error', 'Wrong password');
  });
  expect(hapticMocks().error).toHaveBeenCalled();
  alertSpy.mockRestore();
});

it('shows fallback error on network failure', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockFetch.mockRejectedValue('network down');
  await render(<ProfileScreen />);
  await fireEvent.changeText(screen.getByLabelText('profile.currentPassword'), 'oldpass');
  await fireEvent.changeText(screen.getByLabelText('profile.newPassword'), 'newpass123');
  await fireEvent.changeText(screen.getByLabelText('profile.confirmPassword'), 'newpass123');
  await fireEvent.press(screen.getByText('profile.updatePassword'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('profile.error', 'profile.changePasswordFailed');
  });
  alertSpy.mockRestore();
});

it('shows saving label while request is in flight', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let resolveReq!: (v: unknown) => void;
  mockFetch.mockImplementationOnce(
    () =>
      new Promise((res) => {
        resolveReq = res;
      }),
  );
  await render(<ProfileScreen />);
  await fireEvent.changeText(screen.getByLabelText('profile.currentPassword'), 'oldpass');
  await fireEvent.changeText(screen.getByLabelText('profile.newPassword'), 'newpass123');
  await fireEvent.changeText(screen.getByLabelText('profile.confirmPassword'), 'newpass123');
  await fireEvent.press(screen.getByText('profile.updatePassword'));
  await waitFor(() => {
    expect(screen.getByText('profile.saving')).toBeTruthy();
  });
  resolveReq(okResponse({}));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('profile.success', 'profile.passwordChanged');
  });
  alertSpy.mockRestore();
});

it('signs out when confirmed', async () => {
  const alertSpy = mockAlertButton('profile.signOut');
  await render(<ProfileScreen />);
  await fireEvent.press(screen.getByLabelText('profile.signOut'));
  expect(mockLogout).toHaveBeenCalled();
  alertSpy.mockRestore();
});

it('does not sign out when cancelled', async () => {
  const alertSpy = mockAlertButton('common.cancel');
  await render(<ProfileScreen />);
  await fireEvent.press(screen.getByLabelText('profile.signOut'));
  expect(mockLogout).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});

it('deletes account when confirmed', async () => {
  const alertSpy = mockAlertButton('common.delete');
  await render(<ProfileScreen />);
  await fireEvent.press(screen.getByLabelText('profile.deleteAccount'));
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/auth/account',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
  expect(mockLogout).toHaveBeenCalled();
  expect(hapticMocks().success).toHaveBeenCalled();
  alertSpy.mockRestore();
});

it('alerts when account deletion fails', async () => {
  const alertSpy = mockAlertButton('common.delete');
  mockFetch.mockRejectedValue(new Error('boom'));
  await render(<ProfileScreen />);
  await fireEvent.press(screen.getByLabelText('profile.deleteAccount'));
  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('profile.error', 'profile.deleteAccountFailed');
  });
  expect(mockLogout).not.toHaveBeenCalled();
  expect(hapticMocks().error).toHaveBeenCalled();
  alertSpy.mockRestore();
});
