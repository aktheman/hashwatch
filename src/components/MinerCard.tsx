import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Miner } from '../types';
import { formatHashrate, formatTemperature, formatUptime } from '../utils/formatters';

interface MinerCardProps {
  miner: Miner;
  onPress: (miner: Miner) => void;
  onDelete?: (miner: Miner) => void;
}

export function MinerCard({ miner, onPress, onDelete }: MinerCardProps) {
  const { status, isOnline } = miner;
  const hashrate = status
    ? formatHashrate(status.hashRate, status.hashRateUnit)
    : '---';
  const temp = status ? formatTemperature(status.temperature) : '---';

  const handleLongPress = () => {
    if (!onDelete) return;
    Alert.alert(
      'Remove Miner',
      `Remove ${miner.name}? All history will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onDelete(miner),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(miner)}
      onLongPress={handleLongPress}
      delayLongPress={600}
    >
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <View style={[styles.dot, { backgroundColor: isOnline ? '#22C55E' : '#EF4444' }]} />
          <Text style={styles.name} numberOfLines={1}>{miner.name}</Text>
        </View>
        <Text style={styles.ip}>{miner.ip}</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Hashrate</Text>
          <Text style={styles.statValue}>{hashrate}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Temp</Text>
          <Text style={styles.statValue}>{temp}</Text>
        </View>
        {status && status.fanSpeed > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Fan</Text>
            <Text style={styles.statValue}>{status.fanSpeed}%</Text>
          </View>
        )}
      </View>

      {status && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Uptime: {formatUptime(status.uptimeSeconds)}
          </Text>
          <Text style={styles.footerText}>
            A: {status.sharesAccepted} R: {status.sharesRejected}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  name: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  ip: {
    color: '#6B7280',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerText: {
    color: '#6B7280',
    fontSize: 11,
  },
});
