import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMinerStore } from '../store/miners';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { Skeleton } from '../components/Skeleton';
import { MetricTile } from '../components/DashboardComponents';
import { EarningsForecast } from '../components/EarningsForecast';
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
import { LazyLineChart } from '../components/LazyLineChart';
import { useWindowDimensions } from 'react-native';

interface ChartDataWithLegend {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity?: number) => string;
    colors?: Array<(opacity?: number) => string>;
    strokeWidth?: number;
  }[];
  legend?: string[];
}

type Range = '1h' | '24h' | '7d' | '30d';
const ranges: Range[] = ['1h', '24h', '7d', '30d'];
const MINER_COLORS = [
  '#6C63FF',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#3B82F6',
  '#EC4899',
  '#14B8A6',
  '#8B5CF6',
];

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
  const [chartView, setChartView] = useState<
    'hashrate' | 'uptime' | 'efficiency' | 'profit' | 'cost'
  >('hashrate');
  const [btcPrice, setBtcPrice] = useState(getBTCPrice);
  const [selectedMinerIds, setSelectedMinerIds] = useState<Set<string>>(new Set());
  const [showMinerFilter, setShowMinerFilter] = useState(false);

  const snapshotCache = useRef<Map<string, { data: MinerSnapshot[]; key: string }>>(new Map());
  const CACHE_MAX = 10;
  const primaryColorRef = useRef(theme.primary);
  const successColorRef = useRef(theme.success);
  primaryColorRef.current = theme.primary;
  successColorRef.current = theme.success;

  const minerIdsKey = miners
    .map((m) => m.id)
    .sort()
    .join(',');

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
    const cacheKey = `${minerIdsKey}-${range}`;
    const cached = snapshotCache.current.get(cacheKey);
    if (cached && cached.key === cacheKey) {
      setSnapshots(cached.data);
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
    if (snapshotCache.current.size >= CACHE_MAX) {
      const firstKey = snapshotCache.current.keys().next().value;
      if (firstKey) snapshotCache.current.delete(firstKey);
    }
    snapshotCache.current.set(cacheKey, { data: all, key: cacheKey });
    setSnapshots(all);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSnapshots();
    await fetchBTCPrice().then(setBtcPrice);
    setRefreshing(false);
  };

  const toggleMinerFilter = () => setShowMinerFilter((p) => !p);

  const toggleMiner = (id: string) => {
    const next = new Set(selectedMinerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMinerIds(next);
  };

  const selectAllMiners = () => setSelectedMinerIds(new Set());

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
    const interval =
      range === '1h' ? 60000 : range === '24h' ? 3600000 : range === '7d' ? 3600000 * 4 : 86400000;

    const allGrouped: Record<number, number[]> = {};
    for (const s of snapshots) {
      const bucket = Math.floor(s.timestamp / interval) * interval;
      if (!allGrouped[bucket]) allGrouped[bucket] = [];
      allGrouped[bucket].push(toHashesPerSecond(s.hashRate, s.hashRateUnit));
    }

    const bucketTimes = Object.keys(allGrouped).map(Number).sort();
    let sampledTimes = bucketTimes;
    if (bucketTimes.length > 30) {
      const step = Math.ceil(bucketTimes.length / 30);
      sampledTimes = bucketTimes.filter((_, i) => i % step === 0);
    }

    const labels = sampledTimes.map((b) => {
      const d = new Date(b);
      const showDate = range === '7d' || range === '30d';
      return showDate
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    if (selectedMinerIds.size > 0) {
      const selectedMiners = miners.filter((m) => selectedMinerIds.has(m.id));
      const datasets: { data: number[]; color: () => string; strokeWidth: number }[] = [];
      const legend: string[] = [];
      let colorIdx = 0;

      selectedMiners.forEach((miner) => {
        const minerSnapshots = snapshots.filter((s) => s.minerId === miner.id);
        if (minerSnapshots.length < 2) return;

        const grouped: Record<number, number[]> = {};
        for (const s of minerSnapshots) {
          const bucket = Math.floor(s.timestamp / interval) * interval;
          if (!grouped[bucket]) grouped[bucket] = [];
          grouped[bucket].push(toHashesPerSecond(s.hashRate, s.hashRateUnit));
        }

        const data = sampledTimes.map((time) => {
          const vals = grouped[time];
          if (!vals) return 0;
          return Number((vals.reduce((a, b) => a + b, 0) / vals.length / 1e12).toFixed(2));
        });

        const minerColor = MINER_COLORS[colorIdx % MINER_COLORS.length];
        datasets.push({ data, color: () => minerColor, strokeWidth: 2 });
        legend.push(miner.name || miner.id);
        colorIdx++;
      });

      if (datasets.length === 0) return null;
      return { labels, datasets, legend } as ChartDataWithLegend;
    }

    const buckets = sampledTimes.map((time) => {
      const vals = allGrouped[time];
      return { time, hashRate: vals.reduce((a, b) => a + b, 0) / vals.length };
    });

    return {
      labels,
      datasets: [
        {
          data: buckets.map((b) => Number((b.hashRate / 1e12).toFixed(2))),
          color: () => primaryColorRef.current,
          strokeWidth: 2,
        },
      ],
    } as ChartDataWithLegend;
  }, [snapshots, range, selectedMinerIds, miners]);

  const uptimeChartData = useMemo(() => {
    if (snapshots.length < 2) return null;
    const interval =
      range === '1h' ? 60000 : range === '24h' ? 3600000 : range === '7d' ? 3600000 * 4 : 86400000;

    const allGrouped: Record<number, number[]> = {};
    for (const s of snapshots) {
      const bucket = Math.floor(s.timestamp / interval) * interval;
      if (!allGrouped[bucket]) allGrouped[bucket] = [];
      allGrouped[bucket].push(s.uptimeSeconds / 3600);
    }

    const bucketTimes = Object.keys(allGrouped).map(Number).sort();
    let sampledTimes = bucketTimes;
    if (bucketTimes.length > 30) {
      const step = Math.ceil(bucketTimes.length / 30);
      sampledTimes = bucketTimes.filter((_, i) => i % step === 0);
    }

    const labels = sampledTimes.map((b) => {
      const d = new Date(b);
      return range === '7d' || range === '30d'
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    if (selectedMinerIds.size > 0) {
      const selectedMiners = miners.filter((m) => selectedMinerIds.has(m.id));
      const datasets: { data: number[]; color: () => string; strokeWidth: number }[] = [];
      const legend: string[] = [];
      let colorIdx = 0;

      selectedMiners.forEach((miner) => {
        const minerSnapshots = snapshots.filter((s) => s.minerId === miner.id);
        if (minerSnapshots.length < 2) return;

        const grouped: Record<number, number[]> = {};
        for (const s of minerSnapshots) {
          const bucket = Math.floor(s.timestamp / interval) * interval;
          if (!grouped[bucket]) grouped[bucket] = [];
          grouped[bucket].push(s.uptimeSeconds / 3600);
        }

        const data = sampledTimes.map((time) => {
          const vals = grouped[time];
          if (!vals) return 0;
          return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
        });

        const minerColor = MINER_COLORS[colorIdx % MINER_COLORS.length];
        datasets.push({ data, color: () => minerColor, strokeWidth: 2 });
        legend.push(miner.name || miner.id);
        colorIdx++;
      });

      if (datasets.length === 0) return null;
      return { labels, datasets, legend } as ChartDataWithLegend;
    }

    const buckets = sampledTimes.map((time) => {
      const vals = allGrouped[time];
      return { time, uptime: vals.reduce((a, b) => a + b, 0) / vals.length };
    });

    return {
      labels,
      datasets: [
        {
          data: buckets.map((b) => Number(b.uptime.toFixed(1))),
          color: () => successColorRef.current,
          strokeWidth: 2,
        },
      ],
    } as ChartDataWithLegend;
  }, [snapshots, range, selectedMinerIds, miners]);

  const efficiencyChartData = useMemo(() => {
    if (snapshots.length < 2) return null;
    const interval =
      range === '1h' ? 60000 : range === '24h' ? 3600000 : range === '7d' ? 3600000 * 4 : 86400000;

    const allGrouped: Record<number, number[]> = {};
    for (const s of snapshots) {
      const bucket = Math.floor(s.timestamp / interval) * interval;
      if (!allGrouped[bucket]) allGrouped[bucket] = [];
      const hps = toHashesPerSecond(s.hashRate, s.hashRateUnit);
      const efficiency = hps > 0 ? s.power / (hps / 1e12) : 0;
      allGrouped[bucket].push(efficiency);
    }

    const bucketTimes = Object.keys(allGrouped).map(Number).sort();
    let sampledTimes = bucketTimes;
    if (bucketTimes.length > 30) {
      const step = Math.ceil(bucketTimes.length / 30);
      sampledTimes = bucketTimes.filter((_, i) => i % step === 0);
    }

    const labels = sampledTimes.map((b) => {
      const d = new Date(b);
      return range === '7d' || range === '30d'
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    if (selectedMinerIds.size > 0) {
      const selectedMiners = miners.filter((m) => selectedMinerIds.has(m.id));
      const datasets: { data: number[]; color: () => string; strokeWidth: number }[] = [];
      const legend: string[] = [];
      let colorIdx = 0;

      selectedMiners.forEach((miner) => {
        const minerSnapshots = snapshots.filter((s) => s.minerId === miner.id);
        if (minerSnapshots.length < 2) return;

        const grouped: Record<number, number[]> = {};
        for (const s of minerSnapshots) {
          const bucket = Math.floor(s.timestamp / interval) * interval;
          if (!grouped[bucket]) grouped[bucket] = [];
          const hps = toHashesPerSecond(s.hashRate, s.hashRateUnit);
          const efficiency = hps > 0 ? s.power / (hps / 1e12) : 0;
          grouped[bucket].push(efficiency);
        }

        const data = sampledTimes.map((time) => {
          const vals = grouped[time];
          if (!vals) return 0;
          return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
        });

        const minerColor = MINER_COLORS[colorIdx % MINER_COLORS.length];
        datasets.push({ data, color: () => minerColor, strokeWidth: 2 });
        legend.push(miner.name || miner.id);
        colorIdx++;
      });

      if (datasets.length === 0) return null;
      return { labels, datasets, legend } as ChartDataWithLegend;
    }

    const buckets = sampledTimes.map((time) => {
      const vals = allGrouped[time];
      return { time, efficiency: vals.reduce((a, b) => a + b, 0) / vals.length };
    });

    return {
      labels,
      datasets: [
        {
          data: buckets.map((b) => Number(b.efficiency.toFixed(1))),
          color: () => theme.warning,
          strokeWidth: 2,
        },
      ],
    } as ChartDataWithLegend;
  }, [snapshots, range, selectedMinerIds, miners, theme.warning]);

  const profitChartData = useMemo(() => {
    if (snapshots.length < 2 || powerCost <= 0) return null;
    const interval =
      range === '1h' ? 60000 : range === '24h' ? 3600000 : range === '7d' ? 3600000 * 4 : 86400000;

    const btcPrice = getBTCPrice();
    const allGrouped: Record<number, { hashrate: number[]; power: number[] }> = {};
    for (const s of snapshots) {
      const bucket = Math.floor(s.timestamp / interval) * interval;
      if (!allGrouped[bucket]) allGrouped[bucket] = { hashrate: [], power: [] };
      const hps = toHashesPerSecond(s.hashRate, s.hashRateUnit);
      allGrouped[bucket].hashrate.push(hps);
      allGrouped[bucket].power.push(s.power);
    }

    const bucketTimes = Object.keys(allGrouped).map(Number).sort();
    let sampledTimes = bucketTimes;
    if (bucketTimes.length > 30) {
      const step = Math.ceil(bucketTimes.length / 30);
      sampledTimes = bucketTimes.filter((_, i) => i % step === 0);
    }

    const labels = sampledTimes.map((b) => {
      const d = new Date(b);
      return range === '7d' || range === '30d'
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    const data = sampledTimes.map((time) => {
      const g = allGrouped[time];
      const avgHashrate = g.hashrate.reduce((a, b) => a + b, 0) / g.hashrate.length;
      const avgPower = g.power.reduce((a, b) => a + b, 0) / g.power.length;
      const btcDay = estimateBTCPerDay(avgHashrate);
      const dailyEarnings = btcDay * btcPrice;
      const dailyPowerCost = (avgPower / 1000) * 24 * powerCost;
      return Number((dailyEarnings - dailyPowerCost).toFixed(4));
    });

    return {
      labels,
      datasets: [
        {
          data,
          color: () => theme.success,
          strokeWidth: 2,
        },
      ],
    } as ChartDataWithLegend;
  }, [snapshots, range, powerCost]);

  const costChartData = useMemo(() => {
    if (snapshots.length < 2 || powerCost <= 0) return null;
    const interval =
      range === '1h' ? 60000 : range === '24h' ? 3600000 : range === '7d' ? 3600000 * 4 : 86400000;

    const allGrouped: Record<number, number[]> = {};
    for (const s of snapshots) {
      const bucket = Math.floor(s.timestamp / interval) * interval;
      if (!allGrouped[bucket]) allGrouped[bucket] = [];
      allGrouped[bucket].push(s.power);
    }

    const bucketTimes = Object.keys(allGrouped).map(Number).sort();
    let sampledTimes = bucketTimes;
    if (bucketTimes.length > 30) {
      const step = Math.ceil(bucketTimes.length / 30);
      sampledTimes = bucketTimes.filter((_, i) => i % step === 0);
    }

    const labels = sampledTimes.map((b) => {
      const d = new Date(b);
      return range === '7d' || range === '30d'
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    const data = sampledTimes.map((time) => {
      const powers = allGrouped[time];
      const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
      return Number(((avgPower / 1000) * 24 * powerCost).toFixed(4));
    });

    return {
      labels,
      datasets: [
        {
          data,
          color: () => theme.danger,
          strokeWidth: 2,
        },
      ],
    } as ChartDataWithLegend;
  }, [snapshots, range, powerCost]);

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
        summaryRow: {
          flexDirection: 'row',
          paddingHorizontal: spacing.md,
          gap: spacing.xxs,
          marginBottom: 8,
          marginTop: spacing.xxs,
        },
        summaryCard: {
          flex: 1,
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          padding: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: `0 2px 12px ${theme.glow}`,
        },
        summaryIcon: { fontSize: fontSize.lg, marginBottom: 4 },
        summaryValue: {
          fontSize: fontSize.h2,
          fontWeight: fontWeight.extrabold,
          color: theme.text,
        },
        summaryLabel: {
          fontSize: fontSize.xs,
          color: theme.textDim,
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: spacing.xxs,
        },
        chartCard: {
          backgroundColor: theme.surface,
          marginHorizontal: spacing.md,
          marginBottom: spacing.md,
          borderRadius: radius.lg,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.border,
        },
        chartTitle: {
          color: theme.text,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.md,
        },
        rangeRow: {
          flexDirection: 'row',
          gap: spacing.xs,
          marginBottom: spacing.md,
        },
        rangeBtn: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.sm,
          borderWidth: 1,
        },
        rangeBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
        loadingText: { color: theme.textDim, marginTop: spacing.md, fontSize: 14 },
        emptyText: { color: theme.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
        filterBtn: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: theme.border,
        },
        filterBtnActive: {
          backgroundColor: theme.primary,
          borderColor: theme.primary,
        },
        filterBtnText: {
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          color: theme.text,
        },
        filterBtnTextActive: { color: '#FFF' },
        chipRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.xs,
          marginBottom: spacing.md,
        },
        chip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: 'transparent',
        },
        chipSelected: {
          backgroundColor: theme.primary,
          borderColor: theme.primary,
        },
        chipText: { fontSize: fontSize.sm, color: theme.text, fontWeight: fontWeight.regular },
        chipTextSelected: { color: '#FFF' },
        legendRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          marginTop: spacing.md,
          justifyContent: 'center',
        },
        legendItem: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xxs,
        },
        legendDot: { width: 8, height: 8, borderRadius: radius.xxs },
        legendText: { fontSize: fontSize.xs, color: theme.textDim },
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter by miner"
          style={[styles.filterBtn, showMinerFilter && styles.filterBtnActive]}
          onPress={toggleMinerFilter}
        >
          <Text style={[styles.filterBtnText, showMinerFilter && styles.filterBtnTextActive]}>
            Filter
          </Text>
        </Pressable>
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

        <EarningsForecast miners={miners} powerCost={powerCost} />

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
          <View style={styles.rangeRow}>
            {(['hashrate', 'uptime', 'efficiency', 'profit', 'cost'] as const).map((view) => (
              <Pressable
                accessibilityRole="button"
                key={view}
                style={[
                  styles.rangeBtn,
                  {
                    backgroundColor: chartView === view ? theme.primary : theme.surfaceLight,
                    borderColor: chartView === view ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setChartView(view)}
              >
                <Text
                  style={[styles.rangeBtnText, { color: chartView === view ? '#FFF' : theme.text }]}
                >
                  {view === 'hashrate'
                    ? t('analytics.hashrateHistory')
                    : view === 'uptime'
                      ? t('analytics.uptimeHistory')
                      : view === 'efficiency'
                        ? t('analytics.efficiencyHistory')
                        : view === 'profit'
                          ? t('analytics.profitHistory')
                          : t('analytics.costHistory')}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.rangeRow}>
            {ranges.map((r) => (
              <Pressable
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
              </Pressable>
            ))}
          </View>
          {showMinerFilter && (
            <View style={styles.chipRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="All miners"
                style={[styles.chip, selectedMinerIds.size === 0 && styles.chipSelected]}
                onPress={selectAllMiners}
              >
                <Text
                  style={[styles.chipText, selectedMinerIds.size === 0 && styles.chipTextSelected]}
                >
                  All miners
                </Text>
              </Pressable>
              {miners.map((m) => {
                const isSelected = selectedMinerIds.has(m.id);
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={m.id}
                    accessibilityLabel={m.name || m.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleMiner(m.id)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {m.name || m.id}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {loading ? (
            <View style={{ height: 200, justifyContent: 'center', gap: 12 }}>
              <Skeleton height={20} borderRadius={10} />
              <Skeleton height={80} borderRadius={8} />
              <Skeleton height={14} borderRadius={7} width="60%" />
            </View>
          ) : chartView === 'hashrate' && chartData ? (
            <>
              <LazyLineChart
                data={chartData}
                width={screenWidth - 64}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={{ borderRadius: radius.sm }}
                withInnerLines={false}
                withOuterLines={false}
                fromZero
              />
              {(chartData as ChartDataWithLegend).legend &&
                (chartData as ChartDataWithLegend).legend!.length > 0 && (
                  <View style={styles.legendRow}>
                    {(chartData as ChartDataWithLegend).legend!.map((name: string, idx: number) => (
                      <View key={name} style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: MINER_COLORS[idx % MINER_COLORS.length] },
                          ]}
                        />
                        <Text style={styles.legendText}>{name}</Text>
                      </View>
                    ))}
                  </View>
                )}
            </>
          ) : chartView === 'uptime' && uptimeChartData ? (
            <>
              <LazyLineChart
                data={uptimeChartData}
                width={screenWidth - 64}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={{ borderRadius: radius.sm }}
                withInnerLines={false}
                withOuterLines={false}
                fromZero
              />
              {(uptimeChartData as ChartDataWithLegend).legend &&
                (uptimeChartData as ChartDataWithLegend).legend!.length > 0 && (
                  <View style={styles.legendRow}>
                    {(uptimeChartData as ChartDataWithLegend).legend!.map(
                      (name: string, idx: number) => (
                        <View key={name} style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: MINER_COLORS[idx % MINER_COLORS.length] },
                            ]}
                          />
                          <Text style={styles.legendText}>{name}</Text>
                        </View>
                      ),
                    )}
                  </View>
                )}
            </>
          ) : chartView === 'efficiency' && efficiencyChartData ? (
            <>
              <LazyLineChart
                data={efficiencyChartData}
                width={screenWidth - 64}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={{ borderRadius: radius.sm }}
                withInnerLines={false}
                withOuterLines={false}
                fromZero
              />
              {(efficiencyChartData as ChartDataWithLegend).legend &&
                (efficiencyChartData as ChartDataWithLegend).legend!.length > 0 && (
                  <View style={styles.legendRow}>
                    {(efficiencyChartData as ChartDataWithLegend).legend!.map(
                      (name: string, idx: number) => (
                        <View key={name} style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: MINER_COLORS[idx % MINER_COLORS.length] },
                            ]}
                          />
                          <Text style={styles.legendText}>{name}</Text>
                        </View>
                      ),
                    )}
                  </View>
                )}
            </>
          ) : chartView === 'profit' && profitChartData ? (
            <>
              <LazyLineChart
                data={profitChartData}
                width={screenWidth - 64}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={{ borderRadius: radius.sm }}
                withInnerLines={false}
                withOuterLines={false}
                fromZero
              />
              {powerCost <= 0 && (
                <Text style={[styles.emptyText, { paddingVertical: spacing.xs }]}>
                  {String(t('analytics.setPowerCost')) || 'Set power cost in Settings'}
                </Text>
              )}
            </>
          ) : chartView === 'cost' && costChartData ? (
            <LazyLineChart
              data={costChartData}
              width={screenWidth - 64}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={{ borderRadius: radius.sm }}
              withInnerLines={false}
              withOuterLines={false}
              fromZero
            />
          ) : (
            <Text style={[styles.emptyText, { paddingVertical: spacing.xxs }]}>
              {t('analytics.notEnoughData')}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
