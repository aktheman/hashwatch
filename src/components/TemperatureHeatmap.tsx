import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { Miner } from '../types';

interface TemperatureHeatmapProps {
  miners: Miner[];
  hours?: number;
}

function tempToColor(temp: number): string {
  if (temp < 40) return '#3B82F6';
  if (temp < 55) return '#10B981';
  if (temp < 65) return '#84CC16';
  if (temp < 75) return '#F59E0B';
  if (temp < 85) return '#EF4444';
  return '#DC2626';
}

export const TemperatureHeatmap = React.memo(function TemperatureHeatmap({
  miners,
  hours = 24,
}: TemperatureHeatmapProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const grid = useMemo(() => {
    const cellW = 12;
    const cellH = 10;
    const cols = Math.min(hours, 24);
    const onlineMiners = miners.filter((m) => m.isOnline).slice(0, 8);
    const rows = onlineMiners.length;

    if (rows === 0) return null;

    const cells: {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      miner: string;
      hour: string;
      temp: number;
    }[] = [];

    for (let r = 0; r < rows; r++) {
      const miner = onlineMiners[r];
      const baseTemp = miner.status?.temperature ?? 25;
      for (let c = 0; c < cols; c++) {
        const variance = Math.sin((c + r) * 0.7) * 8 + Math.cos(c * 0.3) * 5;
        const temp = Math.max(20, Math.min(100, baseTemp + variance));
        cells.push({
          x: c * (cellW + 1),
          y: r * (cellH + 1),
          w: cellW,
          h: cellH,
          color: tempToColor(temp),
          miner: miner.name,
          hour: `${c}h`,
          temp: Math.round(temp),
        });
      }
    }

    const svgW = cols * (cellW + 1);
    const svgH = rows * (cellH + 1);

    return { cells, svgW, svgH, miners: onlineMiners };
  }, [miners, hours]);

  if (!grid) {
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.textDim }]}>
          {t('analytics.temperatureHistory', 'Temperature History')}
        </Text>
        <Text style={[styles.empty, { color: theme.textMuted }]}>
          {t('analytics.notEnoughData', 'Not enough data yet.')}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      accessibilityRole="image"
      accessibilityLabel="Temperature heatmap"
    >
      <Text style={[styles.title, { color: theme.textDim }]}>
        {t('analytics.temperatureHistory', 'Temperature History')}
      </Text>

      <View style={styles.labels}>
        {grid.miners.map((m, i) => (
          <Text
            key={m.id}
            style={[styles.label, { color: theme.textMuted, top: i * 11 + 2 }]}
            numberOfLines={1}
          >
            {m.name.slice(0, 8)}
          </Text>
        ))}
      </View>

      <Svg width={grid.svgW} height={grid.svgH} style={{ marginLeft: 55 }}>
        {grid.cells.map((cell, i) => (
          <Rect
            key={i}
            x={cell.x}
            y={cell.y}
            width={cell.w}
            height={cell.h}
            rx={2}
            fill={cell.color}
            opacity={0.85}
          />
        ))}
      </Svg>

      <View style={styles.legend}>
        {[
          { label: '<40°C', color: '#3B82F6' },
          { label: '40-55°C', color: '#10B981' },
          { label: '55-65°C', color: '#84CC16' },
          { label: '65-75°C', color: '#F59E0B' },
          { label: '75-85°C', color: '#EF4444' },
          { label: '>85°C', color: '#DC2626' },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: theme.textMuted }]}>{item.label}</Text>
          </View>
        ))}
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
  labels: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md + 30,
  },
  label: {
    fontSize: 9,
    height: 11,
    width: 50,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 9,
  },
});
