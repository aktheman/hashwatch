import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useMinerStore } from '../store/miners';
import { useTheme } from '../theme';
import { MinerSnapshot } from '../types';
import {
  toHashesPerSecond,
  formatHashrateValue,
  estimateBTCPerDay,
  formatBTC,
} from '../utils/hashrate';
import * as DB from '../db/database';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export function AnalyticsScreen() {
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const [snapshots, setSnapshots] = useState<MinerSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [powerCost, setPowerCost] = useState(0);

  useEffect(() => {
    DB.getSetting('power_cost').then((v) => setPowerCost(parseFloat(v || '0') || 0));
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [miners, range]);

  const loadSnapshots = async () => {
    setLoading(true);
    const all: MinerSnapshot[] = [];
    const now = Date.now();
    const cutoff =
      range === '1h' ? now - 3600000 : range === '24h' ? now - 86400000 : now - 604800000;
    for (const m of miners) {
      const ss = await DB.getSnapshots(m.id, 500);
      all.push(...ss.filter((s) => s.timestamp >= cutoff));
    }
    all.sort((a, b) => a.timestamp - b.timestamp);
    setSnapshots(all);
    setLoading(false);
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
    const interval = range === '1h' ? 60000 : range === '24h' ? 3600000 : 3600000 * 4;
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
          return range === '7d'
            ? `${d.getMonth() + 1}/${d.getDate()}`
            : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        }),
        datasets: [
          {
            data: sampled.map((b) => Number((b.hashRate / 1e12).toFixed(2))),
            color: () => theme.primary,
            strokeWidth: 2,
          },
        ],
      };
    }
    return {
      labels: buckets.map((b) => {
        const d = new Date(b.time);
        return range === '7d'
          ? `${d.getMonth() + 1}/${d.getDate()}`
          : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      }),
      datasets: [
        {
          data: buckets.map((b) => Number((b.hashRate / 1e12).toFixed(2))),
          color: () => theme.primary,
          strokeWidth: 2,
        },
      ],
    };
  }, [snapshots, range, theme.primary]);

  const uptimeChartData = useMemo(() => {
    if (snapshots.length < 2) return null;
    const buckets: { time: number; uptime: number }[] = [];
    const interval = range === '1h' ? 60000 : range === '24h' ? 3600000 : 3600000 * 4;
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
          return range === '7d'
            ? `${d.getMonth() + 1}/${d.getDate()}`
            : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        }),
        datasets: [
          {
            data: sampled.map((b) => Number(b.uptime.toFixed(1))),
            color: () => theme.success,
            strokeWidth: 2,
          },
        ],
      };
    }
    return {
      labels: buckets.map((b) => {
        const d = new Date(b.time);
        return range === '7d'
          ? `${d.getMonth() + 1}/${d.getDate()}`
          : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      }),
      datasets: [
        {
          data: buckets.map((b) => Number(b.uptime.toFixed(1))),
          color: () => theme.success,
          strokeWidth: 2,
        },
      ],
    };
  }, [snapshots, range, theme.success]);

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
        },
        summaryIcon: { fontSize: 16, marginBottom: 4 },
        summaryValue: { fontSize: 18, fontWeight: '800', color: theme.text },
        summaryLabel: {
          fontSize: 9,
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
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSub}>Portfolio performance</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>⚡</Text>
            <Text style={[styles.summaryValue, { color: theme.primary }]}>
              {formatHashrateValue(totalHashrate)}
            </Text>
            <Text style={styles.summaryLabel}>Total Hashrate</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>💰</Text>
            <Text style={[styles.summaryValue, { color: theme.success }]}>
              {totalEarnings > 0 ? formatBTC(totalEarnings) : '—'}
            </Text>
            <Text style={styles.summaryLabel}>Est. Daily BTC</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>🔌</Text>
            <Text style={[styles.summaryValue, { color: theme.warning }]}>
              {totalPower.toFixed(0)}
            </Text>
            <Text style={styles.summaryLabel}>Power (W)</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>⬡</Text>
            <Text style={styles.summaryValue}>{miners.length}</Text>
            <Text style={styles.summaryLabel}>Miners</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>🌡</Text>
            <Text
              style={[styles.summaryValue, { color: avgTemp > 70 ? theme.danger : theme.success }]}
            >
              {avgTemp > 0 ? avgTemp.toFixed(0) : '—'}°
            </Text>
            <Text style={styles.summaryLabel}>Avg Temp</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>📦</Text>
            <Text style={styles.summaryValue}>{totalShares}</Text>
            <Text style={styles.summaryLabel}>Total Shares</Text>
          </View>
        </View>

        {powerCost > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Power Cost</Text>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { flex: 1 }]}>
                <Text style={styles.summaryIcon}>🔌</Text>
                <Text style={[styles.summaryValue, { color: theme.warning, fontSize: 22 }]}>
                  {totalPower.toFixed(0)}
                </Text>
                <Text style={styles.summaryLabel}>Watts</Text>
              </View>
              <View style={[styles.summaryCard, { flex: 1 }]}>
                <Text style={styles.summaryIcon}>💵</Text>
                <Text style={[styles.summaryValue, { color: theme.danger, fontSize: 22 }]}>
                  ${((totalPower / 1000) * 24 * powerCost).toFixed(2)}
                </Text>
                <Text style={styles.summaryLabel}>Cost/Day</Text>
              </View>
              <View style={[styles.summaryCard, { flex: 1 }]}>
                <Text style={styles.summaryIcon}>📈</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        totalEarnings * 85000 - (totalPower / 1000) * 24 * powerCost > 0
                          ? theme.success
                          : theme.danger,
                      fontSize: 22,
                    },
                  ]}
                >
                  {totalEarnings > 0
                    ? `$${(totalEarnings * 85000 - (totalPower / 1000) * 24 * powerCost).toFixed(2)}`
                    : '—'}
                </Text>
                <Text style={styles.summaryLabel}>Net/Day</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Hashrate History</Text>
          <View style={styles.rangeRow}>
            {(['1h', '24h', '7d'] as const).map((r) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={r}
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
            <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.primary} />
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
              Not enough data yet. Keep miners running.
            </Text>
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Uptime History</Text>
          {loading ? (
            <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.primary} />
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
              Not enough data yet. Keep miners running.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
