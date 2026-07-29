import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

interface RealtimeChartProps {
  data: number[];
  color: string;
  label: string;
  unit: string;
  min?: number;
  max?: number;
  dangerZone?: number;
}

function buildPath(
  points: number[],
  width: number,
  height: number,
  minVal: number,
  maxVal: number,
): string {
  if (points.length < 2) return '';
  const range = maxVal - minVal || 1;
  const stepX = width / (points.length - 1);
  return points
    .map((val, i) => {
      const x = i * stepX;
      const y = height - ((val - minVal) / range) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildAreaPath(
  points: number[],
  width: number,
  height: number,
  minVal: number,
  maxVal: number,
): string {
  const line = buildPath(points, width, height, minVal, maxVal);
  if (!line) return '';
  return `${line} L${width},${height} L0,${height} Z`;
}

const CHART_WIDTH = 280;
const CHART_HEIGHT = 60;
const MAX_POINTS = 60;

const RealtimeChartInner: React.FC<RealtimeChartProps> = ({
  data,
  color,
  label,
  unit,
  min: propMin,
  max: propMax,
  dangerZone,
}) => {
  const theme = useTheme();
  const trimmedData = useMemo(() => data.slice(-MAX_POINTS), [data]);

  const current = trimmedData.length > 0 ? trimmedData[trimmedData.length - 1] : 0;
  const minVal = propMin ?? (trimmedData.length > 0 ? Math.min(...trimmedData) : 0);
  const maxVal =
    propMax ?? Math.max(minVal + 1, trimmedData.length > 0 ? Math.max(...trimmedData) : 100);

  const pathD = useMemo(
    () => buildPath(trimmedData, CHART_WIDTH, CHART_HEIGHT, minVal, maxVal),
    [trimmedData, minVal, maxVal],
  );
  const areaD = useMemo(
    () => buildAreaPath(trimmedData, CHART_WIDTH, CHART_HEIGHT, minVal, maxVal),
    [trimmedData, minVal, maxVal],
  );

  const dangerY =
    dangerZone != null && maxVal > minVal
      ? CHART_HEIGHT - ((dangerZone - minVal) / (maxVal - minVal)) * CHART_HEIGHT
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.textDim }]}>{label}</Text>
        <Text style={[styles.currentValue, { color }]}>
          {typeof current === 'number' ? current.toFixed(1) : '0.0'} {unit}
        </Text>
      </View>
      <View style={styles.minMaxRow}>
        <Text style={[styles.minMax, { color: theme.textMuted }]}>Min: {minVal.toFixed(1)}</Text>
        <Text style={[styles.minMax, { color: theme.textMuted }]}>Max: {maxVal.toFixed(1)}</Text>
        <Text style={[styles.minMax, { color: theme.textMuted }]}>Cur: {current.toFixed(1)}</Text>
      </View>
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT} style={styles.svg}>
          <Defs>
            <LinearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.3" />
              <Stop offset="1" stopColor={color} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>
          {dangerY != null && (
            <Path
              d={`M0,${dangerY.toFixed(1)} L${CHART_WIDTH},${dangerY.toFixed(1)}`}
              stroke={theme.danger}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.6}
            />
          )}
          {areaD ? <Path d={areaD} fill={`url(#grad-${label})`} /> : null}
          {pathD ? (
            <Path d={pathD} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
          ) : null}
        </Svg>
        {trimmedData.length === 0 && (
          <View style={styles.emptyOverlay}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Waiting for data...</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export const RealtimeChart = React.memo(RealtimeChartInner);

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  currentValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  minMaxRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  minMax: {
    fontSize: 10,
    fontWeight: '500',
  },
  chartContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  svg: {
    overflow: 'hidden',
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
