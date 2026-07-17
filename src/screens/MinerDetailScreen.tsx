import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Share,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';

import { NavigationProp } from '../types';
import { StatWidget } from '../components/StatWidget';
import { HashrateChart } from '../components/HashrateChart';
import { TemperatureChart } from '../components/TemperatureChart';
import { EfficiencyTrend } from '../components/EfficiencyTrend';
import { PowerChart } from '../components/PowerChart';
import { VoltageChart } from '../components/VoltageChart';
import { FanChart } from '../components/FanChart';
import { SubscriptionGate } from '../components/SubscriptionGate';
import { FirmwareBanner } from '../components/FirmwareBanner';
import { NotificationPrefs } from '../components/NotificationPrefs';
import { MinerSnapshotCard } from '../components/MinerSnapshotCard';
import { PoolChangeHistory } from '../components/PoolChangeHistory';
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
import { spacing, fontSize, fontWeight, radius, buttonText } from '../utils/design';
import { MarkdownText } from '../utils/markdown';
import { calculateHealthScore, HealthBreakdown } from '../utils/healthScore';

const LazyHealthPredictionCard = React.lazy(() =>
  import('../components/HealthPredictionCard').then((m) => ({ default: m.HealthPredictionCard })),
);
import { TimeAgo } from '../components/TimeAgo';
import { useTranslation } from 'react-i18next';
import { useMinerDetail } from '../hooks/useMinerDetail';
import { AlertRuleSlider } from '../components/AlertRuleSlider';
import { trackScreenView } from '../services/analytics';

interface MinerDetailScreenProps {
  route: { params: { minerId: string } };
  navigation: NavigationProp;
}

export function MinerDetailScreen({ route, navigation }: MinerDetailScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    trackScreenView('MinerDetail');
  }, []);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        content: {
          paddingBottom: spacing.xxl,
        },
        center: {
          flex: 1,
          backgroundColor: theme.bg,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xxl,
        },
        offlineIcon: {
          fontSize: fontSize.hero,
          marginBottom: spacing.lg,
          color: theme.textMuted,
        },
        offlineText: {
          color: theme.danger,
          fontSize: fontSize.xl,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.md,
        },
        offlineSubtext: {
          color: theme.textDim,
          fontSize: fontSize.base,
          marginBottom: spacing.lg,
        },
        retryBtn: {
          backgroundColor: theme.primary,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderRadius: radius.lg,
        },
        retryBtnText: {
          color: buttonText,
          fontWeight: fontWeight.semibold,
        },
        header: {
          padding: spacing.lg,
          backgroundColor: theme.surface,
          margin: spacing.lg,
          borderRadius: radius.xxl,
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: `0 4px 20px ${theme.glow}`,
        },
        headerTop: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
        },
        nameRow: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        dot: {
          width: spacing.xs,
          height: spacing.xs,
          borderRadius: spacing.xxs,
          marginRight: spacing.xxs,
        },
        name: {
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.extrabold,
          letterSpacing: -0.3,
        },
        badge: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
        },
        badgeText: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.extrabold,
          letterSpacing: 0.8,
        },
        ip: {
          color: theme.textDim,
          fontSize: fontSize.base,
          fontFamily: 'monospace',
        },
        hostname: {
          color: theme.textMuted,
          fontSize: fontSize.xs,
          marginTop: spacing.xxs,
        },
        walletRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.surface,
          borderRadius: radius.xl,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        walletRowLeft: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        walletRowIcon: {
          fontSize: fontSize.base,
          marginRight: spacing.xs,
        },
        walletRowText: {
          color: theme.text,
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
        },
        walletRowArrow: {
          color: theme.textMuted,
          fontSize: fontSize.xs,
        },
        walletPicker: {
          backgroundColor: theme.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: theme.border,
          marginTop: spacing.xs,
          overflow: 'hidden',
        },
        walletOption: {
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        walletOptionRow: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        walletDot: {
          width: spacing.xxs,
          height: spacing.xxs,
          borderRadius: spacing.xxs,
          marginRight: spacing.xs,
        },
        walletName: {
          color: theme.text,
          fontSize: fontSize.base,
          fontWeight: fontWeight.regular,
        },
        groupTagRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        groupTagIcon: {
          fontSize: fontSize.base,
        },
        groupTagInput: {
          flex: 1,
          backgroundColor: theme.surface,
          borderRadius: radius.xl,
          padding: spacing.md,
          color: theme.text,
          fontSize: fontSize.base,
          fontWeight: fontWeight.regular,
          borderWidth: 1,
          borderColor: theme.border,
        },
        actionBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          gap: spacing.xs,
        },
        actionBtnIcon: {
          fontSize: fontSize.lg,
        },
        actionBtnText: {
          fontWeight: fontWeight.bold,
          fontSize: fontSize.md,
        },
        section: {
          marginHorizontal: spacing.lg,
          marginTop: spacing.md,
        },
        sectionTitle: {
          color: theme.text,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.sm,
        },
        sectionIcon: {
          fontSize: fontSize.base,
          marginRight: spacing.xxs,
        },
        statsGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
        },
        poolCard: {
          backgroundColor: theme.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        poolRow: {
          paddingVertical: spacing.xxs,
        },
        poolDivider: {
          height: 1,
          backgroundColor: theme.border,
          marginVertical: spacing.xs,
        },
        poolLabel: {
          color: theme.textDim,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 2,
        },
        poolValue: {
          color: theme.text,
          fontSize: fontSize.base,
          fontFamily: 'monospace',
        },
        deleteBtn: {
          backgroundColor: theme.danger + '1A',
          padding: 14,
          borderRadius: radius.md,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.danger + '4D',
        },
        deleteBtnText: {
          color: theme.danger,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.md,
        },
        flashBtn: {
          borderRadius: radius.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 40,
        },
        confirmBox: {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginTop: spacing.sm,
          borderWidth: 1,
          borderColor: theme.border,
        },
        confirmText: {
          color: theme.textDim,
          fontSize: fontSize.sm,
          marginBottom: spacing.sm,
          lineHeight: fontSize.base,
        },
        confirmBtn: {
          backgroundColor: theme.danger,
          padding: spacing.sm,
          borderRadius: radius.md,
          alignItems: 'center',
        },
        confirmBtnText: {
          color: buttonText,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.md,
        },
      }),
    [theme],
  );
  const { minerId } = route.params;
  const {
    miner,
    healthPrediction,
    snapshots,
    wallets,
    alertRules,
    notes,
    refreshing,
    refreshMiner,
    setMinerWallet,
    setMinerIp,
    setMinerIcon,
    setMinerLocation,
    setMinerTags,
    setMinerMaintenance,
    refresh,
    handleShare,
    handleRestart,
    savePool,
    deleteMinerAction,
    addNote,
    deleteNote,
    updateAlertRules,
    resetAlertRules,
    saveGroupTag,
  } = useMinerDetail(minerId);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [editingIP, setEditingIP] = useState(false);
  const [editIPValue, setEditIPValue] = useState('');
  const [editingPool, setEditingPool] = useState(false);
  const [editPoolUrl, setEditPoolUrl] = useState('');
  const [editPoolPort, setEditPoolPort] = useState('');
  const [editPoolUser, setEditPoolUser] = useState('');
  const [noteText, setNoteText] = useState('');
  const statsRef = useRef<View>(null);
  const tagInputRef = useRef<TextInput>(null);

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

  const healthScore = useMemo(() => calculateHealthScore(miner), [miner]);

  const healthGradeColor = useMemo(() => {
    switch (healthScore.grade) {
      case 'A+':
      case 'A':
        return theme.success;
      case 'B+':
      case 'B':
        return theme.info;
      case 'C+':
      case 'C':
        return theme.warning;
      case 'D':
        return theme.danger;
      case 'F':
        return '#7F1D1D';
      default:
        return theme.text;
    }
  }, [healthScore.grade, theme]);

  const healthFactors: { key: keyof HealthBreakdown; label: string }[] = [
    { key: 'temperature', label: t('health.temperature', 'Temperature') },
    { key: 'hashrate', label: t('health.hashrate', 'Hashrate') },
    { key: 'uptime', label: t('health.uptime', 'Uptime') },
    { key: 'shares', label: t('health.shares', 'Shares') },
    { key: 'stability', label: t('health.stability', 'Stability') },
  ];

  const handleShareAsImage = async () => {
    try {
      const { captureRef } = await import('react-native-view-shot');
      const uri = await captureRef(statsRef, { format: 'png', quality: 0.8 });
      await Share.share({ url: uri, message: `⬡ ${miner.name}` }).catch((e) =>
        console.warn('Share image failed:', e),
      );
    } catch (e) {
      console.warn('Capture failed, falling back to text share:', e);
      handleShare();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} />
      }
    >
      <View ref={statsRef} collapsable={false}>
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
                <Text style={{ fontSize: fontSize.h2, marginRight: spacing.xxs }}>
                  {miner.icon || '⬡'}
                </Text>
                <Text style={styles.name}>{miner.name}</Text>
                <Text
                  style={{ fontSize: fontSize.sm, color: theme.primary, marginLeft: spacing.xxs }}
                >
                  ✎
                </Text>
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
                <Text
                  style={{ fontSize: fontSize.lg, color: theme.success, marginLeft: spacing.xs }}
                >
                  ✓
                </Text>
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
              <Text style={{ fontSize: fontSize.sm, color: theme.primary, marginLeft: 6 }}>✏️</Text>
            </Pressable>
          )}
          {miner.info?.hostname && <Text style={styles.hostname}>{miner.info.hostname}</Text>}
          {miner.info?.version && (
            <FirmwareBanner
              rawVersion={miner.info.version}
              minerIp={miner.ip}
              minerPort={miner.port}
              apiPath={miner.apiPath}
              statusPath={miner.statusPath}
            />
          )}
          {showEmojiPicker && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.xs,
                marginTop: spacing.xs,
              }}
            >
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
                    borderRadius: radius.md,
                    backgroundColor:
                      miner.icon === emoji ? theme.primary + '30' : theme.surfaceLight,
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
                  <Text style={{ fontSize: fontSize.xl }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

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
                      backgroundColor:
                        miner.walletId === w.id ? theme.primary + '20' : 'transparent',
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
            onChangeText={(text) => saveGroupTag(text)}
            placeholder={t('minerDetail.groupPlaceholder')}
            placeholderTextColor={theme.textMuted}
            accessibilityLabel="Group tag input"
          />
        </View>

        <View style={[styles.section, styles.groupTagRow]}>
          <Text style={styles.groupTagIcon}>📍</Text>
          <Pressable style={{ flex: 1 }} onPress={() => setShowLocationPicker(!showLocationPicker)}>
            <Text style={{ color: theme.text, fontSize: fontSize.base }}>
              {miner.location || 'Set location...'}
            </Text>
          </Pressable>
        </View>
        {showLocationPicker && (
          <View style={[styles.section, styles.walletPicker, { marginHorizontal: spacing.md }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear location"
              onPress={() => {
                setMinerLocation(minerId, undefined);
                setShowLocationPicker(false);
              }}
            >
              <Text style={[styles.walletName, { padding: 12 }]}>{t('common.none')}</Text>
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
                <Text style={[styles.walletName, { padding: 12 }]}>
                  {t(`minerDetail.location${loc.replace(/\s+/g, '')}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏷️ Tags</Text>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: 8 }}
          >
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
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xxs,
                }}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: fontSize.xs,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {tag} ✕
                </Text>
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
              borderRadius: radius.md,
              padding: spacing.sm,
              color: theme.text,
              fontSize: fontSize.xs,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.sectionIcon}>📝</Text> {t('minerDetail.notes')}
          </Text>
          {notes.length > 0 && (
            <View style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
              {notes.map((note) => (
                <View
                  key={note.id}
                  style={{
                    flexDirection: 'row',
                    backgroundColor: theme.surfaceLight,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    alignItems: 'flex-start',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <MarkdownText style={{ color: theme.text, fontSize: fontSize.base }}>
                      {note.text}
                    </MarkdownText>
                    {note.createdat && (
                      <TimeAgo
                        timestamp={new Date(note.createdat).getTime()}
                        style={{ color: theme.textMuted, fontSize: fontSize.xs, marginTop: 2 }}
                      />
                    )}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete note"
                    hitSlop={8}
                    onPress={() => deleteNote(note.id)}
                  >
                    <Text
                      style={{ color: theme.danger, fontSize: fontSize.lg, marginLeft: spacing.xs }}
                    >
                      ✕
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <TextInput
              style={[
                styles.groupTagInput,
                {
                  flex: 1,
                  minHeight: 36,
                  maxHeight: 80,
                  textAlignVertical: 'top',
                },
              ]}
              value={noteText}
              onChangeText={setNoteText}
              placeholder={String(t('minerDetail.addNotePlaceholder'))}
              placeholderTextColor={theme.textMuted}
              multiline
              accessibilityLabel="New note input"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add note"
              style={[
                styles.actionBtn,
                {
                  backgroundColor: theme.primary + '15',
                  borderColor: theme.primary + '30',
                  paddingHorizontal: spacing.md,
                  justifyContent: 'center',
                  opacity: noteText.trim().length === 0 ? 0.5 : 1,
                },
              ]}
              disabled={noteText.trim().length === 0}
              onPress={async () => {
                if (!noteText.trim()) return;
                await addNote(noteText);
                setNoteText('');
              }}
            >
              <Text style={[styles.actionBtnText, { color: theme.primary }]}>
                {t('minerDetail.addNote')}
              </Text>
            </Pressable>
          </View>
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
            <Text style={styles.sectionIcon}>💊</Text> {t('health.title', 'Health Score')}
          </Text>
          <View
            accessibilityRole="summary"
            accessibilityLabel={`${t('health.title', 'Health Score')} ${healthScore.grade} ${healthScore.score}/100`}
            style={[styles.poolCard, { borderColor: healthGradeColor + '40' }]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  borderWidth: 2,
                  borderColor: healthGradeColor,
                  backgroundColor: healthGradeColor + '18',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: spacing.md,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize.xl,
                    fontWeight: fontWeight.extrabold,
                    color: healthGradeColor,
                  }}
                  accessibilityLabel={`${t('health.grade', 'Grade')} ${healthScore.grade}`}
                >
                  {healthScore.grade}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: fontSize.md,
                    fontWeight: fontWeight.bold,
                    color: theme.text,
                  }}
                >
                  {t('health.title', 'Health Score')}
                </Text>
                <Text
                  style={{
                    fontSize: fontSize.sm,
                    color: theme.textDim,
                  }}
                  accessibilityLabel={`${healthScore.score} ${t('health.outOf100', 'out of 100')}`}
                >
                  {healthScore.score}/100
                </Text>
              </View>
            </View>

            {healthFactors.map((f) => {
              const value = healthScore[f.key] as number;
              const barColor =
                value >= 80 ? theme.success : value >= 60 ? theme.warning : theme.danger;
              return (
                <View
                  key={f.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: spacing.xs,
                    gap: spacing.xs,
                  }}
                >
                  <Text
                    accessibilityLabel={`${f.label}: ${value}`}
                    style={{
                      width: 80,
                      fontSize: fontSize.xs,
                      color: theme.textMuted,
                    }}
                  >
                    {f.label}
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: theme.surfaceLight,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        width: `${value}%`,
                        borderRadius: 3,
                        backgroundColor: barColor,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      width: 28,
                      fontSize: fontSize.xs,
                      color: theme.text,
                      textAlign: 'right',
                    }}
                  >
                    {value}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {healthPrediction && (
          <Suspense fallback={null}>
            <LazyHealthPredictionCard prediction={healthPrediction} />
          </Suspense>
        )}

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
            {miner.info?.ssid && (
              <StatWidget
                icon="📶"
                label={t('minerDetail.wifiNetwork', 'WiFi')}
                value={miner.info.ssid}
                color={theme.info}
              />
            )}
            {miner.info?.wifiSignal != null && (
              <StatWidget
                icon="📡"
                label={t('minerDetail.wifiSignal', 'Signal')}
                value={`${miner.info.wifiSignal}%`}
                color={
                  miner.info.wifiSignal > 50
                    ? theme.success
                    : miner.info.wifiSignal > 25
                      ? theme.warning
                      : theme.danger
                }
              />
            )}
            {miner.info?.powerMode != null && (
              <StatWidget
                icon="🔌"
                label={t('minerDetail.powerMode', 'Mode')}
                value={
                  miner.info.powerMode === 0
                    ? t('minerDetail.powerModeStandard')
                    : miner.info.powerMode === 1
                      ? t('minerDetail.powerModeECO')
                      : `P${miner.info.powerMode}`
                }
                color={theme.primary}
              />
            )}
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
            {editingPool ? (
              <View style={{ gap: spacing.sm }}>
                <View>
                  <Text style={styles.poolLabel}>{t('minerDetail.url')}</Text>
                  <TextInput
                    style={[
                      styles.poolValue,
                      { borderBottomWidth: 1, borderBottomColor: theme.primary },
                    ]}
                    value={editPoolUrl}
                    onChangeText={setEditPoolUrl}
                    placeholder="pool.example.com"
                    placeholderTextColor={theme.textMuted}
                    autoFocus
                  />
                </View>
                <View>
                  <Text style={styles.poolLabel}>{t('minerDetail.port', 'Port')}</Text>
                  <TextInput
                    style={[
                      styles.poolValue,
                      { borderBottomWidth: 1, borderBottomColor: theme.primary },
                    ]}
                    value={editPoolPort}
                    onChangeText={setEditPoolPort}
                    placeholder="3333"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                <View>
                  <Text style={styles.poolLabel}>{t('minerDetail.user')}</Text>
                  <TextInput
                    style={[
                      styles.poolValue,
                      { borderBottomWidth: 1, borderBottomColor: theme.primary },
                    ]}
                    value={editPoolUser}
                    onChangeText={setEditPoolUser}
                    placeholder="username.worker"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                  <Pressable
                    style={[styles.flashBtn, { flex: 1, backgroundColor: theme.success }]}
                    onPress={async () => {
                      if (!editPoolUrl.trim()) return;
                      const ok = await savePool(editPoolUrl, editPoolPort, editPoolUser);
                      if (ok) {
                        Alert.alert(
                          t('common.success', 'Success'),
                          t('minerDetail.poolUpdated', 'Pool updated'),
                        );
                      } else {
                        Alert.alert(
                          t('common.error', 'Error'),
                          t('minerDetail.poolUpdateFailed', 'Failed to update pool'),
                        );
                      }
                      setEditingPool(false);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: fontWeight.bold }}>
                      {t('common.save')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.flashBtn, { flex: 1, backgroundColor: theme.surfaceLight }]}
                    onPress={() => setEditingPool(false)}
                  >
                    <Text style={{ color: theme.text, fontWeight: fontWeight.semibold }}>
                      {t('common.cancel')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.poolRow}>
                  <Text style={styles.poolLabel}>{t('minerDetail.url')}</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flex: 1,
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Text style={styles.poolValue}>
                      {s.pool && s.poolPort ? `${s.pool}:${s.poolPort}` : s.pool || t('common.na')}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Change pool"
                      onPress={() => {
                        setEditPoolUrl(s.pool || '');
                        setEditPoolPort(String(s.poolPort || 3333));
                        setEditPoolUser(s.poolUser || '');
                        setEditingPool(true);
                      }}
                    >
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          color: theme.primary,
                          marginLeft: spacing.sm,
                        }}
                      >
                        {t('common.edit')}
                      </Text>
                    </Pressable>
                  </View>
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
                    {s.poolResponseTime > 0
                      ? `${s.poolResponseTime.toFixed(0)} ms`
                      : t('common.na')}
                  </Text>
                </View>
              </>
            )}
          </View>
          <PoolChangeHistory minerId={miner.id} />
        </View>

        {alertRules && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionIcon}>🔔</Text>{' '}
              {t('minerDetail.alertRules', 'Alert Rules')}
            </Text>
            <View style={[styles.poolCard, { gap: spacing.sm }]}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontSize: fontSize.md,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {t('minerDetail.alertRulesEnabled', 'Enabled')}
                </Text>
                <Switch
                  value={alertRules.enabled}
                  onValueChange={(v) => updateAlertRules({ enabled: v })}
                  trackColor={{ false: theme.textMuted, true: theme.primary + '80' }}
                  thumbColor={alertRules.enabled ? theme.primary : theme.textMuted}
                  accessibilityLabel="Toggle alert rules"
                />
              </View>
              {alertRules.enabled && (
                <>
                  <AlertRuleSlider
                    label={t('minerDetail.tempThreshold', 'Temp Threshold')}
                    value={alertRules.tempThreshold}
                    min={50}
                    max={100}
                    unit="°C"
                    onChange={(v) => updateAlertRules({ tempThreshold: v })}
                  />
                  <AlertRuleSlider
                    label={t('minerDetail.hashrateDrop', 'Hashrate Drop %')}
                    value={alertRules.hashrateDropPercent}
                    min={10}
                    max={90}
                    unit="%"
                    onChange={(v) => updateAlertRules({ hashrateDropPercent: v })}
                  />
                  <AlertRuleSlider
                    label={t('minerDetail.offlineReminder', 'Offline Reminder (min)')}
                    value={alertRules.offlineReminderMinutes}
                    min={1}
                    max={60}
                    unit="min"
                    onChange={(v) => updateAlertRules({ offlineReminderMinutes: v })}
                  />
                  <AlertRuleSlider
                    label={t('minerDetail.uptimeThreshold', 'Uptime Alert (hours)')}
                    value={alertRules.uptimeThresholdHours}
                    min={1}
                    max={168}
                    unit="h"
                    onChange={(v) => updateAlertRules({ uptimeThresholdHours: v })}
                  />
                  <AlertRuleSlider
                    label={t('minerDetail.shareRejection', 'Share Rejection %')}
                    value={alertRules.shareRejectionPercent}
                    min={1}
                    max={50}
                    unit="%"
                    onChange={(v) => updateAlertRules({ shareRejectionPercent: v })}
                  />
                  <Pressable
                    onPress={resetAlertRules}
                    style={({ pressed }) => ({
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.sm,
                      backgroundColor: theme.surfaceLight,
                      opacity: pressed ? 0.6 : 1,
                      alignItems: 'center',
                      marginTop: spacing.xs,
                    })}
                    accessibilityRole="button"
                    accessibilityLabel="Reset alert rules to defaults"
                  >
                    <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>
                      {t('minerDetail.resetDefaults', 'Reset to Defaults')}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        )}

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

        {snapshots.length > 1 && (
          <View style={[styles.section, { paddingTop: 0 }]}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionIcon}>🌡</Text>{' '}
              {t('minerDetail.temperatureHistory', 'Temperature History')}
            </Text>
            <SubscriptionGate feature="30-day charts">
              <TemperatureChart snapshots={snapshots} />
            </SubscriptionGate>
          </View>
        )}

        {snapshots.length > 1 && (
          <View style={[styles.section, { paddingTop: 0 }]}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionIcon}>⚡</Text>{' '}
              {t('minerDetail.powerHistory', 'Power History')}
            </Text>
            <SubscriptionGate feature="30-day charts">
              <PowerChart snapshots={snapshots} />
            </SubscriptionGate>
          </View>
        )}

        {snapshots.length > 1 && (
          <View style={[styles.section, { paddingTop: 0 }]}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionIcon}>🔋</Text>{' '}
              {t('minerDetail.voltageHistory', 'Voltage History')}
            </Text>
            <SubscriptionGate feature="30-day charts">
              <VoltageChart snapshots={snapshots} />
            </SubscriptionGate>
          </View>
        )}

        {snapshots.length > 1 && (
          <View style={[styles.section, { paddingTop: 0 }]}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionIcon}>🌀</Text>{' '}
              {t('minerDetail.fanHistory', 'Fan Speed History')}
            </Text>
            <SubscriptionGate feature="30-day charts">
              <FanChart snapshots={snapshots} />
            </SubscriptionGate>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.sectionIcon}>🖼</Text> Snapshot
          </Text>
          <MinerSnapshotCard miner={miner} />
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share Stats"
              style={[
                styles.actionBtn,
                {
                  flex: 1,
                  backgroundColor: theme.primary + '15',
                  borderColor: theme.primary + '30',
                },
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
              accessibilityLabel={t('minerDetail.shareAsImage')}
              style={[
                styles.actionBtn,
                { flex: 1, backgroundColor: theme.info + '15', borderColor: theme.info + '30' },
              ]}
              onPress={handleShareAsImage}
            >
              <Text style={styles.actionBtnIcon}>🖼</Text>
              <Text style={[styles.actionBtnText, { color: theme.info }]}>
                {t('minerDetail.shareAsImage')}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.warning }]}>
            <Text style={styles.sectionIcon}>⚡</Text> {t('minerDetail.actions')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('minerDetail.restartMiner')}
            style={[
              styles.actionBtn,
              {
                backgroundColor: theme.warning + '15',
                borderColor: theme.warning + '30',
                marginBottom: 12,
              },
            ]}
            onPress={async () => {
              const ok = await handleRestart();
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              miner.maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'
            }
            style={[
              styles.actionBtn,
              {
                backgroundColor: miner.maintenanceMode
                  ? theme.success + '15'
                  : theme.warning + '15',
                borderColor: miner.maintenanceMode ? theme.success + '30' : theme.warning + '30',
                marginBottom: 12,
              },
            ]}
            onPress={() => setMinerMaintenance(miner.id, !miner.maintenanceMode)}
          >
            <Text style={styles.actionBtnIcon}>{miner.maintenanceMode ? '✅' : '🔧'}</Text>
            <Text
              style={[
                styles.actionBtnText,
                { color: miner.maintenanceMode ? theme.success : theme.warning },
              ]}
            >
              {miner.maintenanceMode
                ? t('minerDetail.maintenanceOn')
                : t('minerDetail.maintenanceOff')}
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
                onPress={() => {
                  navigation.goBack();
                  deleteMinerAction();
                }}
              >
                <Text style={styles.confirmBtnText}>{t('minerDetail.yesRemove')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
