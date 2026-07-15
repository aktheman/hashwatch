import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path as SvgPath, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { Miner } from '../types';

interface PowerUsageChartProps {
  miners: Miner[];
}

function buildAreaPath(data: number[], w: number, h: number): string {
  if (data.length === 0) return '';
  const max = Math.max(...data, 1);
  const step = w / Math.max(data.length - 1, 1);
  let d = `M 0 ${h}`;
  for (let i = 0; i < data.length; i++) {
    const x = i * step;
    const y = h - (data[i] / max) * h * 0.85;
    d += ` L ${x} ${y}`;
  }
  d += ` L ${w} ${h} Z`;
  return d;
}

function buildLinePath(data: number[], w: number, h: number): string {
  if (data.length === 0) return '';
  const max = Math.max(...data, 1);
  const step = w / Math.max(data.length - 1, 1);
  let d = '';
  for (let i = 0; i < data.length; i++) {
    const x = i * step;
    const y = h - (data[i] / max) * h * 0.85;
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return d;
}

export const PowerUsageChart = React.memo(function PowerUsageChart({
  miners,
}: PowerUsageChartProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const chart = useMemo(() => {
    const onlineMiners = miners.filter((m) => m.isOnline);
    if (onlineMiners.length === 0) return null;

    const totalPower = onlineMiners.reduce((sum, m) => sum + (m.status?.power ?? 0), 0);
    const maxPower = Math.max(...onlineMiners.map((m) => m.status?.power ?? 0), 1);

    const chartW = 280;
    const chartH = 100;

    const powers = onlineMiners.map((m) => m.status?.power ?? 0);
    const linePath = buildLinePath(powers, chartW, chartH);
    const areaPath = buildAreaPath(powers, chartW, chartH);

    return {
      totalPower,
      minerCount: onlineMiners.length,
      maxPower,
      powers,
      linePath,
      areaPath,
      chartW,
      chartH,
    };
  }, [miners]);

  if (!chart) {
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.textDim }]}>
          {t('analytics.power', 'Power (W)')}
        </Text>
        <Text style={[styles.empty, { color: theme.textMuted }]}>
          {t('analytics.notEnoughData', 'Not enough data yet.')}
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={t('analytics.power', 'Power (W)')}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <Text style={[styles.title, { color: theme.textDim }]}>
        {t('analytics.power', 'Power (W)')}
      </Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: theme.warning }]}>{chart.totalPower}W</Text>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
            {t('powerUsage.total', 'Total')}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: theme.info }]}>
            {chart.maxPower.toFixed(0)}W
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
            {t('powerUsage.peak', 'Peak')}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: theme.success }]}>
            {(chart.totalPower / chart.minerCount).toFixed(0)}W
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
            {t('powerUsage.avg', 'Avg')}
          </Text>
        </View>
      </View>

      <Svg width={chart.chartW} height={chart.chartH + 8} style={{ marginTop: spacing.sm }}>
        <Defs>
          <LinearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.warning} stopOpacity={0.4} />
            <Stop offset="1" stopColor={theme.warning} stopOpacity={0.05} />
          </LinearGradient>
        </Defs>
        <SvgPath d={chart.areaPath} fill="url(#powerGrad)" />
        <SvgPath d={chart.linePath} stroke={theme.warning} strokeWidth={2} fill="none" />
      </Svg>

      <View style={styles.minerBars}>
        {miners
          .filter((m) => m.isOnline)
          .slice(0, 5)
          .map((m) => {
            const power = m.status?.power ?? 0;
            const pct = Math.min((power / chart.maxPower) * 100, 100);
            return (
              <View key={m.id} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: theme.textMuted }]} numberOfLines={1}>
                  {m.name.slice(0, 10)}
                </Text>
                <View style={[styles.barTrack, { backgroundColor: theme.surfaceLight }]}>
                  <View
                    style={[styles.barFill, { width: `${pct}%`, backgroundColor: theme.warning }]}
                  />
                </View>
                <Text style={[styles.barValue, { color: theme.text }]}>{power}W</Text>
              </View>
            );
          })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  empty: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  minerBars: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  barLabel: {
    width: 60,
    fontSize: 10,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barValue: {
    width: 40,
    fontSize: 10,
    textAlign: 'right',
  },
});
