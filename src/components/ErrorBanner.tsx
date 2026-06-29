import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontWeight } from '../utils/design';

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
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          marginHorizontal: spacing.lg,
          borderRadius: radius.md,
          marginBottom: spacing.sm,
          gap: spacing.sm,
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
          fontWeight: fontWeight.regular,
        },
        actions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        btn: {
          backgroundColor: theme.danger + '30',
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
        },
        btnText: {
          color: theme.danger,
          fontSize: 12,
          fontWeight: fontWeight.bold,
        },
        dismiss: {
          color: theme.textMuted,
          fontSize: 14,
          fontWeight: fontWeight.regular,
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
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.btn}>
            <Text style={styles.btnText}>{t('common.retry')}</Text>
          </Pressable>
        )}
        {onDismiss && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('errorBoundary.unexpectedError')}
            onPress={onDismiss}
          >
            <Text style={styles.dismiss}>✕</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
