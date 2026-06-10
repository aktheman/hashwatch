import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface StatWidgetProps {
  label: string;
  value: string;
  icon?: string;
  color?: string;
}

export function StatWidget({ label, value, icon, color = theme.primary }: StatWidgetProps) {
  return (
    <View style={[styles.container, { borderColor: color + '20' }]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 14,
    margin: 5,
    borderWidth: 1,
    gap: 2,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconText: {
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    color: theme.textDim,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
  },
});
