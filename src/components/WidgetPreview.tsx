import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { WidgetSize } from '../types/widget';
import { WidgetData, formatWidgetHashrate } from '../services/widgetData';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';

interface WidgetPreviewProps {
  size: WidgetSize;
  data: WidgetData | null;
}

export function WidgetPreview({ size, data }: WidgetPreviewProps) {
  const theme = useTheme();

  const dimensions: Record<WidgetSize, { width: number; height: number }> = {
    small: { width: 152, height: 152 },
    medium: { width: 329, height: 152 },
    large: { width: 329, height: 345 },
  };

  const dim = dimensions[size];

  const healthColor: Record<string, string> = {
    A: theme.success,
    B: theme.success + 'CC',
    C: theme.warning,
    D: theme.warning + 'CC',
    F: theme.danger,
  };

  if (!data) {
    return (
      <View
        style={[
          styles.container,
          { width: dim.width, height: dim.height, backgroundColor: theme.surfaceLight },
        ]}
        accessibilityLabel="Widget preview (no data)"
      >
        <Text style={[styles.noData, { color: theme.textMuted }]}>No Data</Text>
      </View>
    );
  }

  if (size === 'small') {
    return (
      <View
        style={[
          styles.container,
          { width: dim.width, height: dim.height, backgroundColor: theme.surfaceLight },
        ]}
        accessibilityLabel={`Small widget: Health ${data.fleetHealth}, ${data.onlineMiners} online`}
      >
        <Text style={[styles.healthGrade, { color: healthColor[data.fleetHealth] || theme.text }]}>
          {data.fleetHealth}
        </Text>
        <Text style={[styles.smallMetric, { color: theme.text }]}>
          {data.onlineMiners}/{data.totalMiners}
        </Text>
        <Text style={[styles.smallLabel, { color: theme.textDim }]}>online</Text>
      </View>
    );
  }

  if (size === 'medium') {
    return (
      <View
        style={[
          styles.container,
          styles.mediumContainer,
          { width: dim.width, height: dim.height, backgroundColor: theme.surfaceLight },
        ]}
        accessibilityLabel={`Medium widget: Health ${data.fleetHealth}, ${formatWidgetHashrate(data.totalHashrate)}, ${data.avgTemp} degrees`}
      >
        <View style={styles.mediumLeft}>
          <Text
            style={[styles.healthGrade, { color: healthColor[data.fleetHealth] || theme.text }]}
          >
            {data.fleetHealth}
          </Text>
          <Text style={[styles.gradeLabel, { color: theme.textDim }]}>Grade</Text>
        </View>
        <View style={styles.mediumRight}>
          <View style={styles.metricRow}>
            <Text style={[styles.metricValue, { color: theme.text }]} numberOfLines={1}>
              {formatWidgetHashrate(data.totalHashrate)}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricValue, { color: theme.text }]}>{data.avgTemp}°C</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricSmall, { color: theme.textDim }]}>
              {data.onlineMiners}/{data.totalMiners} online
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        styles.largeContainer,
        { width: dim.width, height: dim.height, backgroundColor: theme.surfaceLight },
      ]}
      accessibilityLabel={`Large widget: Health ${data.fleetHealth}, ${formatWidgetHashrate(data.totalHashrate)}, ${data.avgTemp} degrees, ${data.onlineMiners} online`}
    >
      <View style={styles.largeHeader}>
        <Text
          style={[styles.healthGradeLarge, { color: healthColor[data.fleetHealth] || theme.text }]}
        >
          {data.fleetHealth}
        </Text>
        <View style={styles.largeHeaderRight}>
          <Text style={[styles.largeTitle, { color: theme.text }]}>Fleet Health</Text>
          <Text style={[styles.largeSubtitle, { color: theme.textDim }]}>
            {data.onlineMiners}/{data.totalMiners} miners online
          </Text>
        </View>
      </View>

      <View style={styles.largeMetrics}>
        <View style={styles.largeMetricItem}>
          <Text style={[styles.largeMetricValue, { color: theme.text }]}>
            {formatWidgetHashrate(data.totalHashrate)}
          </Text>
          <Text style={[styles.largeMetricLabel, { color: theme.textDim }]}>Hashrate</Text>
        </View>
        <View style={styles.largeMetricItem}>
          <Text style={[styles.largeMetricValue, { color: theme.text }]}>{data.avgTemp}°C</Text>
          <Text style={[styles.largeMetricLabel, { color: theme.textDim }]}>Avg Temp</Text>
        </View>
      </View>

      <View style={[styles.chartPlaceholder, { backgroundColor: theme.border + '40' }]}>
        <Text style={[styles.chartPlaceholderText, { color: theme.textMuted }]}>
          Hashrate Trend
        </Text>
        <View style={styles.chartBars}>
          {[0.4, 0.6, 0.55, 0.7, 0.65, 0.8, 0.75].map((h, i) => (
            <View
              key={i}
              style={[
                styles.chartBar,
                {
                  height: h * 40,
                  backgroundColor: theme.primary + '80',
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mediumContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  largeContainer: {
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  healthGrade: {
    fontSize: 48,
    fontWeight: fontWeight.extrabold,
  },
  healthGradeLarge: {
    fontSize: 40,
    fontWeight: fontWeight.extrabold,
  },
  gradeLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  smallMetric: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xxs,
  },
  smallLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  mediumLeft: {
    alignItems: 'center',
  },
  mediumRight: {
    flex: 1,
    gap: spacing.xxs,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  metricSmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  largeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  largeHeaderRight: {
    flex: 1,
  },
  largeTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  largeSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  largeMetrics: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  largeMetricItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  largeMetricValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  largeMetricLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    marginTop: spacing.xxs,
  },
  chartPlaceholder: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  chartPlaceholderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 40,
    marginTop: spacing.xs,
  },
  chartBar: {
    flex: 1,
    borderRadius: 3,
    minHeight: 4,
  },
  noData: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
