const mockQuery = jest.fn();
jest.mock('../db', () => ({ query: mockQuery }));

import {
  sendPushNotification,
  sendMinerOfflineNotification,
  sendMinerOnlineNotification,
  sendMinerHotNotification,
  sendHashrateDropNotification,
  sendPoolChangeNotification,
} from '../services/pushNotifications';

const mockSendPushNotificationsAsync = jest.fn().mockResolvedValue([{ status: 'ok' }]);
const mockChunkPushNotifications = jest
  .fn()
  .mockImplementation((msgs: { to?: string }[]) => [msgs]);
const mockExpoConstructor = jest.fn().mockImplementation(() => ({
  chunkPushNotifications: mockChunkPushNotifications,
  sendPushNotificationsAsync: mockSendPushNotificationsAsync,
})) as jest.Mock & { isExpoPushToken?: jest.Mock };
mockExpoConstructor.isExpoPushToken = jest.fn().mockReturnValue(true);

jest.mock('expo-server-sdk', () => ({
  __esModule: true,
  default: { Expo: mockExpoConstructor },
  Expo: mockExpoConstructor,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockExpoConstructor.isExpoPushToken = jest.fn().mockReturnValue(true);
});

describe('sendPushNotification', () => {
  it('sends a push notification with tokens', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token: 'ExpoPushToken-abc123' }] });

    await sendPushNotification('user-1', 'test_type', 'Test Title', 'Test body');

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT token, alert_types FROM push_tokens WHERE userId = $1',
      ['user-1'],
    );
    expect(mockChunkPushNotifications).toHaveBeenCalled();
    expect(mockSendPushNotificationsAsync).toHaveBeenCalled();
  });

  it('returns early when user has no tokens', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await sendPushNotification('user-1', 'test_type', 'Title', 'Body');

    expect(mockChunkPushNotifications).not.toHaveBeenCalled();
    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('filters out invalid Expo push tokens', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ token: 'invalid-token' }, { token: 'ExpoPushToken-valid' }],
    });
    mockExpoConstructor.isExpoPushToken = jest
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await sendPushNotification('user-1', 'test_type', 'Title', 'Body');

    expect(mockChunkPushNotifications).toHaveBeenCalledWith(
      expect.not.arrayContaining([expect.objectContaining({ to: 'invalid-token' })]),
    );
  });

  it('handles errors during push send silently', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token: 'ExpoPushToken-abc' }] });
    mockSendPushNotificationsAsync.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      sendPushNotification('user-1', 'test_type', 'Title', 'Body'),
    ).resolves.toBeUndefined();
  });

  it('sends data with type when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token: 'ExpoPushToken-abc' }] });

    await sendPushNotification('user-1', 'test_type', 'Title', 'Body');

    expect(mockChunkPushNotifications).toHaveBeenCalledWith([
      expect.objectContaining({ data: { type: 'test_type' } }),
    ]);
  });
});

describe('sendMinerOfflineNotification', () => {
  it('sends offline notification', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token: 'ExpoPushToken-abc' }] });

    await sendMinerOfflineNotification('user-1', 'MyMiner', '192.168.1.100', 'miner-1');

    expect(mockSendPushNotificationsAsync).toHaveBeenCalled();
  });
});

describe('sendMinerOnlineNotification', () => {
  it('sends online notification', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token: 'ExpoPushToken-abc' }] });

    await sendMinerOnlineNotification('user-1', 'MyMiner', '192.168.1.100', 'miner-1');

    expect(mockSendPushNotificationsAsync).toHaveBeenCalled();
  });
});

describe('sendMinerHotNotification', () => {
  it('sends high temperature notification', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token: 'ExpoPushToken-abc' }] });

    await sendMinerHotNotification('user-1', 'MyMiner', '192.168.1.100', 85, 'miner-1');

    expect(mockSendPushNotificationsAsync).toHaveBeenCalled();
  });
});

describe('sendHashrateDropNotification', () => {
  it('sends hashrate drop notification', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token: 'ExpoPushToken-abc' }] });

    await sendHashrateDropNotification('user-1', 'MyMiner', 'miner-1', 50);

    expect(mockSendPushNotificationsAsync).toHaveBeenCalled();
  });
});

describe('sendPushNotification alert_types filtering', () => {
  it('filters out rows that do not match requested type', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ token: 'ExpoPushToken-abc', alert_types: 'online,hot' }],
    });

    await sendPushNotification('user-1', 'offline', 'T', 'B');

    expect(mockChunkPushNotifications).toHaveBeenCalledWith([]);
    expect(mockSendPushNotificationsAsync).toHaveBeenCalledWith([]);
  });
});

describe('sendPoolChangeNotification', () => {
  it('sends with defaulted pool names', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token: 'ExpoPushToken-abc' }] });

    await sendPoolChangeNotification('user-1', 'M1', 'miner-1', null, 'stratum+tcp://pool');

    expect(mockSendPushNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('covers branch when newPool is null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token: 'ExpoPushToken-abc' }] });

    await sendPoolChangeNotification('user-1', 'M1', 'miner-1', 'stratum+tcp://old', null);

    expect(mockSendPushNotificationsAsync).toHaveBeenCalledTimes(1);
  });
});
