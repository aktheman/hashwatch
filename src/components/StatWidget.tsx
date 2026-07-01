import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../theme';
import { spacing, fontSize, fontWeight, radius, cardStyle } from '../utils/design';

interface StatWidgetProps {
  label: string;
  value: string;
  icon?: string;
  color?: string;
}

export function StatWidget({ label, value, icon, color: colorProp }: StatWidgetProps) {
  const theme = useTheme();
  const color = colorProp ?? theme.primary;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...cardStyle(theme),
          minWidth: '45%',
          padding: spacing.md,
          margin: spacing.xs,
          gap: spacing.xxs,
        },
        iconCircle: {
          width: 28,
          height: 28,
          borderRadius: 14,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.xxs,
        },
        iconText: {
          fontSize: fontSize.sm,
          fontWeight: fontWeight.bold,
        },
        label: {
          color: theme.textDim,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        value: {
          fontSize: fontSize.h2,
          fontWeight: fontWeight.extrabold,
        },
      }),
    [theme],
  );

  return (
    <View
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.container, { borderColor: color + '20' }]}
    >
      {icon && (
        <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
          <Text style={[styles.iconText, { color }]}>{icon}</Text>
        </View>
      )}
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}
