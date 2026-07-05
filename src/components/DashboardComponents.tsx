import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Polyline, Polygon, Circle, Defs, Stop, LinearGradient } from 'react-native-svg';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { Miner } from '../types';
import {
  estimateBTCPerDay,
  formatBTC,
  formatHashrateValue,
  getBTCPrice,
  getBTCPriceHistory,
  getNetworkHashrate,
} from '../utils/hashrate';

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
  onPress?: () => void;
}

export const MetricTile = React.memo(function MetricTile({
  title,
  value,
  unit,
  label,
  trend,
  accent = 'primary',
  chart,
  chartData = [],
  size = 'md',
  onPress,
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
    sm: { padding: spacing.md, minHeight: 80 },
    md: { padding: spacing.lg, minHeight: 110 },
    lg: { padding: spacing.xl, minHeight: 140 },
  };

  const valueSize = {
    sm: fontSize.lg,
    md: fontSize.h2,
    lg: fontSize.hero,
  }[size];

  const TileContent = (
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

  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${title} details`}
    >
      {TileContent}
    </Pressable>
  ) : (
    TileContent
  );
});

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
            borderRadius: radius.xxs,
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
            fontSize: fontSize.sm,
            fontWeight: fontWeight.extrabold,
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
            fontWeight: fontWeight.extrabold,
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

export const ProfitabilityCard = React.memo(function ProfitabilityCard({
  miners,
  powerCost,
}: {
  miners: Miner[];
  powerCost?: number;
}) {
  const theme = useTheme();
  const btcPrice = getBTCPrice();
  const priceHistory = getBTCPriceHistory();
  const netHash = getNetworkHashrate();

  const priceTrend =
    priceHistory.length >= 2 ? priceHistory[priceHistory.length - 1] - priceHistory[0] : 0;

  const perMiner = useMemo(
    () =>
      miners.map((m) => {
        const hps =
          (m.status?.hashRate ?? 0) *
          (() => {
            const u = m.status?.hashRateUnit;
            if (u === 'KH/s') return 1e3;
            if (u === 'MH/s') return 1e6;
            if (u === 'GH/s') return 1e9;
            if (u === 'TH/s') return 1e12;
            if (u === 'PH/s') return 1e15;
            return 1;
          })();
        const btcDay = estimateBTCPerDay(hps);
        return { ...m, btcPerDay: btcDay, hps };
      }),
    [miners],
  );

  const totalBtcDay = useMemo(() => perMiner.reduce((sum, m) => sum + m.btcPerDay, 0), [perMiner]);

  const usdPerDay = totalBtcDay * btcPrice;

  return (
    <View
      style={{
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        backgroundColor: theme.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 16,
        gap: 10,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>
          ≡ Profitability
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {priceHistory.length >= 4 && (
            <Svg width={36} height={20}>
              <Polyline
                points={priceHistory
                  .map((p, i) => {
                    const x = (i / (priceHistory.length - 1)) * 34;
                    const min = Math.min(...priceHistory);
                    const max = Math.max(...priceHistory);
                    const range = max - min || 1;
                    const y = 18 - ((p - min) / range) * 16;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke={priceTrend >= 0 ? theme.success : theme.danger}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
          <Text
            style={{ color: theme.textDim, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
          >
            BTC
          </Text>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: fontWeight.extrabold }}>
            ${btcPrice.toLocaleString()}
          </Text>
          {priceHistory.length >= 2 && (
            <Text
              style={{
                color: priceTrend >= 0 ? theme.success : theme.danger,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.bold,
              }}
            >
              {priceTrend >= 0 ? '▲' : '▼'}{' '}
              {((Math.abs(priceTrend) / priceHistory[0]) * 100).toFixed(1)}%
            </Text>
          )}
        </View>
      </View>
      {/* Network hashrate row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          backgroundColor: theme.surfaceLight,
          borderRadius: 10,
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
        }}
      >
        <Text
          style={{ color: theme.textDim, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
        >
          Network Hashrate
        </Text>
        <Text style={{ color: theme.primary, fontSize: 12, fontWeight: fontWeight.bold }}>
          {formatHashrateValue(netHash)}
        </Text>
      </View>
      {perMiner.map((m) => (
        <View
          key={m.id}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: spacing.xxs,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Text
            style={{
              color: theme.text,
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {m.name || m.id}
          </Text>
          <Text style={{ color: theme.primary, fontSize: 12, fontWeight: fontWeight.bold }}>
            {formatBTC(m.btcPerDay)}/day
          </Text>
          {btcPrice > 0 && (
            <Text style={{ color: theme.textDim, fontSize: fontSize.sm, marginLeft: 6 }}>
              (~${(m.btcPerDay * btcPrice).toFixed(2)})
            </Text>
          )}
        </View>
      ))}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 6,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: fontWeight.extrabold }}>
          Total
        </Text>
        <Text style={{ color: theme.success, fontSize: 14, fontWeight: fontWeight.extrabold }}>
          {formatBTC(totalBtcDay)}/day
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{ color: theme.textDim, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}
          >
            Week
          </Text>
          <Text style={{ color: theme.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
            {formatBTC(totalBtcDay * 7)}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{ color: theme.textDim, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}
          >
            Month
          </Text>
          <Text style={{ color: theme.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
            {formatBTC(totalBtcDay * 30)}
          </Text>
        </View>
        {btcPrice > 0 && (
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                color: theme.textDim,
                fontSize: fontSize.xs,
                fontWeight: fontWeight.semibold,
              }}
            >
              USD/day
            </Text>
            <Text
              style={{ color: theme.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}
            >
              ~${usdPerDay.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
      {typeof powerCost === 'number' && powerCost > 0 && totalBtcDay > 0 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 4,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}
        >
          <Text style={{ color: theme.textDim, fontSize: 12 }}>Net/day (after power)</Text>
          <Text
            style={{
              color:
                totalBtcDay * btcPrice -
                  (miners.reduce((s, m) => s + (m.status?.power ?? 0), 0) / 1000) * 24 * powerCost >
                0
                  ? theme.success
                  : theme.danger,
              fontSize: fontSize.base,
              fontWeight: fontWeight.bold,
            }}
          >
            $
            {(
              totalBtcDay * btcPrice -
              (miners.reduce((s, m) => s + (m.status?.power ?? 0), 0) / 1000) * 24 * powerCost
            ).toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.xxs,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xxs,
  },
  value: {
    fontWeight: fontWeight.extrabold,
    letterSpacing: -0.3,
  },
  unit: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
  },
  label: {
    fontSize: 9,
    fontWeight: fontWeight.semibold,
    marginTop: 1,
  },
  chartContainer: {
    marginTop: spacing.xxs,
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
