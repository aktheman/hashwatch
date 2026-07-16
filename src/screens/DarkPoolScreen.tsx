import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { useMinerStore } from '../store/miners';
import {
  contributeDarkPool,
  getDarkPoolAggregate,
  getDarkPoolMyContributions,
  deleteDarkPoolMyContributions,
  DarkPoolContribution,
  DarkPoolAggregate,
} from '../api/client';

type Period = '1h' | '24h' | '7d' | '30d';

const PERIODS: Period[] = ['1h', '24h', '7d', '30d'];

const POOL_COLORS: Record<string, string> = {
  braiins: '#4CAF50',
  luxor: '#2196F3',
  ckpool: '#FF9800',
  solo: '#9C27B0',
  other: '#607D8B',
};

export function DarkPoolScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);

  const [optedIn, setOptedIn] = useState(false);
  const [period, setPeriod] = useState<Period>('24h');
  const [aggregate, setAggregate] = useState<DarkPoolAggregate | null>(null);
  const [contributions, setContributions] = useState<DarkPoolContribution[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [contributing, setContributing] = useState(false);

  const onlineMiners = useMemo(() => miners.filter((m) => m.isOnline && m.status), [miners]);

  const totalHashrate = useMemo(
    () => onlineMiners.reduce((sum, m) => sum + (m.status?.hashRate || 0), 0),
    [onlineMiners],
  );

  const totalPower = useMemo(
    () => onlineMiners.reduce((sum, m) => sum + (m.status?.power || 0), 0),
    [onlineMiners],
  );

  const avgTemp = useMemo(() => {
    if (onlineMiners.length === 0) return 0;
    return (
      onlineMiners.reduce((sum, m) => sum + (m.status?.temperature || 0), 0) / onlineMiners.length
    );
  }, [onlineMiners]);

  const fetchAggregate = useCallback(async () => {
    try {
      const data = await getDarkPoolAggregate(period);
      setAggregate(data);
    } catch {}
  }, [period]);

  const fetchContributions = useCallback(async () => {
    try {
      const data = await getDarkPoolMyContributions();
      setContributions(data.slice(0, 10));
    } catch {}
  }, []);

  useEffect(() => {
    if (optedIn) {
      fetchAggregate();
      fetchContributions();
    }
  }, [optedIn, fetchAggregate, fetchContributions]);

  useEffect(() => {
    if (optedIn) {
      fetchAggregate();
    }
  }, [period, fetchAggregate, optedIn]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAggregate(), fetchContributions()]);
    setRefreshing(false);
  }, [fetchAggregate, fetchContributions]);

  const handleContribute = useCallback(async () => {
    if (onlineMiners.length === 0) {
      Alert.alert(t('darkPool.noMiners', 'No online miners'));
      return;
    }
    setContributing(true);
    try {
      await contributeDarkPool({
        hashrate: Math.round(totalHashrate),
        power: totalPower,
        temp: avgTemp || undefined,
        poolName: onlineMiners[0]?.status?.pool || undefined,
      });
      await fetchAggregate();
      await fetchContributions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert(t('darkPool.contributionFailed', 'Contribution failed'), msg);
    } finally {
      setContributing(false);
    }
  }, [onlineMiners, totalHashrate, totalPower, avgTemp, fetchAggregate, fetchContributions, t]);

  const handleDeleteData = useCallback(() => {
    Alert.alert(
      t('darkPool.confirmDelete', 'Delete All Data'),
      t('darkPool.confirmDeleteBody', 'This will remove all your contributions permanently.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDarkPoolMyContributions();
              setContributions([]);
            } catch {}
          },
        },
      ],
    );
  }, [t]);

  const poolTotal = useMemo(() => {
    if (!aggregate) return 0;
    return Object.values(aggregate.poolBreakdown).reduce((a, b) => a + b, 0);
  }, [aggregate]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bg },
        scroll: { padding: spacing.md },
        section: { marginBottom: spacing.lg },
        card: {
          backgroundColor: theme.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        title: {
          fontSize: fontSize.lg,
          fontWeight: fontWeight.bold,
          color: theme.text,
          marginBottom: spacing.sm,
        },
        subtitle: {
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
          color: theme.text,
          marginBottom: spacing.xs,
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing.xs,
        },
        label: { fontSize: fontSize.base, color: theme.textDim },
        value: { fontSize: fontSize.base, color: theme.text, fontWeight: fontWeight.semibold },
        optInRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
          marginBottom: spacing.lg,
        },
        periodSelector: {
          flexDirection: 'row',
          gap: spacing.xs,
          marginBottom: spacing.sm,
        },
        periodChip: {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.sm,
          borderWidth: 1,
        },
        barContainer: {
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          backgroundColor: theme.surfaceLight,
          marginVertical: spacing.xxs,
        },
        bar: {
          height: '100%',
          borderRadius: 4,
        },
        contributeBtn: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          backgroundColor: theme.primary,
          alignItems: 'center',
          marginTop: spacing.sm,
        },
        contributeBtnText: {
          color: '#fff',
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
        },
        deleteBtn: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: theme.danger,
          alignItems: 'center',
          marginTop: spacing.md,
        },
        deleteBtnText: {
          color: theme.danger,
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
        },
        contribItem: {
          paddingVertical: spacing.xs,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        contribText: {
          fontSize: fontSize.sm,
          color: theme.textDim,
        },
        emptyText: {
          fontSize: fontSize.base,
          color: theme.textMuted,
          textAlign: 'center',
          paddingVertical: spacing.lg,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        accessibilityLabel="Dark pool screen"
      >
        <Text style={styles.title}>{t('darkPool.title', 'Dark Pool')}</Text>
        <Text style={styles.label}>
          {t('darkPool.description', 'Contribute anonymized stats to the collective dark pool.')}
        </Text>

        <View style={styles.optInRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subtitle}>{t('darkPool.optIn', 'Participate')}</Text>
            <Text style={styles.label}>
              {t('darkPool.optInDescription', 'Share your miner stats anonymously')}
            </Text>
          </View>
          <Switch
            value={optedIn}
            onValueChange={setOptedIn}
            trackColor={{ false: theme.textMuted, true: theme.primary + '80' }}
            thumbColor={optedIn ? theme.primary : theme.textMuted}
            accessibilityLabel="Toggle dark pool participation"
          />
        </View>

        {optedIn && (
          <>
            <View style={styles.section}>
              <Text style={styles.subtitle}>{t('darkPool.yourMiners', 'Your Miners')}</Text>
              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.label}>{t('darkPool.onlineMiners', 'Online')}</Text>
                  <Text style={styles.value}>{onlineMiners.length}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>{t('darkPool.yourHashrate', 'Hashrate')}</Text>
                  <Text style={styles.value}>{(totalHashrate / 1e12).toFixed(2)} TH/s</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>{t('darkPool.yourPower', 'Power')}</Text>
                  <Text style={styles.value}>{totalPower.toFixed(0)} W</Text>
                </View>
                <Pressable
                  onPress={handleContribute}
                  disabled={contributing || onlineMiners.length === 0}
                  style={({ pressed }) => [
                    styles.contributeBtn,
                    { opacity: pressed || contributing ? 0.6 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Contribute stats to dark pool"
                >
                  <Text style={styles.contributeBtnText}>
                    {contributing
                      ? t('darkPool.contributing', 'Contributing...')
                      : t('darkPool.contributeNow', 'Contribute Now')}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.subtitle}>{t('darkPool.networkStats', 'Network Stats')}</Text>
              <View style={styles.periodSelector}>
                {PERIODS.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPeriod(p)}
                    style={[
                      styles.periodChip,
                      {
                        backgroundColor: period === p ? theme.primary + '20' : 'transparent',
                        borderColor: period === p ? theme.primary : theme.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Select period ${p}`}
                  >
                    <Text
                      style={{
                        color: period === p ? theme.primary : theme.textDim,
                        fontSize: fontSize.sm,
                        fontWeight: fontWeight.semibold,
                      }}
                    >
                      {p}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.label}>{t('darkPool.totalHashrate', 'Total Hashrate')}</Text>
                  <Text style={styles.value}>
                    {aggregate ? `${(aggregate.totalHashrate / 1e12).toFixed(2)} TH/s` : '—'}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>{t('darkPool.contributors', 'Contributors')}</Text>
                  <Text style={styles.value}>{aggregate?.contributorCount ?? '—'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>{t('darkPool.avgEfficiency', 'Avg Efficiency')}</Text>
                  <Text style={styles.value}>
                    {aggregate && aggregate.totalHashrate > 0
                      ? `${(aggregate.avgPower / (aggregate.totalHashrate / 1e6)).toFixed(2)} W/TH`
                      : '—'}
                  </Text>
                </View>

                {aggregate && poolTotal > 0 && (
                  <>
                    <Text style={[styles.subtitle, { marginTop: spacing.sm }]}>
                      {t('darkPool.poolDistribution', 'Pool Distribution')}
                    </Text>
                    {Object.entries(aggregate.poolBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([pool, hashrate]) => {
                        const pct = (hashrate / poolTotal) * 100;
                        return (
                          <View key={pool}>
                            <View style={styles.row}>
                              <Text style={styles.label}>{pool}</Text>
                              <Text style={styles.value}>{pct.toFixed(1)}%</Text>
                            </View>
                            <View style={styles.barContainer}>
                              <View
                                style={[
                                  styles.bar,
                                  {
                                    width: `${pct}%`,
                                    backgroundColor: POOL_COLORS[pool] || theme.primary,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        );
                      })}
                  </>
                )}
              </View>
            </View>

            {contributions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.subtitle}>
                  {t('darkPool.recentContributions', 'Recent Contributions')}
                </Text>
                <View style={styles.card}>
                  {contributions.map((c) => (
                    <View key={c.id} style={styles.contribItem}>
                      <Text style={styles.contribText}>
                        {(c.minerHashrate / 1e6).toFixed(2)} TH/s • {c.minerPower.toFixed(0)}W •{' '}
                        {new Date(c.contributedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  onPress={handleDeleteData}
                  style={styles.deleteBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Delete all contribution data"
                >
                  <Text style={styles.deleteBtnText}>
                    {t('darkPool.deleteMyData', 'Delete My Data')}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
