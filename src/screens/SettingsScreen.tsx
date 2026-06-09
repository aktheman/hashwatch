import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useMinerStore } from '../store/miners';
import { useSubscriptionStore } from '../store/subscription';

export function SettingsScreen({ navigation }: any) {
  const miners = useMinerStore((s) => s.miners);
  const loadMiners = useMinerStore((s) => s.loadMiners);
  const scanNetwork = useMinerStore((s) => s.scanNetwork);
  const scanning = useMinerStore((s) => s.scanning);
  const { isPro, tier } = useSubscriptionStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.rowLabel}>Plan</Text>
          <View style={styles.rowRight}>
            <View
              style={[
                styles.badge,
                { backgroundColor: isPro ? '#065F46' : '#374151' },
              ]}
            >
              <Text style={styles.badgeText}>
                {isPro ? 'Pro' : 'Free'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Miners</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Total Miners</Text>
          <Text style={styles.rowValue}>{miners.length}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Online</Text>
          <Text style={[styles.rowValue, { color: '#22C55E' }]}>
            {miners.filter((m) => m.isOnline).length}
          </Text>
        </View>
        <TouchableOpacity style={styles.row} onPress={() => loadMiners()}>
          <Text style={styles.rowLabel}>Refresh All</Text>
          <Text style={styles.actionText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          onPress={scanNetwork}
          disabled={scanning}
        >
          <Text style={styles.rowLabel}>Scan Network</Text>
          <Text style={styles.actionText}>
            {scanning ? 'Scanning...' : 'Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Made for</Text>
          <Text style={styles.rowValue}>BitAxe Miners</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 10,
    marginBottom: 2,
  },
  rowLabel: {
    color: '#F9FAFB',
    fontSize: 15,
  },
  rowValue: {
    color: '#6B7280',
    fontSize: 15,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: {
    color: '#6B7280',
    fontSize: 20,
  },
  actionText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '500',
  },
});
