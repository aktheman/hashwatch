import { useState, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { getSetting } from './src/db/database';
import { requestNotificationPermissions } from './src/services/notifications';
import { useAuthStore } from './src/store/auth';
import { darkTheme, lightTheme, useTheme, setTheme, setThemeMode } from './src/theme';
import { initProxyUrl } from './src/constants';

export default function App() {
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      requestNotificationPermissions();
      await initProxyUrl();
      const saved = await getSetting('theme_mode');
      if (saved === 'system' || saved === 'dark' || saved === 'light') {
        setThemeMode(saved);
      } else {
        setTheme(saved === 'light' ? lightTheme : darkTheme);
      }
      const done = await getSetting('onboarding_complete');
      setShowOnboarding(done !== 'true');
      await useAuthStore.getState().restoreSession();
      setReady(true);
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
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      </>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar style={theme.bg === darkTheme.bg ? 'light' : 'dark'} />
      <AppNavigator />
    </ErrorBoundary>
  );
}
