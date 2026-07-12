import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyLineChart } from './LazyLineChart';
import { MinerSnapshot } from '../types';
import { useTheme } from '../theme';
import { spacing, fontSize, fontWeight, radius } from '../utils/design';
import { toHashesPerSecond } from '../utils/hashrate';

interface HashrateChartProps {
  snapshots: MinerSnapshot[];
  title?: string;
}

export function HashrateChart({ snapshots, title }: HashrateChartProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginVertical: spacing.xs,
        },
        title: {
          color: theme.text,
          fontSize: fontSize.base,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.sm,
          marginLeft: spacing.xxs,
        },
        yLabel: {
          position: 'absolute',
          top: 12,
          right: 14,
          color: theme.textMuted,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
          zIndex: 10,
        },
        chartWrapper: {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        chart: {
          borderRadius: radius.md,
        },
        empty: {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.border,
          padding: spacing.lg,
          alignItems: 'center',
          marginVertical: spacing.xs,
          gap: spacing.xs,
        },
        emptyIcon: {
          fontSize: fontSize.h1,
        },
        emptyText: {
          color: theme.textDim,
          fontSize: fontSize.base,
        },
      }),
    [theme],
  );

  if (snapshots.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>{t('hashrateChart.notEnoughData')}</Text>
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

  const screenWidth = windowWidth - 64;
  const step = Math.max(1, Math.floor(labels.length / 4));
  const filteredLabels = labels.map((l, i) => (i % step === 0 ? l : ''));

  const formatValue = (v: string) => parseFloat(v).toFixed(1);
  const unit = t('charts.ghs');

  return (
    <View style={styles.container} accessibilityLabel={t('hashrateChart.notEnoughData')}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.chartWrapper}>
        <Text style={styles.yLabel}>{unit}</Text>
        <LazyLineChart
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
            backgroundGradientTo: theme.surface,
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
              fontSize: fontSize.xs,
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
