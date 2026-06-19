import { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSubscriptionStore } from '../store/subscription';
import { useTheme } from '../theme';
import { useTranslation } from 'react-i18next';

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
          padding: 16,
        },
        hero: {
          alignItems: 'center',
          marginTop: 12,
          marginBottom: 28,
        },
        heroIcon: {
          fontSize: 40,
          marginBottom: 12,
        },
        heroTitle: {
          color: theme.text,
          fontSize: 28,
          fontWeight: '800',
          letterSpacing: -0.5,
        },
        heroSub: {
          color: theme.textDim,
          fontSize: 14,
          marginTop: 6,
          textAlign: 'center',
        },
        planCard: {
          backgroundColor: theme.surface,
          borderRadius: 16,
          padding: 20,
          marginBottom: 12,
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
          right: 20,
          backgroundColor: theme.primary,
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 10,
        },
        proBadgeText: {
          color: '#FFF',
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.5,
        },
        planHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        planName: {
          color: theme.text,
          fontSize: 20,
          fontWeight: '700',
        },
        priceRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 2,
        },
        planPrice: {
          color: theme.text,
          fontSize: 32,
          fontWeight: '800',
        },
        planPeriod: {
          color: theme.textDim,
          fontSize: 14,
        },
        featureList: {
          marginTop: 16,
          gap: 8,
        },
        featureItem: {
          color: theme.textDim,
          fontSize: 14,
          fontWeight: '500',
        },
        featureCheck: {
          color: theme.success,
          fontWeight: '700',
          marginRight: 4,
        },
        currentBadge: {
          backgroundColor: theme.surfaceLight,
          borderRadius: 8,
          padding: 10,
          alignItems: 'center',
          marginTop: 16,
          borderWidth: 1,
          borderColor: theme.border,
        },
        activeBadge: {
          backgroundColor: theme.success + '1A',
          borderColor: theme.success + '4D',
        },
        currentBadgeText: {
          color: theme.textMuted,
          fontWeight: '700',
          fontSize: 13,
        },
        upgradeBtn: {
          backgroundColor: theme.primary,
          borderRadius: 12,
          padding: 14,
          alignItems: 'center',
          marginTop: 16,
        },
        upgradeBtnText: {
          color: '#FFF',
          fontWeight: '800',
          fontSize: 16,
        },
        btnDisabled: {
          opacity: 0.5,
        },
        restoreBtn: {
          padding: 14,
          alignItems: 'center',
          marginTop: 4,
        },
        restoreBtnText: {
          color: theme.textDim,
          fontSize: 14,
          fontWeight: '600',
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
          <TouchableOpacity
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
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Restore Purchases"
        style={[styles.restoreBtn, loading && styles.btnDisabled]}
        onPress={restore}
        disabled={loading}
      >
        <Text style={styles.restoreBtnText}>{t('subscription.restorePurchases')}</Text>
      </TouchableOpacity>
    </View>
  );
}
