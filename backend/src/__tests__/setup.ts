process.env.JWT_SECRET = 'test-secret-for-testing';
process.env.REVENUECAT_API_KEY = 'test-revenuecat-key';

jest.mock('expo-server-sdk', () => {
  const mockSendPushNotificationsAsync = jest.fn().mockResolvedValue([{ status: 'ok' }]);
  const mockChunkPushNotifications = jest.fn().mockImplementation((msgs) => [msgs]);
  const mockExpo = jest.fn().mockImplementation(() => ({
    chunkPushNotifications: mockChunkPushNotifications,
    sendPushNotificationsAsync: mockSendPushNotificationsAsync,
  }));
  (mockExpo as any).isExpoPushToken = jest.fn().mockReturnValue(true);
  return {
    __esModule: true,
    default: { Expo: mockExpo },
    Expo: mockExpo,
    ExpoPushMessage: {},
    ExpoPushTicket: {},
  };
});
