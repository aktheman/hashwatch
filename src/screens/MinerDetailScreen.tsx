import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useMinerStore } from '../store/miners';
import { Miner, MinerSnapshot } from '../types';
import { StatWidget } from '../components/StatWidget';
import { HashrateChart } from '../components/HashrateChart';
import {
  formatHashrate,
  formatTemperature,
  formatVoltage,
  formatPower,
  formatUptime,
  formatNumber,
} from '../utils/formatters';
import { theme } from '../theme';

interface MinerDetailScreenProps {
  route: { params: { minerId: string } };
  navigation: any;
}

export function MinerDetailScreen({ route, navigation }: MinerDetailScreenProps) {
  const { minerId } = route.params;
  const miners = useMinerStore((s) => s.miners);
  const refreshMiner = useMinerStore((s) => s.refreshMiner);
  const removeMiner = useMinerStore((s) => s.removeMiner);
  const getSnapshots = useMinerStore((s) => s.getSnapshots);
  const [snapshots, setSnapshots] = useState<MinerSnapshot[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const miner = miners.find((m) => m.id === minerId);

  useEffect(() => {
    if (minerId) {
      getSnapshots(minerId, 50).then(setSnapshots);
      const interval = setInterval(() => {
        refreshMiner(minerId);
        getSnapshots(minerId, 50).then(setSnapshots);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [minerId]);

  if (!miner) {
    return (
      <View style={styles.center}>
        <Text style={styles.offlineIcon}>⬡</Text>
        <Text style={styles.offlineText}>Miner Not Found</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!miner.status) {
    return (
      <View style={styles.center}>
        <Text style={styles.offlineIcon}>📡</Text>
        <Text style={styles.offlineText}>Miner Offline</Text>
        <Text style={styles.offlineSubtext}>Unable to reach {miner.ip}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => refreshMiner(minerId)}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const s = miner.status;

  const handleDelete = async () => {
    await removeMiner(minerId);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.nameRow}>
            <View style={[styles.dot, { backgroundColor: miner.isOnline ? theme.success : theme.danger }]} />
            <Text style={styles.name}>{miner.name}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: miner.isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
            <Text style={[styles.badgeText, { color: miner.isOnline ? theme.success : theme.danger }]}>
              {miner.isOnline ? 'LIVE' : 'OFFLINE'}
            </Text>
          </View>
        </View>
        <Text style={styles.ip}>{miner.ip}</Text>
        {miner.info?.hostname && (
          <Text style={styles.hostname}>{miner.info.hostname}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>⚡</Text> Mining
        </Text>
        <View style={styles.statsGrid}>
          <StatWidget
            label="Hashrate"
            value={formatHashrate(s.hashRate, s.hashRateUnit)}
            color={theme.primary}
          />
          <StatWidget label="Frequency" value={`${s.frequency} MHz`} color="#8B5CF6" />
          <StatWidget label="Best Diff" value={s.bestDiff} color={theme.warning} />
          <StatWidget label="Best Session" value={s.bestSessionDiff} color={theme.warning} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>🔧</Text> Hardware
        </Text>
        <View style={styles.statsGrid}>
          <StatWidget
            label="Temperature"
            value={formatTemperature(s.temperature)}
            color={s.temperature > 70 ? theme.danger : theme.success}
          />
          <StatWidget label="Voltage" value={formatVoltage(s.voltage)} color={theme.primary} />
          <StatWidget label="Current" value={`${s.current} mA`} color="#EC4899" />
          <StatWidget label="Power" value={formatPower(s.power)} color={theme.warning} />
          <StatWidget label="Core Voltage" value={`${s.coreVoltage} mV`} color="#8B5CF6" />
          <StatWidget label="Fan Speed" value={`${s.fanSpeed}%`} color="#06B6D4" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>📦</Text> Shares
        </Text>
        <View style={styles.statsGrid}>
          <StatWidget
            label="Accepted"
            value={formatNumber(s.sharesAccepted)}
            color={theme.success}
          />
          <StatWidget
            label="Rejected"
            value={formatNumber(s.sharesRejected)}
            color={theme.danger}
          />
          <StatWidget label="Uptime" value={formatUptime(s.uptimeSeconds)} color={theme.primary} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>🌊</Text> Pool
        </Text>
        <View style={styles.poolCard}>
          <View style={styles.poolRow}>
            <Text style={styles.poolLabel}>URL</Text>
            <Text style={styles.poolValue}>{s.pool || 'N/A'}</Text>
          </View>
          <View style={styles.poolDivider} />
          <View style={styles.poolRow}>
            <Text style={styles.poolLabel}>User</Text>
            <Text style={styles.poolValue} selectable>{s.poolUser || 'N/A'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>📈</Text> Hashrate History
        </Text>
        <HashrateChart snapshots={snapshots} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.danger }]}>
          <Text style={styles.sectionIcon}>⚠</Text> Danger Zone
        </Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => setShowConfirm(!showConfirm)}
        >
          <Text style={styles.deleteBtnText}>Remove Miner</Text>
        </TouchableOpacity>
        {showConfirm && (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>
              This permanently deletes {miner.name} and all its history.
            </Text>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleDelete}>
              <Text style={styles.confirmBtnText}>Yes, Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  offlineIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: theme.textMuted,
  },
  offlineText: {
    color: theme.danger,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  offlineSubtext: {
    color: theme.textDim,
    fontSize: 14,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
  header: {
    padding: 16,
    backgroundColor: theme.surface,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  headerTop: {
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
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  name: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ip: {
    color: theme.textMuted,
    fontSize: 13,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  hostname: {
    color: theme.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  poolCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  poolRow: {
    paddingVertical: 4,
  },
  poolDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 6,
  },
  poolLabel: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  poolValue: {
    color: theme.text,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteBtnText: {
    color: theme.danger,
    fontWeight: '700',
    fontSize: 15,
  },
  confirmBox: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  confirmText: {
    color: theme.textDim,
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  confirmBtn: {
    backgroundColor: theme.danger,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
