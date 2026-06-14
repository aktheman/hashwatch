import { useMemo } from 'react';
import { View, Text, useWindowDimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { MinerSnapshot } from '../types';
import { useTheme } from '../theme';
import { toHashesPerSecond } from '../utils/hashrate';

interface EfficiencyTrendProps {
  snapshots: MinerSnapshot[];
}

function calcJperTH(snap: MinerSnapshot): number | null {
  const hps = toHashesPerSecond(snap.hashRate, snap.hashRateUnit);
  const th = hps / 1e12;
  if (th <= 0 || snap.power <= 0) return null;
  return snap.power / th;
}

export function EfficiencyTrend({ snapshots }: EfficiencyTrendProps) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const { labels, values, avg } = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
    const effs = sorted.map(calcJperTH).filter((v): v is number => v !== null);

    if (effs.length < 2) return { labels: [], values: [], avg: 0 };

    const step = Math.max(1, Math.floor(effs.length / 5));
    const labels = effs.map((_, i) => {
      const d = new Date(sorted[i]?.timestamp ?? 0);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    });
    const filteredLabels = labels.map((l, i) => (i % step === 0 ? l : ''));

    const avg = effs.reduce((s, v) => s + v, 0) / effs.length;

    return { labels: filteredLabels, values: effs, avg };
  }, [snapshots]);

  const screenWidth = windowWidth - 64;

  if (values.length < 2) {
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={styles.emptyIcon}>📉</Text>
        <Text style={[styles.emptyText, { color: theme.textDim }]}>
          Not enough data for efficiency trend
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`Efficiency trend, average ${avg.toFixed(1)} J/TH`}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <LineChart
        data={{
          labels,
          datasets: [{ data: values, color: () => theme.primary, strokeWidth: 2 }],
        }}
        width={screenWidth}
        height={140}
        yAxisSuffix=" J/TH"
        chartConfig={{
          backgroundColor: theme.surface,
          backgroundGradientFrom: theme.surface,
          backgroundGradientTo: theme.surface,
          decimalPlaces: 1,
          color: () => theme.textMuted,
          labelColor: () => theme.textDim,
          propsForDots: { r: '3', fill: theme.primary },
          propsForBackgroundLines: { stroke: theme.border, strokeDasharray: '' },
        }}
        bezier
        withInnerLines
        withOuterLines={false}
        style={{ borderRadius: 12 }}
      />
      {avg > 0 && (
        <Text style={[styles.avg, { color: theme.textDim }]}>Average: {avg.toFixed(1)} J/TH</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  avg: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  emptyIcon: {
    fontSize: 28,
    textAlign: 'center',
    paddingTop: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
