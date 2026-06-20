jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(),
}));

jest.mock('../src/services/notifications', () => ({
  requestNotificationPermissions: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/api/client', () => ({
  BASE_URL: 'https://example.com',
}));

jest.mock('../src/store/auth', () => {
  const state = { token: null as string | null };
  return {
    useAuthStore: { getState: () => state },
  };
});

import { registerPushToken, unregisterPushToken } from '../src/services/pushRegistration';
import { getExpoPushTokenAsync } from 'expo-notifications';
import { requestNotificationPermissions } from '../src/services/notifications';

const mockGetToken = getExpoPushTokenAsync as jest.Mock;
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  const authMock = jest.requireMock('../src/store/auth') as {
    useAuthStore: { getState: () => { token: string | null } };
  };
  authMock.useAuthStore.getState = () => ({ token: null });
});

it('requests notification permissions before registering', async () => {
  (requestNotificationPermissions as jest.Mock).mockResolvedValueOnce(true);
  mockGetToken.mockResolvedValueOnce({ data: 'expo-token' });
  const authMock = jest.requireMock('../src/store/auth') as {
    useAuthStore: { getState: () => { token: string | null } };
  };
  authMock.useAuthStore.getState = () => ({ token: 'auth-token' });

  await registerPushToken();

  expect(requestNotificationPermissions).toHaveBeenCalled();
});

it('skips registration when permissions are denied', async () => {
  (requestNotificationPermissions as jest.Mock).mockResolvedValueOnce(false);

  await registerPushToken();

  expect(mockGetToken).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
});

it('registers push token with backend', async () => {
  (requestNotificationPermissions as jest.Mock).mockResolvedValueOnce(true);
  mockGetToken.mockResolvedValueOnce({ data: 'expo-token-123' });
  const authMock = jest.requireMock('../src/store/auth') as {
    useAuthStore: { getState: () => { token: string | null } };
  };
  authMock.useAuthStore.getState = () => ({ token: 'auth-token' });

  await registerPushToken();

  expect(mockFetch).toHaveBeenCalledWith(
    'https://example.com/api/push/register',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer auth-token',
      }),
      body: JSON.stringify({ token: 'expo-token-123' }),
    }),
  );
});

it('skips registration when no auth token', async () => {
  (requestNotificationPermissions as jest.Mock).mockResolvedValueOnce(true);
  mockGetToken.mockResolvedValueOnce({ data: 'expo-token' });
  const authMock = jest.requireMock('../src/store/auth') as {
    useAuthStore: { getState: () => { token: string | null } };
  };
  authMock.useAuthStore.getState = () => ({ token: null });

  await registerPushToken();

  expect(mockFetch).not.toHaveBeenCalled();
});

it('does not crash on failure', async () => {
  (requestNotificationPermissions as jest.Mock).mockRejectedValueOnce(
    new Error('permissions error'),
  );

  await expect(registerPushToken()).resolves.toBeUndefined();
});

describe('unregisterPushToken', () => {
  it('sends DELETE request to backend', async () => {
    mockGetToken.mockResolvedValueOnce({ data: 'expo-token' });
    const authMock = jest.requireMock('../src/store/auth') as {
      useAuthStore: { getState: () => { token: string | null } };
    };
    authMock.useAuthStore.getState = () => ({ token: 'auth-token' });

    await unregisterPushToken();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/api/push/unregister',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
        }),
        body: JSON.stringify({ token: 'expo-token' }),
      }),
    );
  });

  it('skips when no auth token', async () => {
    mockGetToken.mockResolvedValueOnce({ data: 'expo-token' });
    const authMock = jest.requireMock('../src/store/auth') as {
      useAuthStore: { getState: () => { token: string | null } };
    };
    authMock.useAuthStore.getState = () => ({ token: null });

    await unregisterPushToken();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not crash on failure', async () => {
    mockGetToken.mockRejectedValueOnce(new Error('token error'));

    await expect(unregisterPushToken()).resolves.toBeUndefined();
  });
});
