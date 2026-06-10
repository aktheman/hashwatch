import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface StatWidgetProps {
  label: string;
  value: string;
  icon?: string;
  color?: string;
}

export function StatWidget({ label, value, color = theme.primary }: StatWidgetProps) {
  return (
    <View style={[styles.container, { borderLeftColor: color }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    margin: 4,
    borderWidth: 1,
    borderColor: theme.border,
    borderLeftColor: undefined as any,
  },
  label: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
  },
});
