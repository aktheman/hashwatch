import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useMemo } from 'react';
import { LineChart } from 'react-native-chart-kit';
import { MinerSnapshot } from '../types';
import { useTheme } from '../theme';
import { toHashesPerSecond } from '../utils/hashrate';

interface HashrateChartProps {
  snapshots: MinerSnapshot[];
  title?: string;
}

export function HashrateChart({ snapshots, title }: HashrateChartProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginVertical: 8,
        },
        title: {
          color: theme.text,
          fontSize: 15,
          fontWeight: '700',
          marginBottom: 12,
          marginLeft: 4,
        },
        yLabel: {
          position: 'absolute',
          top: 12,
          right: 14,
          color: theme.textMuted,
          fontSize: 10,
          fontWeight: '600',
          zIndex: 10,
        },
        chartWrapper: {
          backgroundColor: theme.surface,
          borderRadius: 16,
          padding: 12,
          borderWidth: 1,
          borderColor: theme.border,
        },
        chart: {
          borderRadius: 12,
        },
        empty: {
          backgroundColor: theme.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 28,
          alignItems: 'center',
          marginVertical: 8,
          gap: 8,
        },
        emptyIcon: {
          fontSize: 32,
        },
        emptyText: {
          color: theme.textDim,
          fontSize: 14,
        },
      }),
    [theme],
  );

  if (snapshots.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>Not enough data for chart</Text>
      </View>
    );
  }

  const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
  const labels = sorted.map((s) => {
    const d = new Date(s.timestamp);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  });
  const values = sorted.map((s) => toHashesPerSecond(s.hashRate, s.hashRateUnit) / 1e9);

  const screenWidth = Dimensions.get('window').width - 64;
  const step = Math.max(1, Math.floor(labels.length / 4));
  const filteredLabels = labels.map((l, i) => (i % step === 0 ? l : ''));

  const formatValue = (v: string) => parseFloat(v).toFixed(1);
  const unit = 'GH/s';

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.chartWrapper}>
        <Text style={styles.yLabel}>{unit}</Text>
        <LineChart
          data={{
            labels: filteredLabels,
            datasets: [{ data: values, color: () => theme.primary }],
          }}
          width={screenWidth}
          height={200}
          yAxisSuffix=""
          fromZero={false}
          chartConfig={{
            backgroundColor: theme.surface,
            backgroundGradientFrom: theme.surface,
            backgroundGradientTo: '#0D0D24',
            decimalPlaces: 1,
            color: () => theme.textMuted,
            labelColor: () => theme.textMuted,
            propsForDots: {
              r: '3',
              strokeWidth: '2',
              stroke: theme.primary,
              fill: theme.surface,
            },
            propsForBackgroundLines: {
              strokeDasharray: '4',
              stroke: theme.border,
              strokeWidth: 1,
            },
            propsForLabels: {
              fontSize: 10,
            },
          }}
          bezier
          style={styles.chart}
          formatYLabel={formatValue}
        />
      </View>
    </View>
  );
}
