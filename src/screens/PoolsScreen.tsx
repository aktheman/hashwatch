import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useMinerStore } from '../store/miners';
import { useTheme } from '../theme';
import { MetricTile } from '../components/DashboardComponents';
import { SkeletonCard } from '../components/SkeletonCard';
import { Miner, NavigationProp } from '../types';
import {
  toHashesPerSecond,
  formatHashrateValue,
  estimateBTCPerDay,
  formatBTC,
} from '../utils/hashrate';
import { useTranslation } from 'react-i18next';

interface PoolGroup {
  pool: string;
  poolPort: number;
  poolUser: string;
  miners: Miner[];
  totalHashrate: number;
  totalSharesAccepted: number;
  totalSharesRejected: number;
  bestDiff: string;
}

interface PoolsScreenProps {
  navigation: NavigationProp;
}

function formatRate(hashesPerSecond: number): string {
  return formatHashrateValue(hashesPerSecond);
}

export function PoolsScreen({ navigation }: PoolsScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const loading = useMinerStore((s) => s.loading);
  const initialized = useMinerStore((s) => s.initialized);
  const refreshAll = useMinerStore((s) => s.refreshAll);

  const previousPools = useRef<Record<string, string>>({});
  const [changedPools, setChangedPools] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const poolGroups = useMemo(() => {
    const groups: Record<string, PoolGroup> = {};
    for (const m of miners) {
      if (!m.status?.pool) continue;
      const key = `${m.status.pool}:${m.status.poolPort || 3333}`;
      if (!groups[key]) {
        groups[key] = {
          pool: m.status.pool,
          poolPort: m.status.poolPort || 3333,
          poolUser: m.status.poolUser || '',
          miners: [],
          totalHashrate: 0,
          totalSharesAccepted: 0,
          totalSharesRejected: 0,
          bestDiff: '0',
        };
      }
      groups[key].miners.push(m);
      groups[key].totalHashrate += toHashesPerSecond(m.status.hashRate || 0, m.status.hashRateUnit);
      groups[key].totalSharesAccepted += m.status.sharesAccepted || 0;
      groups[key].totalSharesRejected += m.status.sharesRejected || 0;
      const bd = parseFloat(m.status.bestDiff);
      const cur = parseFloat(groups[key].bestDiff);
      if (!isNaN(bd) && bd > cur) {
        groups[key].bestDiff = m.status.bestDiff;
      }
    }
    return Object.values(groups).sort((a, b) => b.totalHashrate - a.totalHashrate);
  }, [miners]);

  useEffect(() => {
    const freshChanged = new Set<string>();
    for (const g of poolGroups) {
      for (const m of g.miners) {
        const prev = previousPools.current[m.id];
        if (prev && prev !== g.pool) {
          freshChanged.add(g.pool);
        }
        previousPools.current[m.id] = g.pool;
      }
    }
    setChangedPools(freshChanged);
  }, [poolGroups]);

  const renderItem = useCallback(
    ({ item }: { item: PoolGroup }) => {
      const totalShares = item.totalSharesAccepted + item.totalSharesRejected;
      const acceptRate =
        totalShares > 0 ? ((item.totalSharesAccepted / totalShares) * 100).toFixed(1) : '\u2014';
      const hasChanged = changedPools.has(item.pool);
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.poolName} numberOfLines={1}>
                  {item.pool}:{item.poolPort}
                </Text>
                {hasChanged && (
                  <View style={styles.changeBadge}>
                    <Text style={styles.changeBadgeText}>{String(t('pools.poolChanged'))}</Text>
                  </View>
                )}
              </View>
              {item.poolUser && (
                <Text style={styles.poolUser} numberOfLines={1}>
                  {item.poolUser}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.statRow}>
            <MetricTile
              title={String(t('pools.hashrate'))}
              value={formatRate(item.totalHashrate)}
              accent="info"
            />
            <MetricTile
              title={String(t('pools.estDaily'))}
              value={
                estimateBTCPerDay(item.totalHashrate) > 0
                  ? formatBTC(estimateBTCPerDay(item.totalHashrate))
                  : '\u2014'
              }
              accent="success"
            />
            <MetricTile
              title={String(t('pools.miners'))}
              value={String(item.miners.length)}
              accent="primary"
            />
          </View>
          <View style={styles.statRow}>
            <MetricTile
              title={String(t('pools.shares'))}
              value={totalShares.toLocaleString()}
              accent="warning"
            />
            <MetricTile
              title={String(t('pools.acceptRate'))}
              value={`${acceptRate}%`}
              accent="success"
            />
            <MetricTile
              title={String(t('pools.bestDiff'))}
              value={item.bestDiff}
              accent="primary"
            />
          </View>
          <View style={styles.minerList}>
            {item.miners.map((m) => (
              <Pressable
                accessibilityRole="button"
                key={m.id}
                accessibilityLabel={`View miner: ${m.name}`}
                style={styles.minerRow}
                onPress={() => navigation.navigate('MinerDetail', { minerId: m.id })}
              >
                <View
                  style={[
                    styles.minerDot,
                    { backgroundColor: m.isOnline ? theme.success : theme.danger },
                  ]}
                />
                <Text style={styles.minerName} numberOfLines={1}>
                  {m.name}
                </Text>
                <Text style={styles.minerHash}>
                  {formatRate(toHashesPerSecond(m.status?.hashRate || 0, m.status?.hashRateUnit))}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    },
    [changedPools, theme, t, navigation.navigate],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bg },
        headerBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
        },
        headerTitle: { color: theme.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
        headerSub: { color: theme.textDim, fontSize: 12, marginTop: 2 },
        empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
        emptyIcon: { fontSize: 48, color: theme.textMuted, marginBottom: 16 },
        emptyTitle: { color: theme.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
        emptyText: { color: theme.textDim, fontSize: 14, textAlign: 'center' },
        card: {
          backgroundColor: theme.surface,
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: `0 2px 12px ${theme.glow}`,
        },
        cardHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        poolName: { color: theme.text, fontSize: 16, fontWeight: '700', flex: 1 },
        poolUser: { color: theme.textDim, fontSize: 12, fontFamily: 'monospace', marginTop: 2 },
        statRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
        stat: { flex: 1 },
        statValue: { color: theme.text, fontSize: 22, fontWeight: '800' },
        statLabel: {
          color: theme.textDim,
          fontSize: 10,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 2,
        },
        minerList: { marginTop: 12, gap: 6 },
        minerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.bg,
          borderRadius: 10,
          padding: 10,
        },
        minerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
        minerName: { color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 },
        minerHash: { color: theme.primary, fontSize: 13, fontWeight: '700' },
        changeBadge: {
          backgroundColor: theme.warning + '30',
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 2,
        },
        changeBadgeText: {
          backgroundColor: theme.warning + '30',
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 2,
        },
        comparisonTable: {
          marginHorizontal: 16,
          marginBottom: 12,
          backgroundColor: theme.surface,
          borderRadius: 16,
          padding: 12,
          borderWidth: 1,
          borderColor: theme.border,
        },
        comparisonRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 6,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        comparisonHeader: {
          flex: 1,
          color: theme.textDim,
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        comparisonCell: {
          flex: 1,
          color: theme.text,
          fontSize: 13,
          fontWeight: '600',
        },
      }),
    [theme],
  );

  if (!initialized || (loading && miners.length === 0)) {
    return (
      <View style={[styles.container, { paddingTop: 16 }]}>
        <SkeletonCard rows={3} />
        <SkeletonCard rows={3} />
      </View>
    );
  }

  if (poolGroups.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>{t('pools.title')}</Text>
            <Text style={styles.headerSub}>{t('pools.subtitle')}</Text>
          </View>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{'\uD83C\uDF0A'}</Text>
          <Text style={styles.emptyTitle}>{t('pools.noPools')}</Text>
          <Text style={styles.emptyText}>{t('pools.noPoolsBody')}</Text>
        </View>
      </View>
    );
  }

  const poolComparison = useMemo(() => {
    if (poolGroups.length < 2) return null;
    const bestHash = Math.max(...poolGroups.map((g) => g.totalHashrate));
    return poolGroups.map((g) => {
      const totalShares = g.totalSharesAccepted + g.totalSharesRejected;
      const acceptRate =
        totalShares > 0 ? ((g.totalSharesAccepted / totalShares) * 100).toFixed(1) : '\u2014';
      const btcDay = estimateBTCPerDay(g.totalHashrate);
      return {
        ...g,
        acceptRate,
        btcDay,
        pctOfBest: ((g.totalHashrate / bestHash) * 100).toFixed(0),
      };
    });
  }, [poolGroups]);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>{t('pools.title')}</Text>
          <Text style={styles.headerSub}>
            {t('pools.poolCount', { pools: poolGroups.length, miners: miners.length })}
          </Text>
        </View>
      </View>
      {poolComparison && (
        <View style={styles.comparisonTable}>
          <View style={styles.comparisonRow}>
            <Text style={[styles.comparisonHeader, { flex: 2 }]}>{t('comparison.pool')}</Text>
            <Text style={styles.comparisonHeader}>{t('pools.miners')}</Text>
            <Text style={styles.comparisonHeader}>{t('pools.hashrate')}</Text>
            <Text style={styles.comparisonHeader}>{t('pools.acceptRate')}</Text>
            <Text style={styles.comparisonHeader}>{t('pools.estDaily')}</Text>
          </View>
          {poolComparison.map((g) => (
            <View key={`${g.pool}:${g.poolPort}`} style={styles.comparisonRow}>
              <Text
                style={[styles.comparisonCell, { flex: 2, fontWeight: '700' }]}
                numberOfLines={1}
              >
                {g.pool}
              </Text>
              <Text style={styles.comparisonCell}>{g.miners.length}</Text>
              <Text style={[styles.comparisonCell, { color: theme.primary }]}>
                {formatRate(g.totalHashrate)}
              </Text>
              <Text style={styles.comparisonCell}>{g.acceptRate}%</Text>
              <Text style={[styles.comparisonCell, { color: theme.success }]}>
                {g.btcDay > 0 ? formatBTC(g.btcDay) : '\u2014'}
              </Text>
            </View>
          ))}
        </View>
      )}
      <FlatList
        data={poolGroups}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        windowSize={7}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        renderItem={renderItem}
      />
    </View>
  );
}

function keyExtractor(item: PoolGroup): string {
  return `${item.pool}:${item.poolPort}`;
}
