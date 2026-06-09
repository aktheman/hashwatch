import { View, Text, StyleSheet } from 'react-native';

interface StatWidgetProps {
  label: string;
  value: string;
  icon?: string;
  color?: string;
}

export function StatWidget({ label, value, color = '#3B82F6' }: StatWidgetProps) {
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
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    margin: 4,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
});
