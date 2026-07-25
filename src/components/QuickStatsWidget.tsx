import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { spacing, fontSize, fontWeight, cardStyle } from '../utils/design';

interface QuickStatsWidgetProps {
  hashrate: string;
  temperature: number;
  power: number;
  miners: { online: number; total: number };
}

function tempColor(temp: number, danger: string, warning: string, success: string): string {
  if (temp > 80) return danger;
  if (temp >= 65) return warning;
  return success;
}

export const QuickStatsWidget = React.memo(function QuickStatsWidget({
  hashrate,
  temperature,
  power,
  miners,
}: QuickStatsWidgetProps) {
  const theme = useTheme();

  const tColor = useMemo(
    () => tempColor(temperature, theme.danger, theme.warning, theme.success),
    [temperature, theme],
  );

  const stats = useMemo(
    () => [
      { icon: '⬡', value: hashrate, label: 'Hashrate', color: theme.primary },
      { icon: '🌡', value: `${temperature}°C`, label: 'Temp', color: tColor },
      { icon: '⚡', value: `${power}W`, label: 'Power', color: theme.accent },
      {
        icon: '⛏',
        value: `${miners.online}/${miners.total}`,
        label: 'Miners',
        color: theme.success,
      },
    ],
    [hashrate, temperature, power, miners, theme, tColor],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...cardStyle(theme),
          flexDirection: 'row',
          padding: spacing.sm,
          marginHorizontal: spacing.md,
          marginBottom: spacing.sm,
        },
        tile: {
          flex: 1,
          alignItems: 'center',
          gap: spacing.xxs,
        },
        iconText: {
          fontSize: fontSize.lg,
        },
        value: {
          fontSize: fontSize.base,
          fontWeight: fontWeight.extrabold,
        },
        label: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
          color: theme.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
      }),
    [theme],
  );

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Hashrate: ${hashrate}, Temperature: ${temperature} degrees, Power: ${power} watts, Miners: ${miners.online} of ${miners.total} online`}
    >
      {stats.map((stat) => (
        <View key={stat.label} style={styles.tile}>
          <Text style={styles.iconText}>{stat.icon}</Text>
          <Text style={[styles.value, { color: stat.color }]}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
});
