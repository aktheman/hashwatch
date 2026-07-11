require('@testing-library/jest-native/extend-expect');

// Required for React 19 concurrent features (Suspense, lazy) in test environment
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Suppress cosmetic expo-modules-core warning about missing native module in Jest
const origWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes("ExpoModulesCoreJSLogger")) return;
  origWarn(...args);
};

jest.mock('react-i18next', () => {
  const LOCALE_DATA = {
    'whatsNew.changelog': [
      'Real-time fast polling (5s foreground / 30s background)',
      'Dashboard layout customization (show/hide sections)',
      'Cross-miner overlay charts on Analytics',
      'Enhanced PWA with API caching',
      'Miner groups 2.0 with collapsible sections + group stats',
      'Multi-language support (中文, 日本語, Deutsch, Français)',
      'Custom miner emoji icons',
      'Miner cloning (duplicate)',
      'Dark mode schedule (timer-based auto-switch)',
      'Bulk CSV import/export',
      'Performance improvements',
      'Push notification settings',
      'Keyboard accessibility (Escape to exit selection mode)',
      'Shareable miner snapshot card',
      "What's New / changelog modal",
    ],
    'whatsNew.changelogV1': [
      'Initial release',
      'Miner dashboard with world map',
      'Real-time hashrate/temp monitoring',
      'Historical charts on Analytics',
      'Wallet management',
      'Miner groups',
      'Theme system (5 themes)',
      'PWA support',
      'CSV export',
      'Miner alerts (offline/hot/hashrate drop)',
      'Pool statistics',
    ],
    'subscription.freeFeatures': ['Up to 4 miners', 'Live dashboard', 'Basic stats', 'Push alerts'],
    'subscription.proFeatures': ['Unlimited miners', '30-day charts', 'Push notifications', 'Multi-wallet'],
  };
  const mockT = (key, opts) => {
    if (opts?.returnObjects) {
      return LOCALE_DATA[key] || [];
    }
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
