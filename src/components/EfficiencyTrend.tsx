import { useMemo } from 'react';
import { View, Text, useWindowDimensions, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LineChart } from 'react-native-chart-kit';
import { MinerSnapshot } from '../types';
import { useTheme } from '../theme';
import { toHashesPerSecond } from '../utils/hashrate';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';

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
  const { t } = useTranslation();
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
          {t('efficiencyTrend.notEnoughData')}
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={t('efficiencyTrend.average', { avg: avg.toFixed(1) })}
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
        style={{ borderRadius: radius.md }}
      />
      {avg > 0 && (
        <Text style={[styles.avg, { color: theme.textDim }]}>
          {t('efficiencyTrend.average', { avg: avg.toFixed(1) })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
  },
  avg: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
  emptyIcon: {
    fontSize: fontSize.hero,
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.base,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
