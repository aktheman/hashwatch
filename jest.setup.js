require('@testing-library/jest-native/extend-expect');

// Required for React 19 concurrent features (Suspense, lazy) in test environment
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-i18next', () => {
  const mockT = (key, opts) => {
    if (opts) {
      return Object.entries(opts).reduce(
        (s, [k, v]) => s.replace(`{{${k}}}`, String(v)),
        key,
      );
    }
    return key;
  };
  return {
    useTranslation: () => ({
      t: mockT,
      i18n: { changeLanguage: jest.fn(), language: 'en' },
    }),
    withTranslation: () => (Component) => {
      const Wrapped = (props) => {
        const { createElement } = require('react');
        return createElement(Component, { ...props, t: mockT });
      };
      return Wrapped;
    },
    initReactI18next: { type: '3rdParty', init: jest.fn() },
  };
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  getExpoPushTokenAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));

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

