import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import './src/i18n';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { getSetting } from './src/db/database';
import { requestNotificationPermissions } from './src/services/notifications';
import { useAuthStore } from './src/store/auth';
import {
  darkTheme,
  useTheme,
  setTheme,
  setThemeMode,
} from './src/theme';
import { initProxyUrl } from './src/constants';
import { initCrashReporting } from './src/utils/crash';
import { initAnalytics } from './src/utils/analytics';

const OnboardingScreen = lazy(() =>
  import('./src/screens/OnboardingScreen').then((m) => ({ default: m.OnboardingScreen })),
);
const WhatsNewModal = lazy(() =>
  import('./src/components/WhatsNewModal').then((m) => ({ default: m.WhatsNewModal })),
);

export default function App() {
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = 'html,body,#root{height:100%;margin:0;overflow-x:hidden}';
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        requestNotificationPermissions();
        initCrashReporting({ enabled: true });
        initAnalytics({ enabled: true });
        await initProxyUrl();
        const saved = await getSetting('theme_mode');
        if (
          saved === 'system' ||
          saved === 'dark' ||
          saved === 'light' ||
          saved === 'matrix' ||
          saved === 'neon' ||
          saved === '5tratum'
        ) {
          setThemeMode(saved);
        } else {
          setTheme(darkTheme);
        }
        const done = await getSetting('onboarding_complete');
        setShowOnboarding(done !== 'true');
        await useAuthStore.getState().restoreSession();
      } catch {
        // init failed but we still show the app
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        loading: {
          flex: 1,
          backgroundColor: theme.bg,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }),
    [theme],
  );

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <>
        <StatusBar style={theme.bg === darkTheme.bg ? 'light' : 'dark'} />
        <Suspense fallback={null}>
          <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
        </Suspense>
      </>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar style={theme.bg === darkTheme.bg ? 'light' : 'dark'} />
      <Suspense fallback={null}>
        <WhatsNewModal />
      </Suspense>
      <AppNavigator />
    </ErrorBoundary>
  );
}
