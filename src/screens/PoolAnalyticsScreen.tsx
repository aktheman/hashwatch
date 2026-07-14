import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { usePoolAnalyticsStore } from '../store/poolAnalytics';

type Provider = 'braiins' | 'luxor';

export function PoolAnalyticsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { stats, config, loading, error, fetchStats, saveConfig, loadConfig } =
    usePoolAnalyticsStore();

  const [provider, setProvider] = useState<Provider>('braiins');
  const [apiKey, setApiKey] = useState('');
  const [poolUser, setPoolUser] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (config.length > 0) {
      fetchStats();
    }
  }, [config.length, fetchStats]);

  const onRefresh = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await saveConfig({ provider, apiKey, poolUser });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setApiKey('');
    setPoolUser('');
    await fetchStats();
  }, [provider, apiKey, poolUser, saveConfig, fetchStats]);

  const luckColor = useMemo(() => {
    if (stats.length === 0) return theme.textDim;
    const avgLuck = stats.reduce((s, st) => s + st.luck, 0) / stats.length;
    if (avgLuck > 100) return theme.success;
    if (avgLuck >= 90) return theme.warning;
    return theme.danger;
  }, [stats, theme]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bg },
        headerBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: 16,
          paddingBottom: 8,
        },
        headerTitle: {
          color: theme.text,
          fontSize: fontSize.h1,
          fontWeight: fontWeight.extrabold,
          letterSpacing: -0.5,
        },
        headerSub: { color: theme.textDim, fontSize: fontSize.sm, marginTop: spacing.xxs },
        scroll: { paddingBottom: 40 },
        card: {
          backgroundColor: theme.surface,
          marginHorizontal: spacing.md,
          marginBottom: spacing.md,
          borderRadius: radius.lg,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.border,
        },
        cardTitle: {
          color: theme.text,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.md,
        },
        providerRow: {
          flexDirection: 'row',
          gap: spacing.xs,
          marginBottom: spacing.md,
        },
        providerBtn: {
          flex: 1,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          borderWidth: 1,
          alignItems: 'center',
        },
        providerBtnText: {
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        inputLabel: {
          color: theme.textDim,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          marginBottom: spacing.xxs,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        input: {
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: spacing.sm,
          color: theme.text,
          fontSize: fontSize.md,
          borderWidth: 1,
          borderColor: theme.border,
          marginBottom: spacing.md,
        },
        saveBtn: {
          backgroundColor: theme.primary,
          borderRadius: radius.md,
          paddingVertical: spacing.sm,
          alignItems: 'center',
        },
        saveBtnText: {
          color: '#FFF',
          fontWeight: fontWeight.bold,
          fontSize: fontSize.md,
        },
        statsRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.xs,
          marginBottom: spacing.md,
        },
        statCard: {
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: spacing.md,
          minWidth: 100,
          flex: 1,
          borderWidth: 1,
          borderColor: theme.border,
          alignItems: 'center',
        },
        statValue: {
          fontSize: fontSize.h2,
          fontWeight: fontWeight.extrabold,
          color: theme.text,
        },
        statLabel: {
          fontSize: fontSize.xs,
          color: theme.textDim,
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: spacing.xxs,
        },
        lastUpdated: {
          color: theme.textMuted,
          fontSize: fontSize.xs,
          marginTop: spacing.xs,
          textAlign: 'center',
        },
        emptyState: {
          alignItems: 'center',
          padding: spacing.xxl,
        },
        emptyIcon: {
          fontSize: 40,
          marginBottom: spacing.md,
        },
        emptyText: {
          color: theme.textDim,
          fontSize: fontSize.base,
          textAlign: 'center',
          lineHeight: 20,
        },
        successText: {
          color: theme.success,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          textAlign: 'center',
          marginBottom: spacing.sm,
        },
        errorText: {
          color: theme.danger,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          textAlign: 'center',
          marginBottom: spacing.sm,
        },
        statsHeader: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.sm,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>{t('poolAnalytics.title')}</Text>
          <Text style={styles.headerSub}>{t('poolAnalytics.subtitle')}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.surface}
          />
        }
      >
        {config.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔗</Text>
            <Text style={styles.emptyText}>{t('poolAnalytics.noConfig')}</Text>
          </View>
        ) : (
          stats.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.statsHeader}>{t('poolAnalytics.stats')}</Text>
              {stats.map((s, i) => (
                <View key={`${s.provider}-${i}`} style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{s.hashrate.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>{t('poolAnalytics.hashrate')}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{s.btcEarned.toFixed(8)}</Text>
                    <Text style={styles.statLabel}>{t('poolAnalytics.btcEarned')}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>${s.usdEarned.toFixed(2)}</Text>
                    <Text style={styles.statLabel}>{t('poolAnalytics.usdEarned')}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: luckColor }]}>
                      {s.luck.toFixed(1)}%
                    </Text>
                    <Text style={styles.statLabel}>{t('poolAnalytics.luck')}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{s.activeWorkers}</Text>
                    <Text style={styles.statLabel}>{t('poolAnalytics.activeWorkers')}</Text>
                  </View>
                </View>
              ))}
              <Text style={styles.lastUpdated}>
                {t('poolAnalytics.lastUpdated')}: {new Date(stats[0].lastUpdated).toLocaleString()}
              </Text>
            </View>
          )
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('poolAnalytics.addConfig')}</Text>

          <Text style={styles.inputLabel}>{t('poolAnalytics.provider')}</Text>
          <View style={styles.providerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: provider === 'braiins' }}
              style={[
                styles.providerBtn,
                {
                  backgroundColor: provider === 'braiins' ? theme.primary : theme.surfaceLight,
                  borderColor: provider === 'braiins' ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setProvider('braiins')}
            >
              <Text
                style={[
                  styles.providerBtnText,
                  { color: provider === 'braiins' ? '#FFF' : theme.text },
                ]}
              >
                {t('poolAnalytics.braiins')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: provider === 'luxor' }}
              style={[
                styles.providerBtn,
                {
                  backgroundColor: provider === 'luxor' ? theme.primary : theme.surfaceLight,
                  borderColor: provider === 'luxor' ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setProvider('luxor')}
            >
              <Text
                style={[
                  styles.providerBtnText,
                  { color: provider === 'luxor' ? '#FFF' : theme.text },
                ]}
              >
                {t('poolAnalytics.luxor')}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.inputLabel}>{t('poolAnalytics.apiKey')}</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder={t('poolAnalytics.apiKeyPlaceholder')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>{t('poolAnalytics.poolUser')}</Text>
          <TextInput
            style={styles.input}
            value={poolUser}
            onChangeText={setPoolUser}
            placeholder={t('poolAnalytics.poolUserPlaceholder')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {saved && <Text style={styles.successText}>{t('poolAnalytics.configSaved')}</Text>}
          {error && <Text style={styles.errorText}>{t('poolAnalytics.fetchError')}</Text>}

          <Pressable
            accessibilityRole="button"
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? t('poolAnalytics.saving') : t('poolAnalytics.save')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
