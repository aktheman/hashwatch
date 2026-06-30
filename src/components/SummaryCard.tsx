import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';

interface SummaryCardProps {
  icon: string;
  value: string;
  label: string;
  color?: string;
  accent?: boolean;
}

export function SummaryCard({ icon, value, label, color, accent }: SummaryCardProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.border,
        },
        icon: {
          fontSize: 18,
          marginBottom: 2,
        },
        value: {
          fontSize: fontSize.h2,
          fontWeight: fontWeight.extrabold,
          color: color || theme.text,
          letterSpacing: -0.3,
        },
        label: {
          fontSize: fontSize.xs,
          color: theme.textDim,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginTop: spacing.xxs,
        },
      }),
    [theme, color],
  );

  return (
    <View style={styles.card}>
      {accent && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: color || theme.primary,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
          }}
        />
      )}
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}
