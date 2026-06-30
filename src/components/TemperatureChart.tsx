import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart } from 'react-native-chart-kit';
import { MinerSnapshot } from '../types';
import { useTheme } from '../theme';

interface TemperatureChartProps {
  snapshots: MinerSnapshot[];
  title?: string;
}

export function TemperatureChart({ snapshots, title }: TemperatureChartProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
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
        <Text style={styles.emptyIcon}>🌡</Text>
        <Text style={styles.emptyText}>
          {t('temperatureChart.notEnoughData', 'Not enough data for temperature chart')}
        </Text>
      </View>
    );
  }

  const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
  const hasTempData = sorted.some((s) => s.temperature != null);
  if (!hasTempData) {
    return null;
  }

  const labels = sorted.map((s) => {
    const d = new Date(s.timestamp);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  });
  const values = sorted.map((s) => s.temperature ?? 0);

  const screenWidth = windowWidth - 64;
  const step = Math.max(1, Math.floor(labels.length / 4));
  const filteredLabels = labels.map((l, i) => (i % step === 0 ? l : ''));

  const formatValue = (v: string) => `${parseFloat(v).toFixed(0)}°`;

  const lineColor = () => theme.danger;
  const dotColor = theme.danger;

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('temperatureChart.title', 'Temperature History')}
    >
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.chartWrapper}>
        <Text style={styles.yLabel}>°C</Text>
        <LineChart
          data={{
            labels: filteredLabels,
            datasets: [{ data: values, color: lineColor }],
          }}
          width={screenWidth}
          height={200}
          yAxisSuffix=""
          fromZero={false}
          chartConfig={{
            backgroundColor: theme.surface,
            backgroundGradientFrom: theme.surface,
            backgroundGradientTo: theme.surface,
            decimalPlaces: 0,
            color: () => theme.textMuted,
            labelColor: () => theme.textMuted,
            propsForDots: {
              r: '3',
              strokeWidth: '2',
              stroke: dotColor,
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
