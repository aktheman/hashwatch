import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMinerStore } from '../store/miners';
import { useTheme } from '../theme';
import { Skeleton } from '../components/Skeleton';
import { MetricTile } from '../components/DashboardComponents';
import { MinerSnapshot } from '../types';
import {
  toHashesPerSecond,
  formatHashrateValue,
  estimateBTCPerDay,
  formatBTC,
  getBTCPrice,
  fetchBTCPrice,
  fetchNetworkHashrate,
} from '../utils/hashrate';
import * as DB from '../db/database';
import { LineChart } from 'react-native-chart-kit';
import { useWindowDimensions } from 'react-native';

type Range = '1h' | '24h' | '7d' | '30d';
const ranges: Range[] = ['1h', '24h', '7d', '30d'];

export function AnalyticsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const miners = useMinerStore((s) => s.miners);
  const [snapshots, setSnapshots] = useState<MinerSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<Range>('24h');
  const [powerCost, setPowerCost] = useState(0);
  const [btcPrice, setBtcPrice] = useState(getBTCPrice);

  const snapshotCache = useRef<Map<string, MinerSnapshot[]>>(new Map());
  const primaryColorRef = useRef(theme.primary);
  const successColorRef = useRef(theme.success);
  primaryColorRef.current = theme.primary;
  successColorRef.current = theme.success;

  const minersCacheKey = miners.map((m) => `${m.id}:${m.lastSeen || 0}`).join(',');

  useEffect(() => {
    let cancelled = false;
    DB.getSetting('power_cost').then((v) => {
      if (cancelled) return;
      setPowerCost(parseFloat(v || '0') || 0);
    });
    fetchBTCPrice().then((price) => {
      if (cancelled) return;
      setBtcPrice(price);
    });
    fetchNetworkHashrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [miners, range]);

  const loadSnapshots = async () => {
    setLoading(true);
    const cacheKey = `${minersCacheKey}-${range}`;
    const cached = snapshotCache.current.get(cacheKey);
    if (cached) {
      setSnapshots(cached);
      setLoading(false);
      return;
    }
    const now = Date.now();
    const cutoff =
      range === '1h'
        ? now - 3600000
        : range === '24h'
          ? now - 86400000
          : range === '7d'
            ? now - 604800000
            : now - 2592000000;
    const all = (await Promise.all(miners.map((m) => DB.getSnapshots(m.id, 500))))
      .flat()
      .filter((s) => s.timestamp >= cutoff);
    all.sort((a, b) => a.timestamp - b.timestamp);
    snapshotCache.current.set(cacheKey, all);
    setSnapshots(all);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSnapshots();
    await fetchBTCPrice().then(setBtcPrice);
    setRefreshing(false);
  };

  const { totalHashrate, totalEarnings, totalPower, avgTemp, totalShares } = useMemo(() => {
    const hps = miners.reduce(
      (sum, m) => sum + toHashesPerSecond(m.status?.hashRate ?? 0, m.status?.hashRateUnit),
      0,
    );
    const power = miners.reduce((sum, m) => sum + (m.status?.power ?? 0), 0);
    const tempMiners = miners.filter((m) => m.status?.temperature);
    const temp =
      tempMiners.length > 0
        ? tempMiners.reduce((sum, m) => sum + (m.status?.temperature ?? 0), 0) / tempMiners.length
        : 0;
    const shares = miners.reduce(
      (sum, m) => sum + (m.status?.sharesAccepted ?? 0) + (m.status?.sharesRejected ?? 0),
      0,
    );
    return {
      totalHashrate: hps,
      totalEarnings: estimateBTCPerDay(hps),
      totalPower: power,
      avgTemp: temp,
      totalShares: shares,
    };
  }, [miners]);

  const chartData = useMemo(() => {
    if (snapshots.length < 2) return null;
    const buckets: { time: number; hashRate: number }[] = [];
    const interval =
      range === '1h' ? 60000 : range === '24h' ? 3600000 : range === '7d' ? 3600000 * 4 : 86400000;
    const grouped: Record<number, number[]> = {};
    for (const s of snapshots) {
      const bucket = Math.floor(s.timestamp / interval) * interval;
      if (!grouped[bucket]) grouped[bucket] = [];
      grouped[bucket].push(toHashesPerSecond(s.hashRate, s.hashRateUnit));
    }
    for (const time of Object.keys(grouped).map(Number).sort()) {
      const vals = grouped[time];
      buckets.push({ time, hashRate: vals.reduce((a, b) => a + b, 0) / vals.length });
    }
    if (buckets.length > 30) {
      const step = Math.ceil(buckets.length / 30);
      const sampled = buckets.filter((_, i) => i % step === 0);
      return {
        labels: sampled.map((b) => {
          const d = new Date(b.time);
          const showDate = range === '7d' || range === '30d';
          return showDate
            ? `${d.getMonth() + 1}/${d.getDate()}`
            : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        }),
        datasets: [
          {
            data: sampled.map((b) => Number((b.hashRate / 1e12).toFixed(2))),
            color: () => primaryColorRef.current,
            strokeWidth: 2,
          },
        ],
      };
    }
    return {
      labels: buckets.map((b) => {
        const d = new Date(b.time);
        const showDate = range === '7d' || range === '30d';
        return showDate
          ? `${d.getMonth() + 1}/${d.getDate()}`
          : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      }),
      datasets: [
        {
          data: buckets.map((b) => Number((b.hashRate / 1e12).toFixed(2))),
          color: () => primaryColorRef.current,
          strokeWidth: 2,
        },
      ],
    };
  }, [snapshots, range]);

  const uptimeChartData = useMemo(() => {
    if (snapshots.length < 2) return null;
    const buckets: { time: number; uptime: number }[] = [];
    const interval =
      range === '1h' ? 60000 : range === '24h' ? 3600000 : range === '7d' ? 3600000 * 4 : 86400000;
    const grouped: Record<number, number[]> = {};
    for (const s of snapshots) {
      const bucket = Math.floor(s.timestamp / interval) * interval;
      if (!grouped[bucket]) grouped[bucket] = [];
      grouped[bucket].push(s.uptimeSeconds / 3600);
    }
    for (const time of Object.keys(grouped).map(Number).sort()) {
      const vals = grouped[time];
      buckets.push({ time, uptime: vals.reduce((a, b) => a + b, 0) / vals.length });
    }
    if (buckets.length > 30) {
      const step = Math.ceil(buckets.length / 30);
      const sampled = buckets.filter((_, i) => i % step === 0);
      return {
        labels: sampled.map((b) => {
          const d = new Date(b.time);
          return range === '7d' || range === '30d'
            ? `${d.getMonth() + 1}/${d.getDate()}`
            : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        }),
        datasets: [
          {
            data: sampled.map((b) => Number(b.uptime.toFixed(1))),
            color: () => successColorRef.current,
            strokeWidth: 2,
          },
        ],
      };
    }
    return {
      labels: buckets.map((b) => {
        const d = new Date(b.time);
        const showDate = range === '7d' || range === '30d';
        return showDate
          ? `${d.getMonth() + 1}/${d.getDate()}`
          : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      }),
      datasets: [
        {
          data: buckets.map((b) => Number(b.uptime.toFixed(1))),
          color: () => successColorRef.current,
          strokeWidth: 2,
        },
      ],
    };
  }, [snapshots, range]);

  const chartConfig = {
    backgroundColor: theme.surface,
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    decimalPlaces: 1,
    color: () => theme.textMuted,
    labelColor: () => theme.textMuted,
    propsForDots: { r: '3' },
    propsForBackgroundLines: { stroke: theme.border },
  };

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
        scroll: { paddingBottom: 40 },
        summaryRow: {
          flexDirection: 'row',
          paddingHorizontal: 16,
          gap: 8,
          marginBottom: 8,
          marginTop: 4,
        },
        summaryCard: {
          flex: 1,
          backgroundColor: theme.surface,
          borderRadius: 16,
          padding: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: `0 2px 12px ${theme.glow}`,
        },
        summaryIcon: { fontSize: 16, marginBottom: 4 },
        summaryValue: { fontSize: 22, fontWeight: '800', color: theme.text },
        summaryLabel: {
          fontSize: 10,
          color: theme.textDim,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 2,
        },
        chartCard: {
          backgroundColor: theme.surface,
          marginHorizontal: 16,
          marginBottom: 16,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.border,
        },
        chartTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
        rangeRow: {
          flexDirection: 'row',
          gap: 6,
          marginBottom: 12,
        },
        rangeBtn: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          borderWidth: 1,
        },
        rangeBtnText: { fontSize: 12, fontWeight: '600' },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
        loadingText: { color: theme.textDim, marginTop: 12, fontSize: 14 },
        emptyText: { color: theme.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>{t('analytics.title')}</Text>
          <Text style={styles.headerSub}>{t('analytics.subtitle')}</Text>
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
        <View style={styles.summaryRow}>
          <MetricTile
            title={String(t('analytics.totalHashrate'))}
            value={formatHashrateValue(totalHashrate)}
            unit="H/s"
            accent="info"
          />
          <MetricTile
            title={String(t('analytics.estDailyBTC'))}
            value={totalEarnings > 0 ? formatBTC(totalEarnings) : '—'}
            accent="success"
          />
          <MetricTile
            title={String(t('analytics.power'))}
            value={`${totalPower.toFixed(0)}`}
            unit="W"
            accent="warning"
          />
        </View>

        <View style={styles.summaryRow}>
          <MetricTile
            title={String(t('analytics.miners'))}
            value={String(miners.length)}
            accent="primary"
          />
          <MetricTile
            title={String(t('analytics.avgTemp'))}
            value={`${avgTemp > 0 ? avgTemp.toFixed(0) : '—'}°`}
            accent={avgTemp > 70 ? 'danger' : 'success'}
          />
          <MetricTile
            title={String(t('analytics.totalShares'))}
            value={String(totalShares)}
            accent="primary"
          />
        </View>

        {powerCost > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{t('analytics.powerCost')}</Text>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { flex: 1 }]}>
                <Text style={styles.summaryIcon}>🔌</Text>
                <Text style={[styles.summaryValue, { color: theme.warning }]}>
                  {totalPower.toFixed(0)}
                </Text>
                <Text style={styles.summaryLabel}>{t('analytics.watts')}</Text>
              </View>
              <View style={[styles.summaryCard, { flex: 1 }]}>
                <Text style={styles.summaryIcon}>💵</Text>
                <Text style={[styles.summaryValue, { color: theme.danger }]}>
                  ${((totalPower / 1000) * 24 * powerCost).toFixed(2)}
                </Text>
                <Text style={styles.summaryLabel}>{t('analytics.costDay')}</Text>
              </View>
              <View style={[styles.summaryCard, { flex: 1 }]}>
                <Text style={styles.summaryIcon}>📈</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        totalEarnings * btcPrice - (totalPower / 1000) * 24 * powerCost > 0
                          ? theme.success
                          : theme.danger,
                    },
                  ]}
                >
                  {totalEarnings > 0
                    ? `$${(totalEarnings * btcPrice - (totalPower / 1000) * 24 * powerCost).toFixed(2)}`
                    : '—'}
                </Text>
                <Text style={styles.summaryLabel}>{t('analytics.netDay')}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('analytics.hashrateHistory')}</Text>
          <View style={styles.rangeRow}>
            {ranges.map((r) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={r}
                accessibilityLabel={`Show ${r === '1h' ? '1 hour' : r === '24h' ? '24 hours' : r === '7d' ? '7 days' : '30 days'}`}
                style={[
                  styles.rangeBtn,
                  {
                    backgroundColor: range === r ? theme.primary : theme.surfaceLight,
                    borderColor: range === r ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setRange(r)}
              >
                <Text style={[styles.rangeBtnText, { color: range === r ? '#FFF' : theme.text }]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {loading ? (
            <View style={{ height: 200, justifyContent: 'center', gap: 12 }}>
              <Skeleton height={20} borderRadius={10} />
              <Skeleton height={80} borderRadius={8} />
              <Skeleton height={14} borderRadius={7} width="60%" />
            </View>
          ) : chartData ? (
            <LineChart
              data={chartData}
              width={screenWidth - 64}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={{ borderRadius: 8 }}
              withInnerLines={false}
              withOuterLines={false}
              fromZero
            />
          ) : (
            <Text style={[styles.emptyText, { paddingVertical: 40 }]}>
              {t('analytics.notEnoughData')}
            </Text>
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('analytics.uptimeHistory')}</Text>
          {loading ? (
            <View style={{ height: 200, justifyContent: 'center', gap: 12 }}>
              <Skeleton height={20} borderRadius={10} />
              <Skeleton height={80} borderRadius={8} />
              <Skeleton height={14} borderRadius={7} width="60%" />
            </View>
          ) : uptimeChartData ? (
            <LineChart
              data={uptimeChartData}
              width={screenWidth - 64}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={{ borderRadius: 8 }}
              withInnerLines={false}
              withOuterLines={false}
              fromZero
            />
          ) : (
            <Text style={[styles.emptyText, { paddingVertical: 40 }]}>
              {t('analytics.notEnoughData')}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
