import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';

interface ErrorBannerProps {
  message: string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        banner: {
          backgroundColor: theme.danger + '18',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 10,
          marginHorizontal: 16,
          borderRadius: 12,
          marginBottom: 8,
          gap: 8,
          borderWidth: 1,
          borderColor: theme.danger + '30',
        },
        icon: {
          fontSize: 14,
        },
        text: {
          color: theme.danger,
          fontSize: 13,
          flex: 1,
          fontWeight: '500',
        },
        actions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        btn: {
          backgroundColor: theme.danger + '30',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 6,
        },
        btnText: {
          color: theme.danger,
          fontSize: 12,
          fontWeight: '700',
        },
        dismiss: {
          color: theme.textMuted,
          fontSize: 14,
          fontWeight: '300',
        },
      }),
    [theme],
  );

  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>⚠</Text>
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.btn}>
            <Text style={styles.btnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('errorBoundary.unexpectedError')}
            onPress={onDismiss}
          >
            <Text style={styles.dismiss}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
