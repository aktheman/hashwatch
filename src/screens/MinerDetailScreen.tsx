import { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { useMinerStore } from '../store/miners';
import { useToastStore } from '../store/toast';
import { MinerSnapshot, Wallet, NavigationProp } from '../types';
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
import { useTranslation } from 'react-i18next';

interface MinerDetailScreenProps {
  route: { params: { minerId: string } };
  navigation: NavigationProp;
}

export function MinerDetailScreen({ route, navigation }: MinerDetailScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation();
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
          boxShadow: `0 4px 20px ${theme.glow}`,
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
          color: theme.textDim,
          fontSize: 14,
          fontFamily: 'monospace',
        },
        hostname: {
          color: theme.textMuted,
          fontSize: 12,
          marginTop: 2,
        },
        walletRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.surface,
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: theme.border,
        },
        walletRowLeft: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        walletRowIcon: {
          fontSize: 14,
          marginRight: 8,
        },
        walletRowText: {
          color: theme.text,
          fontSize: 14,
          fontWeight: '600',
        },
        walletRowArrow: {
          color: theme.textMuted,
          fontSize: 12,
        },
        walletPicker: {
          backgroundColor: theme.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          marginTop: 6,
          overflow: 'hidden',
        },
        walletOption: {
          padding: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        walletOptionRow: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        walletDot: {
          width: 10,
          height: 10,
          borderRadius: 5,
          marginRight: 8,
        },
        walletName: {
          color: theme.text,
          fontSize: 14,
          fontWeight: '500',
        },
        groupTagRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        groupTagIcon: {
          fontSize: 14,
        },
        groupTagInput: {
          flex: 1,
          backgroundColor: theme.surface,
          borderRadius: 14,
          padding: 14,
          color: theme.text,
          fontSize: 14,
          fontWeight: '500',
          borderWidth: 1,
          borderColor: theme.border,
        },
        actionBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 14,
          borderRadius: 12,
          borderWidth: 1,
          gap: 8,
        },
        actionBtnIcon: {
          fontSize: 16,
        },
        actionBtnText: {
          fontWeight: '700',
          fontSize: 15,
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
          backgroundColor: theme.danger + '1A',
          padding: 14,
          borderRadius: 12,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.danger + '4D',
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
  const groupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        <Text style={styles.offlineText}>{t('minerDetail.notFound')}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.retryBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryBtnText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!miner.status) {
    return (
      <View style={styles.center}>
        <Text style={styles.offlineIcon}>📡</Text>
        <Text style={styles.offlineText}>{t('minerDetail.offline')}</Text>
        <Text style={styles.offlineSubtext}>{t('minerDetail.offlineBody', { ip: miner.ip })}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retry"
          style={styles.retryBtn}
          onPress={() => refreshMiner(minerId)}
        >
          <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
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

  const handleDelete = () => {
    navigation.goBack();
    useToastStore.getState().showUndo({
      id: `delete-${minerId}`,
      message: t('minerDetail.minerRemoved', { name: miner.name }),
      onUndo: () => {},
      onConfirm: () => removeMiner(minerId),
    });
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
                backgroundColor: miner.isOnline ? theme.success + '26' : theme.danger + '26',
              },
            ]}
          >
            <Text
              style={[styles.badgeText, { color: miner.isOnline ? theme.success : theme.danger }]}
            >
              {miner.isOnline ? t('minerDetail.live') : t('minerDetail.offlineBadge')}
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
          accessibilityRole="button"
          accessibilityLabel="Assign wallet"
          style={styles.walletRow}
          onPress={() => setShowWalletPicker(!showWalletPicker)}
        >
          <View style={styles.walletRowLeft}>
            <Text style={styles.walletRowIcon}>💼</Text>
            <Text style={styles.walletRowText}>
              {miner.walletId
                ? wallets.find((w) => w.id === miner.walletId)?.name ||
                  t('minerDetail.unknownWallet')
                : t('minerDetail.noWallet')}
            </Text>
          </View>
          <Text style={styles.walletRowArrow}>{t('minerDetail.assign')}</Text>
        </TouchableOpacity>
        {showWalletPicker && (
          <View style={styles.walletPicker}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="No wallet"
              style={[
                styles.walletOption,
                { backgroundColor: !miner.walletId ? theme.primary + '20' : 'transparent' },
              ]}
              onPress={() => {
                setMinerWallet(minerId, undefined);
                setShowWalletPicker(false);
              }}
            >
              <Text style={styles.walletName}>{t('common.none')}</Text>
            </TouchableOpacity>
            {wallets.map((w) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={w.id}
                accessibilityLabel={`Select wallet: ${w.name}`}
                style={[
                  styles.walletOptionRow,
                  {
                    backgroundColor: miner.walletId === w.id ? theme.primary + '20' : 'transparent',
                  },
                ]}
                onPress={() => {
                  setMinerWallet(minerId, w.id);
                  setShowWalletPicker(false);
                }}
              >
                <View style={[styles.walletDot, { backgroundColor: w.color }]} />
                <Text style={styles.walletName}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.section, styles.groupTagRow]}>
        <Text style={styles.groupTagIcon}>📁</Text>
        <TextInput
          style={styles.groupTagInput}
          value={miner.group || ''}
          onChangeText={(text) => {
            if (groupDebounceRef.current) clearTimeout(groupDebounceRef.current);
            groupDebounceRef.current = setTimeout(() => {
              const updated = { ...miner, group: text || undefined };
              DB.saveMiner(updated);
              useMinerStore.getState().setMinerGroup(minerId, text || undefined);
            }, 500);
          }}
          placeholder={t('minerDetail.groupPlaceholder')}
          placeholderTextColor={theme.textMuted}
          accessibilityLabel="Group tag input"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>⚡</Text> {t('minerDetail.mining')}
        </Text>
        <View style={styles.statsGrid}>
          <StatWidget
            icon="⚡"
            label={t('minerDetail.hashrate')}
            value={formatHashrate(s.hashRate, s.hashRateUnit)}
            color={theme.primary}
          />
          <StatWidget
            icon="〰"
            label={t('minerDetail.frequency')}
            value={`${s.frequency} MHz`}
            color={theme.info}
          />
          <StatWidget
            icon="🎯"
            label={t('minerDetail.bestDiff')}
            value={formatDifficulty(s.bestDiff)}
            color={theme.warning}
          />
          <StatWidget
            icon="🏆"
            label={t('minerDetail.bestSession')}
            value={formatDifficulty(s.bestSessionDiff)}
            color={theme.warning}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>🔧</Text> {t('minerDetail.hardware')}
        </Text>
        <View style={styles.statsGrid}>
          <StatWidget
            icon="🌡"
            label={t('minerDetail.boardTemp')}
            value={formatTemperature(s.temperature)}
            color={s.temperature > 70 ? theme.danger : theme.success}
          />
          {s.vrTemp > 0 && (
            <StatWidget
              icon="🔌"
              label={t('minerDetail.vrTemp')}
              value={formatTemperature(s.vrTemp)}
              color={theme.warningLight}
            />
          )}
          <StatWidget
            icon="⚡"
            label={t('minerDetail.voltage')}
            value={formatVoltage(s.voltage)}
            color={theme.primary}
          />
          <StatWidget
            icon="🔀"
            label={t('minerDetail.current')}
            value={`${s.current} mA`}
            color={theme.accent}
          />
          <StatWidget
            icon="🔋"
            label={t('minerDetail.power')}
            value={formatPower(s.power)}
            color={theme.warning}
          />
          <StatWidget
            icon="📊"
            label={t('minerDetail.efficiency')}
            value={formatWTHs(s.power, s.hashRate, s.hashRateUnit)}
            color={theme.successLight}
          />
          <StatWidget
            icon="🔬"
            label={t('minerDetail.coreV')}
            value={`${s.coreVoltage} mV`}
            color={theme.primaryLight}
          />
          <StatWidget
            icon="🌀"
            label={t('minerDetail.fan')}
            value={s.fanRpm > 0 ? `${s.fanRpm} RPM (${s.fanSpeed}%)` : `${s.fanSpeed}%`}
            color={theme.info}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>📦</Text> {t('minerDetail.shares')}
        </Text>
        <View style={styles.statsGrid}>
          <StatWidget
            icon="✓"
            label={t('minerDetail.accepted')}
            value={formatNumber(s.sharesAccepted)}
            color={theme.success}
          />
          <StatWidget
            icon="✗"
            label={t('minerDetail.rejected')}
            value={formatNumber(s.sharesRejected)}
            color={theme.danger}
          />
          <StatWidget
            icon="⏱"
            label={t('minerDetail.uptime')}
            value={formatUptime(s.uptimeSeconds)}
            color={theme.primary}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>🌊</Text> {t('minerDetail.pool')}
        </Text>
        <View style={styles.poolCard}>
          <View style={styles.poolRow}>
            <Text style={styles.poolLabel}>{t('minerDetail.url')}</Text>
            <Text style={styles.poolValue}>
              {s.pool && s.poolPort ? `${s.pool}:${s.poolPort}` : s.pool || t('common.na')}
            </Text>
          </View>
          <View style={styles.poolDivider} />
          <View style={styles.poolRow}>
            <Text style={styles.poolLabel}>{t('minerDetail.user')}</Text>
            <Text style={styles.poolValue} selectable>
              {s.poolUser || t('common.na')}
            </Text>
          </View>
          <View style={styles.poolDivider} />
          <View style={styles.poolRow}>
            <Text style={styles.poolLabel}>{t('minerDetail.responseTime')}</Text>
            <Text style={styles.poolValue}>
              {s.poolResponseTime > 0 ? `${s.poolResponseTime.toFixed(0)} ms` : t('common.na')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>📈</Text> {t('minerDetail.hashrateHistory')}
        </Text>
        <SubscriptionGate feature="30-day charts">
          <HashrateChart snapshots={snapshots} />
        </SubscriptionGate>
      </View>

      {snapshots.length > 1 && (
        <View style={[styles.section, { paddingTop: 0 }]}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.sectionIcon}>📊</Text> {t('minerDetail.efficiencyTrend')}
          </Text>
          <SubscriptionGate feature="30-day charts">
            <EfficiencyTrend snapshots={snapshots} />
          </SubscriptionGate>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Share Stats"
          style={[
            styles.actionBtn,
            { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' },
          ]}
          onPress={handleShare}
        >
          <Text style={styles.actionBtnIcon}>📤</Text>
          <Text style={[styles.actionBtnText, { color: theme.primary }]}>
            {t('minerDetail.shareStats')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.warning }]}>
          <Text style={styles.sectionIcon}>⚡</Text> {t('minerDetail.actions')}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Restart Miner"
          style={[
            styles.actionBtn,
            {
              backgroundColor: theme.warning + '15',
              borderColor: theme.warning + '30',
              marginBottom: 12,
            },
          ]}
          onPress={async () => {
            const client = new BitAxeClient(
              miner.ip,
              miner.port,
              miner.apiPath ?? undefined,
              miner.statusPath ?? undefined,
            );
            const ok = await client.restart();
            Alert.alert(
              ok ? t('minerDetail.restartSent') : t('minerDetail.restartFailed'),
              ok ? t('minerDetail.restartSentBody') : t('minerDetail.restartFailedBody'),
            );
          }}
        >
          <Text style={styles.actionBtnIcon}>🔄</Text>
          <Text style={[styles.actionBtnText, { color: theme.warning }]}>
            {t('minerDetail.restartMiner')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.sectionTitle, { color: theme.danger }]}>
          <Text style={styles.sectionIcon}>⚠</Text> {t('minerDetail.dangerZone')}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Remove Miner"
          style={styles.deleteBtn}
          onPress={() => setShowConfirm(!showConfirm)}
        >
          <Text style={styles.deleteBtnText}>{t('minerDetail.removeMiner')}</Text>
        </TouchableOpacity>
        {showConfirm && (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>
              {t('minerDetail.removeConfirm', { name: miner.name })}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Yes, Remove"
              style={styles.confirmBtn}
              onPress={handleDelete}
            >
              <Text style={styles.confirmBtnText}>{t('minerDetail.yesRemove')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
