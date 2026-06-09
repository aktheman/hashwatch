import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { MinerSnapshot } from '../types';

interface HashrateChartProps {
  snapshots: MinerSnapshot[];
  title?: string;
}

export function HashrateChart({ snapshots, title }: HashrateChartProps) {
  if (snapshots.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Not enough data for chart</Text>
      </View>
    );
  }

  const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
  const labels = sorted.map((s) => {
    const d = new Date(s.timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
  const values = sorted.map((s) => {
    const v = s.hashRate;
    if (v >= 1e12) return v / 1e12;
    if (v >= 1e9) return v / 1e9;
    if (v >= 1e6) return v / 1e6;
    if (v >= 1e3) return v / 1e3;
    return v;
  });

  const screenWidth = Dimensions.get('window').width - 32;

  const step = Math.max(1, Math.floor(labels.length / 5));
  const filteredLabels = labels.map((l, i) => (i % step === 0 ? l : ''));

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <LineChart
        data={{
          labels: filteredLabels,
          datasets: [{ data: values, color: () => '#3B82F6' }],
        }}
        width={screenWidth}
        height={200}
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: '#1F2937',
          backgroundGradientFrom: '#1F2937',
          backgroundGradientTo: '#111827',
          decimalPlaces: 1,
          color: () => '#9CA3AF',
          labelColor: () => '#6B7280',
          propsForDots: { r: '3', strokeWidth: '1', stroke: '#3B82F6' },
          propsForBackgroundLines: { strokeDasharray: '3', stroke: '#374151' },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  chart: {
    borderRadius: 12,
  },
  empty: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginVertical: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
