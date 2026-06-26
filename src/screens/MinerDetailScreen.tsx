import { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
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
import { MinerSnapshotCard } from '../components/MinerSnapshotCard';
import { getAlertRules, setAlertRules, AlertRule } from '../services/notifications';
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
  const setMinerIp = useMinerStore((s) => s.setMinerIp);
  const setMinerIcon = useMinerStore((s) => s.setMinerIcon);
  const setMinerLocation = useMinerStore((s) => s.setMinerLocation);
  const setMinerTags = useMinerStore((s) => s.setMinerTags);
  const setMinerNotes = useMinerStore((s) => s.setMinerNotes);
  const [snapshots, setSnapshots] = useState<MinerSnapshot[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [editingIP, setEditingIP] = useState(false);
  const [editIPValue, setEditIPValue] = useState('');
  const [alertRules, setAlertRulesState] = useState<AlertRule | null>(null);
  const groupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagInputRef = useRef<TextInput>(null);

  useEffect(() => {
    let cancelled = false;
    DB.loadWallets().then((w) => {
      if (cancelled) return;
      setWallets(w);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    getAlertRules(minerId).then(setAlertRulesState);
  }, [minerId]);

  const miner = miners.find((m) => m.id === minerId);

  useEffect(() => {
    let cancelled = false;
    if (minerId) {
      getSnapshots(minerId, 50).then((s) => {
        if (cancelled) return;
        setSnapshots(s);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [minerId, miner?.lastSeen]);

  if (!miner) {
    return (
      <View style={styles.center}>
        <Text style={styles.offlineIcon}>⬡</Text>
        <Text style={styles.offlineText}>{t('minerDetail.notFound')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.retryBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryBtnText}>{t('common.goBack')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!miner.status) {
    return (
      <View style={styles.center}>
        <Text style={styles.offlineIcon}>📡</Text>
        <Text style={styles.offlineText}>{t('minerDetail.offline')}</Text>
        <Text style={styles.offlineSubtext}>{t('minerDetail.offlineBody', { ip: miner.ip })}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          style={styles.retryBtn}
          onPress={() => refreshMiner(minerId)}
        >
          <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
        </Pressable>
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
    await Share.share({ message: msg }).catch((e) => console.warn('Share failed:', e));
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose icon"
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            >
              <Text style={{ fontSize: 22, marginRight: 4 }}>{miner.icon || '⬡'}</Text>
              <Text style={styles.name}>{miner.name}</Text>
              <Text style={{ fontSize: 10, color: theme.primary, marginLeft: 2 }}>✎</Text>
            </Pressable>
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
        {editingIP ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[
                styles.ip,
                { flex: 1, borderBottomWidth: 1, borderBottomColor: theme.primary },
              ]}
              value={editIPValue}
              onChangeText={setEditIPValue}
              autoFocus
              onSubmitEditing={() => {
                if (editIPValue.trim()) {
                  setMinerIp(minerId, editIPValue.trim());
                }
                setEditingIP(false);
              }}
              returnKeyType="done"
              accessibilityLabel="Edit IP address"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save IP"
              onPress={() => {
                if (editIPValue.trim()) {
                  setMinerIp(minerId, editIPValue.trim());
                }
                setEditingIP(false);
              }}
            >
              <Text style={{ fontSize: 16, color: theme.success, marginLeft: 8 }}>✓</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit IP address"
            onPress={() => {
              setEditIPValue(miner.ip);
              setEditingIP(true);
            }}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={styles.ip}>{miner.ip}</Text>
            <Text style={{ fontSize: 12, color: theme.primary, marginLeft: 6 }}>✏️</Text>
          </Pressable>
        )}
        {miner.info?.hostname && <Text style={styles.hostname}>{miner.info.hostname}</Text>}
        {miner.info?.version && <FirmwareBanner rawVersion={miner.info.version} />}
        {showEmojiPicker && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {[
              '⬡',
              '⚡',
              '🔧',
              '💎',
              '🔥',
              '⚙️',
              '📡',
              '🔌',
              '🖥️',
              '🧊',
              '🌊',
              '⭐',
              '🎯',
              '💪',
              '🚀',
              '🔋',
              '💡',
              '🌀',
            ].map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`Set icon ${emoji}`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: miner.icon === emoji ? theme.primary + '30' : theme.surfaceLight,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: miner.icon === emoji ? 2 : 1,
                  borderColor: miner.icon === emoji ? theme.primary : theme.border,
                }}
                onPress={() => {
                  setMinerIcon(minerId, emoji);
                  setShowEmojiPicker(false);
                }}
              >
                <Text style={{ fontSize: 18 }}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {alertRules && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Alert Thresholds</Text>
          <View style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.textDim, fontSize: 13 }}>Temp Alert (°C)</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[60, 65, 70, 75, 80].map((t) => (
                  <Pressable
                    key={t}
                    accessibilityRole="button"
                    accessibilityLabel={`Set temp alert to ${t}°C`}
                    onPress={() => {
                      const next = { ...alertRules, tempThreshold: t };
                      setAlertRulesState(next);
                      setAlertRules(minerId, next);
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor:
                        alertRules.tempThreshold === t ? theme.danger : theme.surfaceLight,
                    }}
                  >
                    <Text
                      style={{
                        color: alertRules.tempThreshold === t ? '#FFF' : theme.text,
                        fontSize: 12,
                        fontWeight: '600',
                      }}
                    >
                      {t}°
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.textDim, fontSize: 13 }}>Hashrate Drop (%)</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[30, 40, 50, 60, 70].map((p) => (
                  <Pressable
                    key={p}
                    accessibilityRole="button"
                    accessibilityLabel={`Set hashrate drop alert to ${p}%`}
                    onPress={() => {
                      const next = { ...alertRules, hashrateDropPercent: p };
                      setAlertRulesState(next);
                      setAlertRules(minerId, next);
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor:
                        alertRules.hashrateDropPercent === p ? theme.warning : theme.surfaceLight,
                    }}
                  >
                    <Text
                      style={{
                        color: alertRules.hashrateDropPercent === p ? '#FFF' : theme.text,
                        fontSize: 12,
                        fontWeight: '600',
                      }}
                    >
                      {p}%
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      <NotificationPrefs minerId={miner.id} />

      <View style={styles.section}>
        <Pressable
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
        </Pressable>
        {showWalletPicker && (
          <View style={styles.walletPicker}>
            <Pressable
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
            </Pressable>
            {wallets.map((w) => (
              <Pressable
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
              </Pressable>
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

      <View style={[styles.section, styles.groupTagRow]}>
        <Text style={styles.groupTagIcon}>📍</Text>
        <Pressable style={{ flex: 1 }} onPress={() => setShowLocationPicker(!showLocationPicker)}>
          <Text style={{ color: theme.text, fontSize: 14 }}>
            {miner.location || 'Set location...'}
          </Text>
        </Pressable>
      </View>
      {showLocationPicker && (
        <View style={[styles.section, styles.walletPicker, { marginHorizontal: 16 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear location"
            onPress={() => {
              setMinerLocation(minerId, undefined);
              setShowLocationPicker(false);
            }}
          >
            <Text style={[styles.walletName, { padding: 12 }]}>None</Text>
          </Pressable>
          {['Home', 'Office', 'Data Center', 'Mining Farm', 'Colocation'].map((loc) => (
            <Pressable
              key={loc}
              accessibilityRole="button"
              accessibilityLabel={`Set location to ${loc}`}
              onPress={() => {
                setMinerLocation(minerId, loc);
                setShowLocationPicker(false);
              }}
            >
              <Text style={[styles.walletName, { padding: 12 }]}>{loc}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏷️ Tags</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {(miner.tags || []).map((tag) => (
            <Pressable
              key={tag}
              accessibilityRole="button"
              accessibilityLabel={`Remove tag ${tag}`}
              onPress={() =>
                setMinerTags(
                  minerId,
                  (miner.tags || []).filter((t) => t !== tag),
                )
              }
              style={{
                backgroundColor: theme.primary + '30',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>{tag} ✕</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          ref={tagInputRef}
          placeholder="Add tag..."
          placeholderTextColor={theme.textMuted}
          onSubmitEditing={(e) => {
            const tag = e.nativeEvent.text.trim();
            if (tag && !(miner.tags || []).includes(tag)) {
              setMinerTags(minerId, [...(miner.tags || []), tag]);
            }
            tagInputRef.current?.clear();
          }}
          style={{
            backgroundColor: theme.surfaceLight,
            borderRadius: 10,
            padding: 10,
            color: theme.text,
            fontSize: 13,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Notes</Text>
        <TextInput
          style={[styles.groupTagInput, { minHeight: 80, textAlignVertical: 'top' }]}
          value={miner.notes || ''}
          onChangeText={(text) => {
            if (groupDebounceRef.current) clearTimeout(groupDebounceRef.current);
            groupDebounceRef.current = setTimeout(() => {
              setMinerNotes(minerId, text);
            }, 500);
          }}
          placeholder="Add notes about this miner..."
          placeholderTextColor={theme.textMuted}
          multiline
          accessibilityLabel="Miner notes input"
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
        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionIcon}>🖼</Text> Snapshot
        </Text>
        <MinerSnapshotCard miner={miner} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share Stats"
            style={[
              styles.actionBtn,
              { flex: 1, backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' },
            ]}
            onPress={handleShare}
          >
            <Text style={styles.actionBtnIcon}>📤</Text>
            <Text style={[styles.actionBtnText, { color: theme.primary }]}>
              {t('minerDetail.shareStats')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share as Image"
            style={[
              styles.actionBtn,
              { flex: 1, backgroundColor: theme.info + '15', borderColor: theme.info + '30' },
            ]}
            onPress={handleShare}
          >
            <Text style={styles.actionBtnIcon}>🖼</Text>
            <Text style={[styles.actionBtnText, { color: theme.info }]}>Share as Image</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.warning }]}>
          <Text style={styles.sectionIcon}>⚡</Text> {t('minerDetail.actions')}
        </Text>
        <Pressable
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
        </Pressable>
        <Text style={[styles.sectionTitle, { color: theme.danger }]}>
          <Text style={styles.sectionIcon}>⚠</Text> {t('minerDetail.dangerZone')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove Miner"
          style={styles.deleteBtn}
          onPress={() => setShowConfirm(!showConfirm)}
        >
          <Text style={styles.deleteBtnText}>{t('minerDetail.removeMiner')}</Text>
        </Pressable>
        {showConfirm && (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>
              {t('minerDetail.removeConfirm', { name: miner.name })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Yes, Remove"
              style={styles.confirmBtn}
              onPress={handleDelete}
            >
              <Text style={styles.confirmBtnText}>{t('minerDetail.yesRemove')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
