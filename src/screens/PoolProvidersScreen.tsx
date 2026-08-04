import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { getAvailableProviders, fetchAllPoolStats, PoolStats } from '../services/poolProviders';
import {
  getPayoutHistory,
  recordPoolSnapshot,
  summarizePayouts,
  clearPayoutHistory,
  PayoutEntry,
} from '../services/payoutHistory';
import { getSetting, setSetting } from '../db/database';
import { formatBTC } from '../utils/hashrate';
import * as haptics from '../utils/haptics';

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  braiins: 'Braiins',
  luxor: 'Luxor',
  viabtc: 'ViaBTC',
  f2pool: 'F2Pool',
  poolin: 'Poolin',
};

interface ConnectedProvider {
  name: string;
  apiKey: string;
  stats: PoolStats | null;
  loading: boolean;
  error: string | null;
}

export function PoolProvidersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [connected, setConnected] = useState<ConnectedProvider[]>([]);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<PayoutEntry[]>([]);

  const loadPayoutHistory = useCallback(async () => {
    setPayoutHistory(await getPayoutHistory());
  }, []);

  useEffect(() => {
    loadPayoutHistory();
  }, [loadPayoutHistory]);

  const availableProviders = useMemo(() => getAvailableProviders(), []);

  const loadProviders = useCallback(async () => {
    const providers: ConnectedProvider[] = [];
    for (const name of availableProviders) {
      const stored = await getSetting(`pool_provider_${name}`);
      if (stored) {
        providers.push({
          name,
          apiKey: stored,
          stats: null,
          loading: true,
          error: null,
        });
      }
    }
    setConnected(providers);

    if (providers.length > 0) {
      const allStats = await fetchAllPoolStats(
        providers.map((p) => ({ name: p.name, apiKey: p.apiKey })),
      );
      setConnected((prev) =>
        prev.map((p) => ({
          ...p,
          stats: allStats[p.name] ?? null,
          loading: false,
          error: allStats[p.name] === null ? 'Failed to fetch stats' : null,
        })),
      );
      for (const name of providers) {
        const stats = allStats[name.name];
        if (stats) {
          void recordPoolSnapshot(name.name, stats.lastPayout, stats.payoutPending).then(() =>
            loadPayoutHistory(),
          );
        }
      }
    }

    setInitialized(true);
  }, [availableProviders]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProviders();
    setRefreshing(false);
  }, [loadProviders]);

  const handleConnect = useCallback(
    async (providerName: string) => {
      const key = (apiKeyInputs[providerName] || '').trim();
      if (!key) {
        Alert.alert(
          t('poolProviders.apiKeyRequired', 'API Key Required'),
          t('poolProviders.apiKeyRequiredBody', 'Please enter a valid API key.'),
        );
        return;
      }

      setConnecting(providerName);
      haptics.light();

      try {
        await setSetting(`pool_provider_${providerName}`, key);
        setApiKeyInputs((prev) => ({ ...prev, [providerName]: '' }));

        const results = await fetchAllPoolStats([{ name: providerName, apiKey: key }]);
        const stats = results[providerName] ?? null;

        if (!stats) {
          await setSetting(`pool_provider_${providerName}`, '');
          Alert.alert(
            t('poolProviders.connectionFailed', 'Connection Failed'),
            t(
              'poolProviders.connectionFailedBody',
              'Could not connect to this provider. Check your API key.',
            ),
          );
          setConnecting(null);
          return;
        }

        setConnected((prev) => {
          const filtered = prev.filter((p) => p.name !== providerName);
          return [
            ...filtered,
            { name: providerName, apiKey: key, stats, loading: false, error: null },
          ];
        });

        haptics.success();
      } catch {
        await setSetting(`pool_provider_${providerName}`, '');
        Alert.alert(
          t('poolProviders.connectionFailed', 'Connection Failed'),
          t(
            'poolProviders.connectionFailedBody',
            'Could not connect to this provider. Check your API key.',
          ),
        );
      } finally {
        setConnecting(null);
      }
    },
    [apiKeyInputs, t],
  );

  const handleDisconnect = useCallback(
    async (providerName: string) => {
      Alert.alert(
        t('poolProviders.disconnectTitle', 'Disconnect Provider'),
        t(
          'poolProviders.disconnectBody',
          'Are you sure you want to disconnect from this provider?',
        ),
        [
          { text: t('common.cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('poolProviders.disconnect', 'Disconnect'),
            style: 'destructive',
            onPress: async () => {
              haptics.light();
              await setSetting(`pool_provider_${providerName}`, '');
              setConnected((prev) => prev.filter((p) => p.name !== providerName));
            },
          },
        ],
      );
    },
    [t],
  );

  const connectedNames = useMemo(() => new Set(connected.map((p) => p.name)), [connected]);

  const payoutSummary = useMemo(() => summarizePayouts(payoutHistory), [payoutHistory]);

  const handleClearPayouts = useCallback(async () => {
    haptics.light();
    await clearPayoutHistory();
    setPayoutHistory([]);
  }, []);

  const multiPoolOverview = useMemo(() => {
    if (connected.length < 2) return null;
    const totalHashrate = connected.reduce((sum, p) => sum + (p.stats?.hashrate ?? 0), 0);
    const totalWorkers = connected.reduce((sum, p) => sum + (p.stats?.workers ?? 0), 0);
    const totalEarnings = connected.reduce((sum, p) => sum + (p.stats?.earnings24h ?? 0), 0);
    const avgLuck =
      connected.filter((p) => p.stats).length > 0
        ? connected.filter((p) => p.stats).reduce((sum, p) => sum + (p.stats!.luck ?? 0), 0) /
          connected.filter((p) => p.stats).length
        : 0;

    return { totalHashrate, totalWorkers, totalEarnings, avgLuck };
  }, [connected]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bg },
        headerBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xs,
        },
        headerTitle: {
          color: theme.text,
          fontSize: fontSize.h1,
          fontWeight: fontWeight.extrabold,
          letterSpacing: -0.5,
        },
        headerSub: {
          color: theme.textDim,
          fontSize: fontSize.sm,
          marginTop: spacing.xxs,
        },
        scroll: { paddingBottom: 40 },
        card: {
          backgroundColor: theme.surface,
          marginHorizontal: spacing.md,
          marginBottom: spacing.md,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        cardHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        providerName: {
          color: theme.text,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.bold,
        },
        statusBadge: {
          paddingHorizontal: spacing.xs,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
        },
        statusConnected: {
          backgroundColor: theme.success + '30',
        },
        statusDisconnected: {
          backgroundColor: theme.textMuted + '30',
        },
        statusText: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
        },
        inputLabel: {
          color: theme.textDim,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          marginTop: spacing.md,
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
        },
        maskedKey: {
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: spacing.sm,
          color: theme.textDim,
          fontSize: fontSize.md,
          fontFamily: 'monospace',
          borderWidth: 1,
          borderColor: theme.border,
        },
        connectBtn: {
          marginTop: spacing.md,
          backgroundColor: theme.primary,
          borderRadius: radius.md,
          paddingVertical: spacing.sm,
          alignItems: 'center',
        },
        connectBtnDisabled: {
          opacity: 0.6,
        },
        disconnectBtn: {
          marginTop: spacing.md,
          backgroundColor: theme.danger + '20',
          borderRadius: radius.md,
          paddingVertical: spacing.sm,
          alignItems: 'center',
        },
        btnText: {
          color: '#FFF',
          fontWeight: fontWeight.bold,
          fontSize: fontSize.md,
        },
        disconnectBtnText: {
          color: theme.danger,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.md,
        },
        statsRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.xs,
          marginTop: spacing.md,
        },
        statCard: {
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: spacing.sm,
          minWidth: 80,
          flex: 1,
          borderWidth: 1,
          borderColor: theme.border,
          alignItems: 'center',
        },
        statValue: {
          fontSize: fontSize.h3,
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
        overviewSection: {
          marginHorizontal: spacing.md,
          marginBottom: spacing.md,
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        overviewTitle: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.sm,
        },
        overviewRow: {
          flexDirection: 'row',
          gap: spacing.xs,
        },
        overviewStat: {
          flex: 1,
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: spacing.sm,
          borderWidth: 1,
          borderColor: theme.border,
          alignItems: 'center',
        },
        overviewValue: {
          fontSize: fontSize.h2,
          fontWeight: fontWeight.extrabold,
          color: theme.primary,
        },
        overviewLabel: {
          fontSize: fontSize.xs,
          color: theme.textDim,
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: spacing.xxs,
        },
        empty: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xxl,
        },
        emptyIcon: {
          fontSize: 48,
          color: theme.textMuted,
          marginBottom: spacing.md,
        },
        emptyTitle: {
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.xs,
        },
        emptyText: {
          color: theme.textDim,
          fontSize: fontSize.md,
          textAlign: 'center',
          lineHeight: 20,
        },
        errorText: {
          color: theme.danger,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          textAlign: 'center',
          marginTop: spacing.xs,
        },
        providerSection: {
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        },
        providerSectionTitle: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.sm,
        },
        providerItem: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.bg,
          borderRadius: radius.md,
          padding: spacing.xs,
          marginBottom: spacing.xs,
        },
        providerItemName: {
          color: theme.text,
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
        },
        providerItemStatus: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
        },
        luckGood: { color: theme.success },
        luckOk: { color: theme.warning },
        luckBad: { color: theme.danger },
        payoutRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        payoutProvider: {
          color: theme.text,
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
        },
        payoutDate: {
          color: theme.textMuted,
          fontSize: fontSize.xs,
          marginTop: spacing.xxs,
        },
        payoutAmount: {
          color: theme.success,
          fontSize: fontSize.base,
          fontWeight: fontWeight.bold,
        },
        clearBtn: {
          marginTop: spacing.md,
          alignSelf: 'flex-start',
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: theme.danger,
        },
        clearBtnText: {
          color: theme.danger,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
      }),
    [theme],
  );

  if (!initialized) {
    return (
      <View style={[styles.container, { paddingTop: spacing.md }]}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>{t('poolProviders.title', 'Pool Providers')}</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>{t('poolProviders.title', 'Pool Providers')}</Text>
          <Text style={styles.headerSub}>
            {t('poolProviders.subtitle', 'Connect to mining pool APIs')}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.surface}
          />
        }
      >
        {connected.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\uD83D\uDD17'}</Text>
            <Text style={styles.emptyTitle}>
              {t('poolProviders.emptyTitle', 'No Providers Connected')}
            </Text>
            <Text style={styles.emptyText}>
              {t(
                'poolProviders.emptyBody',
                'Connect to a mining pool provider below to view stats and earnings.',
              )}
            </Text>
          </View>
        )}

        {connected.length > 0 && multiPoolOverview && (
          <View style={styles.overviewSection}>
            <Text style={styles.overviewTitle}>
              {t('poolProviders.multiPoolOverview', 'Multi-Pool Overview')}
            </Text>
            <View style={styles.overviewRow}>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewValue}>
                  {multiPoolOverview.totalHashrate.toLocaleString()}
                </Text>
                <Text style={styles.overviewLabel}>
                  {t('poolProviders.totalHashrate', 'Total Hashrate')}
                </Text>
              </View>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewValue}>{multiPoolOverview.totalWorkers}</Text>
                <Text style={styles.overviewLabel}>
                  {t('poolProviders.totalWorkers', 'Total Workers')}
                </Text>
              </View>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewValue}>
                  {multiPoolOverview.totalEarnings.toFixed(8)}
                </Text>
                <Text style={styles.overviewLabel}>
                  {t('poolProviders.earnings24h', 'Earnings 24h')}
                </Text>
              </View>
              <View style={styles.overviewStat}>
                <Text
                  style={[
                    styles.overviewValue,
                    multiPoolOverview.avgLuck > 100
                      ? styles.luckGood
                      : multiPoolOverview.avgLuck >= 90
                        ? styles.luckOk
                        : styles.luckBad,
                  ]}
                >
                  {multiPoolOverview.avgLuck.toFixed(1)}%
                </Text>
                <Text style={styles.overviewLabel}>{t('poolProviders.avgLuck', 'Avg Luck')}</Text>
              </View>
            </View>
          </View>
        )}

        {connected.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.providerSectionTitle}>
              {t('poolProviders.connectedProviders', 'Connected Providers')}
            </Text>
            {connected.map((provider) => (
              <View key={provider.name}>
                <View style={styles.cardHeader}>
                  <Text style={styles.providerName}>
                    {PROVIDER_DISPLAY_NAMES[provider.name] ?? provider.name}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      provider.stats ? styles.statusConnected : styles.statusDisconnected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: provider.stats ? theme.success : theme.textMuted },
                      ]}
                    >
                      {provider.stats
                        ? t('poolProviders.connected', 'Connected')
                        : t('poolProviders.disconnected', 'Disconnected')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>{t('poolProviders.apiKey', 'API Key')}</Text>
                <Text style={styles.maskedKey}>
                  {'•'.repeat(12)}
                  {provider.apiKey.slice(-4)}
                </Text>

                {provider.loading && (
                  <ActivityIndicator
                    size="small"
                    color={theme.primary}
                    style={{ marginTop: spacing.md }}
                  />
                )}

                {provider.error && !provider.stats && (
                  <Text style={styles.errorText}>{provider.error}</Text>
                )}

                {provider.stats && (
                  <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>
                        {provider.stats.hashrate.toLocaleString()}
                      </Text>
                      <Text style={styles.statLabel}>
                        {t('poolProviders.hashrate', 'Hashrate')}
                      </Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{provider.stats.activeWorkers}</Text>
                      <Text style={styles.statLabel}>{t('poolProviders.workers', 'Workers')}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{provider.stats.earnings24h.toFixed(8)}</Text>
                      <Text style={styles.statLabel}>
                        {t('poolProviders.earnings24h', 'Earnings 24h')}
                      </Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text
                        style={[
                          styles.statValue,
                          provider.stats.luck > 100
                            ? styles.luckGood
                            : provider.stats.luck >= 90
                              ? styles.luckOk
                              : styles.luckBad,
                        ]}
                      >
                        {provider.stats.luck.toFixed(1)}%
                      </Text>
                      <Text style={styles.statLabel}>{t('poolProviders.luck', 'Luck')}</Text>
                    </View>
                  </View>
                )}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('poolProviders.disconnectProvider', 'Disconnect {{name}}', {
                    name: PROVIDER_DISPLAY_NAMES[provider.name] ?? provider.name,
                  })}
                  style={styles.disconnectBtn}
                  onPress={() => handleDisconnect(provider.name)}
                >
                  <Text style={styles.disconnectBtnText}>
                    {t('poolProviders.disconnect', 'Disconnect')}
                  </Text>
                </Pressable>

                <View style={[styles.providerSection, { borderBottomWidth: 0 }]} />
              </View>
            ))}
          </View>
        )}

        {payoutHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.providerSectionTitle}>
              {t('poolProviders.payoutHistory', 'Payout History')}
            </Text>
            <View style={styles.overviewRow}>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewValue}>{formatBTC(payoutSummary.totalPaid)}</Text>
                <Text style={styles.overviewLabel}>
                  {t('poolProviders.totalPaid', 'Total Paid')}
                </Text>
              </View>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewValue}>{payoutSummary.count}</Text>
                <Text style={styles.overviewLabel}>{t('poolProviders.payouts', 'Payouts')}</Text>
              </View>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewValue}>
                  {payoutSummary.lastPayoutAt > 0
                    ? new Date(payoutSummary.lastPayoutAt).toLocaleDateString()
                    : '—'}
                </Text>
                <Text style={styles.overviewLabel}>
                  {t('poolProviders.lastPayout', 'Last Payout')}
                </Text>
              </View>
            </View>
            {payoutHistory.map((entry) => (
              <View key={entry.id} style={styles.payoutRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payoutProvider}>
                    {PROVIDER_DISPLAY_NAMES[entry.provider] ?? entry.provider}
                  </Text>
                  <Text style={styles.payoutDate}>
                    {new Date(entry.timestamp).toLocaleDateString()}{' '}
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={styles.payoutAmount}>{formatBTC(entry.amount)}</Text>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('poolProviders.clearPayouts', 'Clear payout history')}
              style={styles.clearBtn}
              onPress={handleClearPayouts}
            >
              <Text style={styles.clearBtnText}>
                {t('poolProviders.clearPayouts', 'Clear Payout History')}
              </Text>
            </Pressable>
          </View>
        )}

        {availableProviders
          .filter((name) => !connectedNames.has(name))
          .map((providerName) => (
            <View key={providerName} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.providerName}>
                  {PROVIDER_DISPLAY_NAMES[providerName] ?? providerName}
                </Text>
                <View style={[styles.statusBadge, styles.statusDisconnected]}>
                  <Text style={[styles.statusText, { color: theme.textMuted }]}>
                    {t('poolProviders.notConnected', 'Not Connected')}
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>{t('poolProviders.apiKey', 'API Key')}</Text>
              <TextInput
                style={styles.input}
                value={apiKeyInputs[providerName] || ''}
                onChangeText={(text) =>
                  setApiKeyInputs((prev) => ({ ...prev, [providerName]: text }))
                }
                placeholder={t('poolProviders.apiKeyPlaceholder', 'Enter API key')}
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                accessibilityLabel={t('poolProviders.apiKeyInput', 'API Key for {{name}}', {
                  name: PROVIDER_DISPLAY_NAMES[providerName] ?? providerName,
                })}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('poolProviders.connectProvider', 'Connect to {{name}}', {
                  name: PROVIDER_DISPLAY_NAMES[providerName] ?? providerName,
                })}
                style={[
                  styles.connectBtn,
                  connecting === providerName && styles.connectBtnDisabled,
                ]}
                onPress={() => handleConnect(providerName)}
                disabled={connecting === providerName}
              >
                {connecting === providerName ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.btnText}>{t('poolProviders.connect', 'Connect')}</Text>
                )}
              </Pressable>
            </View>
          ))}

        {availableProviders.filter((name) => !connectedNames.has(name)).length === 0 &&
          connected.length > 0 && (
            <View style={styles.card}>
              <Text style={[styles.emptyText, { textAlign: 'center', padding: spacing.md }]}>
                {t('poolProviders.allConnected', 'All available providers are connected.')}
              </Text>
            </View>
          )}
      </ScrollView>
    </View>
  );
}
