import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Miner } from '../types';
import { formatHashrate, formatTemperature, formatUptime } from '../utils/formatters';
import { theme } from '../theme';

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
      style={[styles.card, !isOnline && styles.cardOffline]}
      onPress={() => onPress(miner)}
      onLongPress={handleLongPress}
      delayLongPress={600}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.nameRow}>
          <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={styles.name} numberOfLines={1}>{miner.name}</Text>
        </View>
        <View style={[styles.statusBadge, isOnline ? styles.statusOnline : styles.statusOffline]}>
          <Text style={[styles.statusText, isOnline ? styles.statusTextOnline : styles.statusTextOffline]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      <Text style={styles.ip}>{miner.ip}</Text>

      <View style={styles.divider} />

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Hashrate</Text>
          <Text style={[styles.statValue, { color: theme.primary }]}>{hashrate}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Temp</Text>
          <Text style={[styles.statValue, { color: temp.includes('70') || temp.includes('80') || temp.includes('90') ? theme.danger : theme.success }]}>{temp}</Text>
        </View>
        {status && status.fanSpeed > 0 && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Fan</Text>
              <Text style={[styles.statValue, { color: theme.accent }]}>{status.fanSpeed}%</Text>
            </View>
          </>
        )}
      </View>

      {status && (
        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Text style={styles.footerIcon}>⏱</Text>
            <Text style={styles.footerText}>{formatUptime(status.uptimeSeconds)}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerIcon}>✓</Text>
            <Text style={styles.footerText}>{status.sharesAccepted}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerIcon}>✗</Text>
            <Text style={styles.footerText}>{status.sharesRejected}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: theme.border,
    boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
  },
  cardOffline: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotOnline: {
    backgroundColor: theme.success,
    boxShadow: `0 0 6px ${theme.success}`,
  },
  dotOffline: {
    backgroundColor: theme.danger,
  },
  name: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextOnline: {
    color: theme.success,
  },
  statusTextOffline: {
    color: theme.danger,
  },
  ip: {
    color: theme.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginBottom: 10,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.border,
    marginHorizontal: 8,
  },
  statLabel: {
    color: theme.textDim,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerIcon: {
    fontSize: 11,
    color: theme.textMuted,
  },
  footerText: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '500',
  },
});
