import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface MetricTileProps {
  title: string;
  value: string;
  unit?: string;
  label?: string;
  trend?: string;
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  chart?: 'sparkline' | 'bars' | 'donut' | 'gauge';
  chartData?: number[];
  size?: 'sm' | 'md' | 'lg';
}

export function MetricTile({
  title,
  value,
  unit,
  label,
  trend,
  accent = 'primary',
  chart,
  chartData = [],
  size = 'md',
}: MetricTileProps) {
  const theme = useTheme();
  const accentColor = useMemo(() => {
    switch (accent) {
      case 'success':
        return theme.success;
      case 'warning':
        return theme.warning;
      case 'danger':
        return theme.danger;
      case 'info':
        return theme.info;
      default:
        return theme.primary;
    }
  }, [theme, accent]);

  const sizeStyles = {
    sm: { padding: 10, minHeight: 80 },
    md: { padding: 14, minHeight: 110 },
    lg: { padding: 18, minHeight: 140 },
  };

  const valueSize = {
    sm: 16,
    md: 22,
    lg: 28,
  }[size];

  return (
    <View
      style={[
        styles.container,
        sizeStyles[size],
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.glow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 6,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textMuted }]}>{title}</Text>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: `${accentColor}22` }]}>
            <Text style={[styles.trendText, { color: accentColor }]}>{trend}</Text>
          </View>
        )}
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: theme.text, fontSize: valueSize }]} numberOfLines={1}>
          {value}
        </Text>
        {!!unit && <Text style={[styles.unit, { color: theme.textDim }]}>{unit}</Text>}
      </View>

      {!!label && <Text style={[styles.label, { color: theme.textDim }]}>{label}</Text>}

      {chart === 'sparkline' && chartData.length > 0 && (
        <View style={styles.chartContainer}>
          <SparklineMini data={chartData} color={accentColor} />
        </View>
      )}

      {chart === 'bars' && chartData.length > 0 && (
        <View style={styles.chartContainer}>
          <MiniBars data={chartData} color={accentColor} />
        </View>
      )}

      {chart === 'donut' && (
        <View style={styles.chartCenter}>
          <DonutRing
            value={72}
            color={accentColor}
            size={size === 'lg' ? 80 : size === 'md' ? 64 : 48}
          />
        </View>
      )}

      {chart === 'gauge' && (
        <View style={styles.chartCenter}>
          <GaugeArc
            value={65}
            color={accentColor}
            width={size === 'lg' ? 140 : size === 'md' ? 120 : 100}
            height={size === 'lg' ? 80 : size === 'md' ? 68 : 56}
          />
        </View>
      )}

      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
    </View>
  );
}

function SparklineMini({ data, color }: { data: number[]; color: string }) {
  const width = 120;
  const height = 36;
  const min = Math.min(...data);
  const max = Math.max(...data, min + 0.001);
  const stepX = width / Math.max(data.length - 1, 1);
  const points = data
    .map((v, i) => `${i * stepX},${height - ((v - min) / (max - min)) * height}`)
    .join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.35" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Polygon points={areaPoints} fill={`url(#grad-${color})`} />
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function MiniBars({ data, color }: { data: number[]; color: string }) {
  const width = 120;
  const height = 36;
  const barWidth = (width / data.length) * 0.55;
  const gap = (width / data.length) * 0.45;
  const max = Math.max(...data, 0.001);

  return (
    <View style={{ width, height, flexDirection: 'row', alignItems: 'flex-end', gap: gap * 0.5 }}>
      {data.map((v, i) => (
        <View
          key={i}
          style={{
            width: barWidth,
            height: Math.max((v / max) * height, 3),
            backgroundColor: color,
            borderRadius: 2,
            opacity: 0.9,
          }}
        />
      ))}
    </View>
  );
}

function DonutRing({ value, color, size = 64 }: { value: number; color: string; size: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E293B"
          strokeWidth="6"
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '800',
            textAlign: 'center',
            marginTop: size / 2 - 8,
          }}
        >
          {value}%
        </Text>
      </View>
    </View>
  );
}

function GaugeArc({
  value,
  color,
  width = 120,
  height = 68,
}: {
  value: number;
  color: string;
  width: number;
  height: number;
}) {
  const radius = (width - 16) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Circle
          cx={width / 2}
          cy={height - 8}
          r={radius}
          stroke="#1E293B"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset="0"
          strokeLinecap="round"
        />
        <Circle
          cx={width / 2}
          cy={height - 8}
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="180"
          origin={`${width / 2}, ${height - 8}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '800',
            textAlign: 'center',
            marginTop: height / 2 - 10,
          }}
        >
          {value}°
        </Text>
      </View>
    </View>
  );
}

import Svg, { Polygon, Polyline, Defs, Stop, LinearGradient, Circle } from 'react-native-svg';

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  unit: {
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  chartContainer: {
    marginTop: 4,
  },
  chartCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
});
