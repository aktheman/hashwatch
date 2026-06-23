import { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme';

interface MetricTileProps {
  title: string;
  value: string;
  unit?: string;
  label?: string;
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export function MetricTile({ title, value, unit, label, accent = 'primary' }: MetricTileProps) {
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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          boxShadow: `0 2px 12px ${theme.glow}`,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.textMuted }]}>{title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={[styles.value, { color: theme.text }]} numberOfLines={1}>
          {value}
        </Text>
        {!!unit && <Text style={[styles.unit, { color: theme.textDim }]}>{unit}</Text>}
      </View>
      {!!label && <Text style={[styles.label, { color: theme.textDim }]}>{label}</Text>}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    minHeight: 96,
    gap: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  unit: {
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
});
