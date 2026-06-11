require('@testing-library/jest-native/extend-expect');

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:4000',
        revenuecatIosKey: 'test_mock_ios_key',
        revenuecatAndroidKey: 'test_mock_android_key',
      },
    },
  },
}));
