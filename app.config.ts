export default {
  expo: {
    name: 'HashWatch',
    slug: 'hashwatch',
    version: '1.0.0',
    description:
      'Real-time BitAxe miner monitoring — track hashrate, temperature, pool stats, and more.',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    backgroundColor: '#0A0A1A',
    primaryColor: '#6C63FF',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.hashwatch.app',
      buildNumber: '1',
      infoPlist: {
        NSLocalNetworkUsageDescription:
          'HashWatch needs local network access to discover and monitor BitAxe miners on your network.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    web: {
      favicon: './assets/favicon.png',
      lang: 'en',
      themeColor: '#0A0A1A',
      shortName: 'HashWatch',
      scope: '/',
      startUrl: '/',
      display: 'standalone',
      barColor: '#0A0A1A',
      prefersColorScheme: 'dark',
      description:
        'Real-time BitAxe miner monitoring — track hashrate, temperature, pool stats, and more.',
      build: {
        pwa: {
          serviceWorkerPath: 'service-worker.js',
          appScope: '/',
        },
      },
    },
    plugins: [
      'expo-sqlite',
      'expo-localization',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#6C63FF',
        },
      ],
      'expo-updates',
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: '35.0.0',
            kotlinVersion: '2.0.21',
          },
          ios: {
            deploymentTarget: '16.4',
          },
        },
      ],
    ],
    android: {
      adaptiveIcon: {
        backgroundColor: '#0A0A1A',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      package: 'com.hashwatch.app',
      versionCode: 1,
      usesCleartextTraffic: true,
      permissions: [
        'ACCESS_WIFI_STATE',
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
      ],
    },
    extra: {
      eas: {
        projectId: '7e9a5883-0170-44fc-be43-ccba1e11db30',
      },
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000',
      minerProxyUrl:
        process.env.EXPO_PUBLIC_MINER_PROXY_URL ||
        process.env.EXPO_PUBLIC_API_URL ||
        'http://localhost:4000',
      revenuecatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
      revenuecatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
      posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY || '',
      posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || '',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/7e9a5883-0170-44fc-be43-ccba1e11db30',
    },
  },
};
