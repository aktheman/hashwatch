import { View, Text, StyleSheet } from 'react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useNetworkStatus } from '../services/networkStatus';
import { spacing, fontSize, fontWeight } from '../utils/design';

export const OfflineBanner = React.memo(function OfflineBanner() {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.warning,
          paddingVertical: spacing.xxs,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
        },
        text: {
          color: '#000',
          fontSize: fontSize.sm,
          fontWeight: fontWeight.bold,
        },
      }),
    [theme],
  );

  if (isOnline) return null;

  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLabel={t('offlineBanner.offline')}
    >
      <Text style={styles.text}>{t('offlineBanner.offline')}</Text>
    </View>
  );
});
