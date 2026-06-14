import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../theme';
import { useNetworkStatus } from '../services/networkStatus';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.warning,
          paddingVertical: 6,
          paddingHorizontal: 16,
          alignItems: 'center',
        },
        text: {
          color: '#000',
          fontSize: 12,
          fontWeight: '700',
        },
      }),
    [theme],
  );

  if (isOnline) return null;

  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLabel="You are offline, showing cached data"
    >
      <Text style={styles.text}>You are offline — showing cached data</Text>
    </View>
  );
}
