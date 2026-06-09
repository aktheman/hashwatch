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

  if (!miner || !miner.status) {
    return (
      <View style={styles.center}>
        <Text style={styles.offlineText}>Miner Offline</Text>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: miner.isOnline ? '#22C55E' : '#EF4444' },
            ]}
          />
          <Text style={styles.name}>{miner.name}</Text>
        </View>
        <Text style={styles.ip}>{miner.ip}</Text>
        {miner.info?.hostname && (
          <Text style={styles.hostname}>{miner.info.hostname}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mining</Text>
        <View style={styles.statsGrid}>
          <StatWidget
            label="Hashrate"
            value={formatHashrate(s.hashRate, s.hashRateUnit)}
            color="#3B82F6"
          />
          <StatWidget label="Frequency" value={`${s.frequency} MHz`} color="#8B5CF6" />
          <StatWidget label="Best Diff" value={s.bestDiff} color="#F59E0B" />
          <StatWidget label="Best Session" value={s.bestSessionDiff} color="#F59E0B" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hardware</Text>
        <View style={styles.statsGrid}>
          <StatWidget
            label="Temperature"
            value={formatTemperature(s.temperature)}
            color={s.temperature > 70 ? '#EF4444' : '#22C55E'}
          />
          <StatWidget label="Voltage" value={formatVoltage(s.voltage)} color="#3B82F6" />
          <StatWidget label="Current" value={`${s.current} mA`} color="#EC4899" />
          <StatWidget label="Power" value={formatPower(s.power)} color="#F59E0B" />
          <StatWidget label="Core Voltage" value={`${s.coreVoltage} mV`} color="#8B5CF6" />
          <StatWidget label="Fan Speed" value={`${s.fanSpeed}%`} color="#06B6D4" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shares</Text>
        <View style={styles.statsGrid}>
          <StatWidget
            label="Accepted"
            value={formatNumber(s.sharesAccepted)}
            color="#22C55E"
          />
          <StatWidget
            label="Rejected"
            value={formatNumber(s.sharesRejected)}
            color="#EF4444"
          />
          <StatWidget label="Uptime" value={formatUptime(s.uptimeSeconds)} color="#3B82F6" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pool</Text>
        <View style={styles.poolInfo}>
          <Text style={styles.poolLabel}>URL</Text>
          <Text style={styles.poolValue}>{s.pool || 'N/A'}</Text>
          <Text style={styles.poolLabel}>User</Text>
          <Text style={styles.poolValue} selectable>
            {s.poolUser || 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hashrate History</Text>
        <HashrateChart snapshots={snapshots} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => setShowConfirm(!showConfirm)}
        >
          <Text style={styles.deleteBtnText}>Remove Miner</Text>
        </TouchableOpacity>
        {showConfirm && (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>
              Are you sure? This deletes all history for this miner.
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
    backgroundColor: '#0F172A',
  },
  content: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
  header: {
    padding: 16,
    backgroundColor: '#1F2937',
    margin: 16,
    borderRadius: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  name: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: '700',
  },
  ip: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  hostname: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  poolInfo: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
  },
  poolLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  poolValue: {
    color: '#F9FAFB',
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  deleteBtn: {
    backgroundColor: '#7F1D1D',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#FCA5A5',
    fontWeight: '600',
  },
  confirmBox: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  confirmText: {
    color: '#FCA5A5',
    fontSize: 13,
    marginBottom: 10,
  },
  confirmBtn: {
    backgroundColor: '#DC2626',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
});
