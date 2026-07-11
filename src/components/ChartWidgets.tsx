import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Polygon, Polyline, Defs, Stop, LinearGradient, Circle } from 'react-native-svg';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';

const absoluteFillStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
}

export const Sparkline = React.memo(function Sparkline({
  data,
  width = 120,
  height = 40,
  color,
  fill: _fill,
}: SparklineProps) {
  const theme = useTheme();
  const stroke = color || theme.info;
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
          <LinearGradient id={`spark-${stroke}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity="0.4" />
            <Stop offset="1" stopColor={stroke} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Polygon points={areaPoints} fill={`url(#spark-${stroke})`} />
        <Polyline points={points} fill="none" stroke={stroke} strokeWidth="2" />
      </Svg>
    </View>
  );
});

interface MiniBarChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export const MiniBarChart = React.memo(function MiniBarChart({
  data,
  width = 120,
  height = 40,
  color,
}: MiniBarChartProps) {
  const theme = useTheme();
  const stroke = color || theme.primary;
  const barWidth = (width / data.length) * 0.6;
  const gap = (width / data.length) * 0.4;
  const max = Math.max(...data, 0.001);

  return (
    <View style={{ width, height, flexDirection: 'row', alignItems: 'flex-end', gap: gap / 2 }}>
      {data.map((v, i) => (
        <View
          key={i}
          style={{
            width: barWidth,
            height: Math.max((v / max) * height, 4),
            backgroundColor: stroke,
            borderRadius: radius.xxs,
          }}
        />
      ))}
    </View>
  );
});

interface DonutProps {
  value: number;
  max?: number;
  color?: string;
  size?: number;
}

export const Donut = React.memo(function Donut({
  value,
  max = 100,
  color,
  size = 100,
}: DonutProps) {
  const theme = useTheme();
  const strokeColor = color || theme.primary;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / max) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.border}
          strokeWidth="8"
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[absoluteFillStyle, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text
          style={{ color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.extrabold }}
        >
          {Math.round(value)}%
        </Text>
      </View>
    </View>
  );
});

interface GaugeProps {
  value: number;
  max?: number;
  color?: string;
  width?: number;
  height?: number;
}

export const Gauge = React.memo(function Gauge({
  value,
  max = 100,
  color,
  width = 120,
  height = 70,
}: GaugeProps) {
  const theme = useTheme();
  const strokeColor = color || theme.success;
  const radius = (width - 20) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / max) * circumference;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Circle
          cx={width / 2}
          cy={height - 10}
          r={radius}
          stroke={theme.border}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset="0"
          strokeLinecap="round"
        />
        <Circle
          cx={width / 2}
          cy={height - 10}
          r={radius}
          stroke={strokeColor}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="180"
          origin={`${width / 2}, ${height - 10}`}
        />
      </Svg>
    </View>
  );
});

interface TimelineSegment {
  month: string;
  value: number;
  color?: string;
}

interface TimelineProps {
  data: TimelineSegment[];
  width?: number;
  height?: number;
}

export const Timeline = React.memo(function Timeline({
  data,
  width = 140,
  height = 220,
}: TimelineProps) {
  const theme = useTheme();
  const dotSize = 28;

  return (
    <View style={{ width, height }}>
      {data.map((item) => (
        <View
          key={item.month}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: (height - data.length * spacing.xs) / data.length,
            gap: spacing.xs,
          }}
        >
          <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, width: spacing.xl }}>
            {item.month}
          </Text>
          <View
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              borderWidth: 2,
              borderColor: item.color || theme.primary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.text, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
              {item.value}%
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
});
