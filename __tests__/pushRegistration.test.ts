jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(),
}));

jest.mock('../src/services/notifications', () => ({
  requestNotificationPermissions: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/api/client', () => ({
  BASE_URL: 'https://example.com',
}));

import { registerPushToken, unregisterPushToken } from '../src/services/pushRegistration';
import { getExpoPushTokenAsync } from 'expo-notifications';
import { requestNotificationPermissions } from '../src/services/notifications';

const mockGetToken = getExpoPushTokenAsync as jest.Mock;
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

it('requests notification permissions before registering', async () => {
  (requestNotificationPermissions as jest.Mock).mockResolvedValueOnce(true);
  mockGetToken.mockResolvedValueOnce({ data: 'expo-token' });

  await registerPushToken('auth-token');

  expect(requestNotificationPermissions).toHaveBeenCalled();
});

it('skips registration when permissions are denied', async () => {
  (requestNotificationPermissions as jest.Mock).mockResolvedValueOnce(false);

  await registerPushToken('auth-token');

  expect(mockGetToken).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
});

it('registers push token with backend', async () => {
  (requestNotificationPermissions as jest.Mock).mockResolvedValueOnce(true);
  mockGetToken.mockResolvedValueOnce({ data: 'expo-token-123' });

  await registerPushToken('auth-token');

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

  await registerPushToken(null);

  expect(mockFetch).not.toHaveBeenCalled();
});

it('does not crash on failure', async () => {
  (requestNotificationPermissions as jest.Mock).mockRejectedValueOnce(
    new Error('permissions error'),
  );

  await expect(registerPushToken('auth-token')).resolves.toBeUndefined();
});

describe('unregisterPushToken', () => {
  it('sends DELETE request to backend', async () => {
    mockGetToken.mockResolvedValueOnce({ data: 'expo-token' });

    await unregisterPushToken('auth-token');

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

    await unregisterPushToken(null);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not crash on failure', async () => {
    mockGetToken.mockRejectedValueOnce(new Error('token error'));

    await expect(unregisterPushToken('auth-token')).resolves.toBeUndefined();
  });
});
