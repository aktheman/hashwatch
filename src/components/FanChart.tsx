import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyLineChart } from './LazyLineChart';
import { MinerSnapshot } from '../types';
import { useTheme } from '../theme';
import { spacing, fontSize, fontWeight, radius } from '../utils/design';
import { getChartConfig, CHART_HEIGHT } from '../utils/chartConfig';

interface FanChartProps {
  snapshots: MinerSnapshot[];
  title?: string;
}

export const FanChart = React.memo(function FanChart({ snapshots, title }: FanChartProps) {
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
        <Text style={styles.emptyIcon}>🌀</Text>
        <Text style={styles.emptyText}>{t('charts.notEnoughFan')}</Text>
      </View>
    );
  }

  const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
  const hasFanData = sorted.some((s) => s.fanRpm != null && s.fanRpm > 0);
  if (!hasFanData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🌀</Text>
        <Text style={styles.emptyText}>{t('charts.fanAppears')}</Text>
      </View>
    );
  }

  const labels = sorted.map((s) => {
    const d = new Date(s.timestamp);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  });
  const rpmValues = sorted.map((s) => s.fanRpm ?? 0);

  const screenWidth = windowWidth - 64;
  const step = Math.max(1, Math.floor(labels.length / 4));
  const filteredLabels = labels.map((l, i) => (i % step === 0 ? l : ''));

  const formatValue = (v: string) => `${parseFloat(v).toFixed(0)}rpm`;

  const lineColor = () => theme.success;

  return (
    <View style={styles.container} accessibilityLabel={t('fanChart.title', 'Fan Speed History')}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.chartWrapper}>
        <LazyLineChart
          data={{
            labels: filteredLabels,
            datasets: [{ data: rpmValues, color: lineColor }],
          }}
          width={screenWidth}
          height={CHART_HEIGHT}
          yAxisSuffix=""
          fromZero={false}
          chartConfig={{
            ...getChartConfig(theme, 0),
            propsForDots: {
              r: '3',
              strokeWidth: '2',
              stroke: theme.success,
              fill: theme.surface,
            },
          }}
          bezier
          style={styles.chart}
          formatYLabel={formatValue}
        />
      </View>
    </View>
  );
});
