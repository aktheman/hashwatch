import { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { useMinerStore } from '../store/miners';
import { MinerSnapshot, Wallet } from '../types';
import * as DB from '../db/database';
import { StatWidget } from '../components/StatWidget';
import { BitAxeClient } from '../api/bitaxe';
import { HashrateChart } from '../components/HashrateChart';
import { EfficiencyTrend } from '../components/EfficiencyTrend';
import { SubscriptionGate } from '../components/SubscriptionGate';
import { FirmwareBanner } from '../components/FirmwareBanner';
import { NotificationPrefs } from '../components/NotificationPrefs';
import {
  formatHashrate,
  formatTemperature,
  formatVoltage,
  formatPower,
  formatUptime,
  formatNumber,
  formatWTHs,
  formatDifficulty,
} from '../utils/formatters';
import { useTheme } from '../theme';

interface MinerDetailScreenProps {
  route: { params: { minerId: string } };
  navigation: any;
}

export function MinerDetailScreen({ route, navigation }: MinerDetailScreenProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          borderRadius: 20,
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        },
        headerTop: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        },
        nameRow: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        dot: {
          width: 12,
          height: 12,
          borderRadius: 6,
          marginRight: 10,
        },
        name: {
          color: theme.text,
          fontSize: 22,
          fontWeight: '800',
          letterSpacing: -0.3,
        },
        badge: {
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 8,
        },
        badgeText: {
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.8,
        },
        ip: {
          color: theme.textMuted,
          fontSize: 12,
          fontFamily: 'monospace',
          marginTop: 4,
          marginLeft: 22,
        },
        hostname: {
          color: theme.textDim,
          fontSize: 12,
          marginTop: 2,
          marginLeft: 22,
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
      }),
    [theme],
  );
  const { minerId } = route.params;
  const miners = useMinerStore((s) => s.miners);
  const refreshMiner = useMinerStore((s) => s.refreshMiner);
  const removeMiner = useMinerStore((s) => s.removeMiner);
  const getSnapshots = useMinerStore((s) => s.getSnapshots);
  const setMinerWallet = useMinerStore((s) => s.setMinerWallet);
  const [snapshots, setSnapshots] = useState<MinerSnapshot[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  useEffect(() => {
    DB.loadWallets().then(setWallets);
  }, []);

  const miner = miners.find((m) => m.id === minerId);

  useEffect(() => {
    if (minerId) {
      getSnapshots(minerId, 50).then(setSnapshots);
    }
  }, [minerId, miner?.lastSeen]);

  if (!miner) {
    return (
      <View style={styles.center}>
        <Text style={styles.offlineIcon}>⬡</Text>
        <Text style={styles.offlineText}>Miner Not Found</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
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
        <TouchableOpacity style={styles.retryBtn} onPress={() => refreshMiner(minerId)}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const s = miner.status;

  const handleShare = async () => {
    const wallet = miner.walletId ? wallets.find((w) => w.id === miner.walletId) : null;
    const msg = [
      `⬡ ${miner.name}`,
      `Hashrate: ${formatHashrate(s.hashRate, s.hashRateUnit)}`,
      `Temp: ${formatTemperature(s.temperature)}`,
      `Power: ${formatPower(s.power)}`,
      `Uptime: ${formatUptime(s.uptimeSeconds)}`,
      `Pool: ${s.pool}${s.poolPort ? `:${s.poolPort}` : ''}`,
      `Efficiency: ${formatWTHs(s.power, s.hashRate, s.hashRateUnit)}`,
      wallet ? `Wallet: ${wallet.name}` : '',
      `IP: ${miner.ip}`,
      '',
      `Shared via HashWatch`,
    ]
      .filter(Boolean)
      .join('\n');
    await Share.share({ message: msg }).catch(() => {});
  };

  const handleDelete = async () => {
    await removeMiner(minerId);
    navigation.goBack();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.nameRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: miner.isOnline ? theme.success : theme.danger },
              ]}
            />
            <Text style={styles.name}>{miner.name}</Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: miner.isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              },
            ]}
          >
            <Text
              style={[styles.badgeText, { color: miner.isOnline ? theme.success : theme.danger }]}
            >
              {miner.isOnline ? 'LIVE' : 'OFFLINE'}
            </Text>
          </View>
        </View>
        <Text style={styles.ip}>{miner.ip}</Text>
        {miner.info?.hostname && <Text style={styles.hostname}>{miner.info.hostname}</Text>}
        {miner.info?.version && <FirmwareBanner rawVersion={miner.info.version} />}
      </View>

      <NotificationPrefs minerId={miner.id} />

      <View style={styles.section}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.surface,
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={() => setShowWalletPicker(!showWalletPicker)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, marginRight: 8 }}>💼</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
              {miner.walletId
                ? wallets.find((w) => w.id === miner.walletId)?.name || 'Unknown Wallet'
                : 'No Wallet'}
            </Text>
          </View>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>Assign ›</Text>
        </TouchableOpacity>
        {showWalletPicker && (
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              marginTop: 6,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              style={{
                padding: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                backgroundColor: !miner.walletId ? theme.primary + '20' : 'transparent',
              }}
              onPress={() => {
                setMinerWallet(minerId, undefined);
                setShowWalletPicker(false);
              }}
            >
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>None</Text>
            </TouchableOpacity>
            {wallets.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={{
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: miner.walletId === w.id ? theme.primary + '20' : 'transparent',
                }}
                onPress={() => {
                  setMinerWallet(minerId, w.id);
                  setShowWalletPicker(false);
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: w.color,
                    marginRight: 8,
                  }}
                />
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.section, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
        <Text style={{ fontSize: 14 }}>📁</Text>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: theme.surface,
            borderRadius: 14,
            padding: 14,
            color: theme.text,
            fontSize: 14,
            fontWeight: '500',
            borderWidth: 1,
            borderColor: theme.border,
          }}
          value={miner.group || ''}
          onChangeText={(t) => {
            const updated = { ...miner, group: t || undefined };
            DB.saveMiner(updated);
            useMinerStore.getState().loadMiners();
          }}
          placeholder="Group tag (e.g. Garage)"
          placeholderTextColor={theme.textMuted}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>⚡</Text> Mining
        </Text>
        <View style={styles.statsGrid}>
          <StatWidget
            icon="⚡"
            label="Hashrate"
            value={formatHashrate(s.hashRate, s.hashRateUnit)}
            color={theme.primary}
          />
          <StatWidget icon="〰" label="Frequency" value={`${s.frequency} MHz`} color="#8B5CF6" />
          <StatWidget
            icon="🎯"
            label="Best Diff"
            value={formatDifficulty(s.bestDiff)}
            color={theme.warning}
          />
          <StatWidget
            icon="🏆"
            label="Best Session"
            value={formatDifficulty(s.bestSessionDiff)}
            color={theme.warning}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>🔧</Text> Hardware
        </Text>
        <View style={styles.statsGrid}>
          <StatWidget
            icon="🌡"
            label="Board Temp"
            value={formatTemperature(s.temperature)}
            color={s.temperature > 70 ? theme.danger : theme.success}
          />
          {s.vrTemp > 0 && (
            <StatWidget
              icon="🔌"
              label="VR Temp"
              value={formatTemperature(s.vrTemp)}
              color="#F97316"
            />
          )}
          <StatWidget
            icon="⚡"
            label="Voltage"
            value={formatVoltage(s.voltage)}
            color={theme.primary}
          />
          <StatWidget icon="🔀" label="Current" value={`${s.current} mA`} color="#EC4899" />
          <StatWidget icon="🔋" label="Power" value={formatPower(s.power)} color={theme.warning} />
          <StatWidget
            icon="📊"
            label="Efficiency"
            value={formatWTHs(s.power, s.hashRate, s.hashRateUnit)}
            color="#10B981"
          />
          <StatWidget icon="🔬" label="Core V" value={`${s.coreVoltage} mV`} color="#8B5CF6" />
          <StatWidget
            icon="🌀"
            label="Fan"
            value={s.fanRpm > 0 ? `${s.fanRpm} RPM (${s.fanSpeed}%)` : `${s.fanSpeed}%`}
            color="#06B6D4"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>📦</Text> Shares
        </Text>
        <View style={styles.statsGrid}>
          <StatWidget
            icon="✓"
            label="Accepted"
            value={formatNumber(s.sharesAccepted)}
            color={theme.success}
          />
          <StatWidget
            icon="✗"
            label="Rejected"
            value={formatNumber(s.sharesRejected)}
            color={theme.danger}
          />
          <StatWidget
            icon="⏱"
            label="Uptime"
            value={formatUptime(s.uptimeSeconds)}
            color={theme.primary}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>🌊</Text> Pool
        </Text>
        <View style={styles.poolCard}>
          <View style={styles.poolRow}>
            <Text style={styles.poolLabel}>URL</Text>
            <Text style={styles.poolValue}>
              {s.pool && s.poolPort ? `${s.pool}:${s.poolPort}` : s.pool || 'N/A'}
            </Text>
          </View>
          <View style={styles.poolDivider} />
          <View style={styles.poolRow}>
            <Text style={styles.poolLabel}>User</Text>
            <Text style={styles.poolValue} selectable>
              {s.poolUser || 'N/A'}
            </Text>
          </View>
          <View style={styles.poolDivider} />
          <View style={styles.poolRow}>
            <Text style={styles.poolLabel}>Response Time</Text>
            <Text style={styles.poolValue}>
              {s.poolResponseTime > 0 ? `${s.poolResponseTime.toFixed(0)} ms` : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>📈</Text> Hashrate History
        </Text>
        <SubscriptionGate feature="30-day charts">
          <HashrateChart snapshots={snapshots} />
        </SubscriptionGate>
      </View>

      {snapshots.length > 1 && (
        <View style={[styles.section, { paddingTop: 0 }]}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.sectionIcon}>📊</Text> Efficiency Trend
          </Text>
          <SubscriptionGate feature="30-day charts">
            <EfficiencyTrend snapshots={snapshots} />
          </SubscriptionGate>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.primary + '15',
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.primary + '30',
            gap: 8,
          }}
          onPress={handleShare}
        >
          <Text style={{ fontSize: 16 }}>📤</Text>
          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 15 }}>Share Stats</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.warning }]}>
          <Text style={styles.sectionIcon}>⚡</Text> Actions
        </Text>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.warning + '15',
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.warning + '30',
            gap: 8,
            marginBottom: 12,
          }}
          onPress={async () => {
            const client = new BitAxeClient(miner.ip, miner.port, miner.apiPath ?? undefined, miner.statusPath ?? undefined);
            const ok = await client.restart();
            Alert.alert(ok ? 'Restart Sent' : 'Restart Failed', ok ? 'Miner should reboot shortly.' : 'Could not restart this miner.');
          }}
        >
          <Text style={{ fontSize: 16 }}>🔄</Text>
          <Text style={{ color: theme.warning, fontWeight: '700', fontSize: 15 }}>Restart Miner</Text>
        </TouchableOpacity>
        <Text style={[styles.sectionTitle, { color: theme.danger }]}>
          <Text style={styles.sectionIcon}>⚠</Text> Danger Zone
        </Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowConfirm(!showConfirm)}>
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
