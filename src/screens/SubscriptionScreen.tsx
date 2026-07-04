import { useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useSubscriptionStore } from '../store/subscription';
import { useTheme } from '../theme';
import { useTranslation } from 'react-i18next';
import { spacing, radius, fontSize, fontWeight, buttonText } from '../utils/design';

export function SubscriptionScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isPro, tier, loading, purchase, restore } = useSubscriptionStore();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
          padding: spacing.md,
        },
        hero: {
          alignItems: 'center',
          marginTop: spacing.sm,
          marginBottom: spacing.xxl,
        },
        heroIcon: {
          fontSize: fontSize.h1,
          marginBottom: spacing.sm,
        },
        heroTitle: {
          color: theme.text,
          fontSize: fontSize.hero,
          fontWeight: fontWeight.extrabold,
          letterSpacing: -0.5,
        },
        heroSub: {
          color: theme.textDim,
          fontSize: fontSize.base,
          marginTop: spacing.xs,
          textAlign: 'center',
        },
        planCard: {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          padding: spacing.xl,
          marginBottom: spacing.sm,
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: `0 2px 12px ${theme.glow}`,
        },
        planCardActive: {
          borderColor: theme.textMuted,
        },
        proCard: {
          borderColor: theme.primary,
          position: 'relative',
        },
        proBadge: {
          position: 'absolute',
          top: -10,
          right: spacing.lg,
          backgroundColor: theme.primary,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.md,
        },
        proBadgeText: {
          color: buttonText,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.extrabold,
          letterSpacing: 0.5,
        },
        planHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        planName: {
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
        },
        priceRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: spacing.xxs,
        },
        planPrice: {
          color: theme.text,
          fontSize: fontSize.h1,
          fontWeight: fontWeight.extrabold,
        },
        planPeriod: {
          color: theme.textDim,
          fontSize: fontSize.base,
        },
        featureList: {
          marginTop: spacing.md,
          gap: spacing.xs,
        },
        featureItem: {
          color: theme.textDim,
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
        },
        featureCheck: {
          color: theme.success,
          fontWeight: fontWeight.bold,
          marginRight: spacing.xxs,
        },
        currentBadge: {
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.sm,
          padding: spacing.sm,
          alignItems: 'center',
          marginTop: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        activeBadge: {
          backgroundColor: theme.success + '1A',
          borderColor: theme.success + '4D',
        },
        currentBadgeText: {
          color: theme.textMuted,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.sm,
        },
        upgradeBtn: {
          backgroundColor: theme.primary,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
          marginTop: spacing.md,
        },
        upgradeBtnText: {
          color: buttonText,
          fontWeight: fontWeight.extrabold,
          fontSize: fontSize.lg,
        },
        btnDisabled: {
          opacity: 0.5,
        },
        restoreBtn: {
          padding: spacing.md,
          alignItems: 'center',
          marginTop: spacing.xxs,
        },
        restoreBtnText: {
          color: theme.textDim,
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>⭐</Text>
        <Text style={styles.heroTitle}>{t('subscription.title')}</Text>
        <Text style={styles.heroSub}>{t('subscription.subtitle')}</Text>
      </View>

      <View style={[styles.planCard, tier === 'free' && styles.planCardActive]}>
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{t('subscription.free')}</Text>
          <Text style={styles.planPrice}>{t('subscription.freePrice')}</Text>
        </View>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text> Up to 4 miners
          </Text>
          <Text style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text> Live dashboard
          </Text>
          <Text style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text> Basic stats
          </Text>
          <Text style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text> Push alerts
          </Text>
        </View>
        {tier === 'free' && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>{t('subscription.current')}</Text>
          </View>
        )}
      </View>

      <View style={[styles.planCard, styles.proCard]}>
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>{t('subscription.bestValue')}</Text>
        </View>
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{t('subscription.pro')}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.planPrice}>{t('subscription.proPrice')}</Text>
            <Text style={styles.planPeriod}>{t('subscription.perMonth')}</Text>
          </View>
        </View>
        <View style={styles.featureList}>
          {['Unlimited miners', '30-day charts', 'Push notifications', 'Multi-wallet'].map((f) => (
            <Text key={f} style={styles.featureItem}>
              <Text style={styles.featureCheck}>✓</Text> {f}
            </Text>
          ))}
        </View>
        {isPro ? (
          <View style={[styles.currentBadge, styles.activeBadge]}>
            <Text style={[styles.currentBadgeText, { color: theme.success }]}>
              {t('subscription.active')}
            </Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Pro"
            style={[styles.upgradeBtn, loading && styles.btnDisabled]}
            onPress={purchase}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.upgradeBtnText}>{t('subscription.upgradeToPro')}</Text>
            )}
          </Pressable>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Restore Purchases"
        style={[styles.restoreBtn, loading && styles.btnDisabled]}
        onPress={restore}
        disabled={loading}
      >
        <Text style={styles.restoreBtnText}>{t('subscription.restorePurchases')}</Text>
      </Pressable>
    </View>
  );
}
