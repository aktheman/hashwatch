import { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMinerStore } from '../store/miners';
import { useToastStore } from '../store/toast';
import { useSubscriptionStore } from '../store/subscription';
import { MinerCard } from '../components/MinerCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { EarningsCard } from '../components/EarningsCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { Miner, Wallet, NavigationProp } from '../types';
import { formatWTHs } from '../utils/formatters';
import { toHashesPerSecond, formatHashrateValue } from '../utils/hashrate';
import { useTheme } from '../theme';
import { MetricTile } from '../components/DashboardComponents';
import { Sparkline, MiniBarChart, Donut, Gauge, Timeline } from '../components/ChartWidgets';
import * as DB from '../db/database';

interface DashboardScreenProps {
  navigation: NavigationProp;
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const loading = useMinerStore((s) => s.loading);
  const initialized = useMinerStore((s) => s.initialized);
  const scanning = useMinerStore((s) => s.scanning);
  const scanProgress = useMinerStore((s) => s.scanProgress);
  const error = useMinerStore((s) => s.error);
  const loadMiners = useMinerStore((s) => s.loadMiners);
  const startPolling = useMinerStore((s) => s.startPolling);
  const scanNetwork = useMinerStore((s) => s.scanNetwork);
  const clearError = useMinerStore((s) => s.clearError);
  const removeMiner = useMinerStore((s) => s.removeMiner);
  const setMinerGroup = useMinerStore((s) => s.setMinerGroup);
  const setMinerWallet = useMinerStore((s) => s.setMinerWallet);
  const canAddMiner = useSubscriptionStore((s) => s.canAddMiner);
  const initSubscription = useSubscriptionStore((s) => s.initialize);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletFilter, setWalletFilter] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  const groups = useMemo(() => {
    const gs = new Set(miners.map((m) => m.group).filter(Boolean) as string[]);
    const sorted = Array.from(gs).sort();
    if (miners.some((m) => !m.group)) {
      sorted.push('Ungrouped');
    }
    return sorted;
  }, [miners]);

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

  const filteredMiners = useMemo(
    () =>
      miners.filter((m) => {
        if (walletFilter && m.walletId !== walletFilter) return false;
        if (groupFilter === 'Ungrouped' && m.group) return false;
        if (groupFilter && groupFilter !== 'Ungrouped' && m.group !== groupFilter) return false;
        return true;
      }),
    [miners, walletFilter, groupFilter],
  );

  useEffect(() => {
    initSubscription();
    loadMiners();
    const stop = startPolling(30000);
    const autoScanInterval = setInterval(async () => {
      const v = await DB.getSetting('auto_scan');
      if (v === 'true' && !useMinerStore.getState().scanning) {
        scanNetwork();
      }
    }, 300000);
    return () => {
      stop();
      clearInterval(autoScanInterval);
    };
  }, []);

  const handleMinerPress = useCallback(
    (miner: Miner) => {
      if (selectionMode) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(miner.id)) {
            next.delete(miner.id);
          } else {
            next.add(miner.id);
          }
          return next;
        });
      } else {
        navigation.navigate('MinerDetail', { minerId: miner.id });
      }
    },
    [navigation, selectionMode],
  );

  const clearSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBatchGroup = useCallback(() => {
    const selected = miners.filter((m) => selectedIds.has(m.id));
    if (selected.length === 0) return;
    Alert.prompt(
      t('dashboard.assignGroup'),
      t('dashboard.assignGroupBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('dashboard.removeGroup'),
          style: 'destructive',
          onPress: () => {
            selected.forEach((m) => setMinerGroup(m.id, undefined));
          },
        },
        {
          text: t('common.ok'),
          onPress: (name?: string) => {
            if (name?.trim()) {
              selected.forEach((m) => setMinerGroup(m.id, name.trim()));
            }
          },
        },
      ],
      'plain-text',
      '',
    );
  }, [miners, selectedIds, setMinerGroup, t]);

  const handleBatchWallet = useCallback(
    (walletId: string | undefined) => {
      const selected = miners.filter((m) => selectedIds.has(m.id));
      selected.forEach((m) => setMinerWallet(m.id, walletId));
      setShowWalletPicker(false);
    },
    [miners, selectedIds, setMinerWallet, setShowWalletPicker],
  );

  const handleBatchDelete = useCallback(() => {
    const selected = miners.filter((m) => selectedIds.has(m.id));
    if (selected.length === 0) return;
    const names = selected.map((m) => m.name).join(', ');
    Alert.alert(
      t('dashboard.batchDeleteTitle', { count: selected.length }),
      t('dashboard.batchDeleteBody', { names }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            selected.forEach((m) =>
              useToastStore.getState().showUndo({
                id: `batch-delete-${m.id}`,
                message: t('dashboard.minerRemoved', { name: m.name }),
                onUndo: () => {},
                onConfirm: () => removeMiner(m.id),
              }),
            );
            clearSelection();
          },
        },
      ],
    );
  }, [miners, selectedIds, removeMiner, clearSelection, t]);

  const handleAddMiner = useCallback(() => {
    if (!canAddMiner(miners.length)) {
      navigation.navigate('Subscription');
      return;
    }
    navigation.navigate('AddMiner');
  }, [navigation, miners.length, canAddMiner]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await useMinerStore.getState().refreshAll();
    setRefreshing(false);
  }, []);

  const { onlineCount, totalHashrate, totalPower, avgTemp } = useMemo(() => {
    const on = filteredMiners.filter((m) => m.isOnline).length;
    const hr = filteredMiners.reduce(
      (sum, m) => sum + toHashesPerSecond(m.status?.hashRate ?? 0, m.status?.hashRateUnit),
      0,
    );
    const pw = filteredMiners.reduce((sum, m) => sum + (m.status?.power ?? 0), 0);
    const withTemp = filteredMiners.filter((m) => m.status?.temperature);
    const at =
      withTemp.length > 0
        ? withTemp.reduce((sum, m) => sum + (m.status?.temperature ?? 0), 0) / withTemp.length
        : 0;
    return { onlineCount: on, totalHashrate: hr, totalPower: pw, avgTemp: at };
  }, [filteredMiners]);

  const canAdd = canAddMiner(miners.length);

  const formatTotal = (hashesPerSecond: number) => formatHashrateValue(hashesPerSecond);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        headerBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
        },
        headerTitle: {
          color: theme.text,
          fontSize: 26,
          fontWeight: '800',
          letterSpacing: -0.5,
        },
        headerSub: {
          color: theme.textDim,
          fontSize: 12,
          marginTop: 2,
          flexDirection: 'row',
          alignItems: 'center',
        },
        liveDot: {
          color: theme.success,
          fontSize: 8,
          marginRight: 4,
        },
        settingsBtn: {
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: theme.surface,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.border,
        },
        settingsIcon: {
          fontSize: 16,
        },
        summaryRow: {
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingVertical: 6,
          gap: 8,
        },
        summaryCard: {
          flex: 1,
          backgroundColor: theme.surface,
          borderRadius: 16,
          padding: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: `0 2px 12px ${theme.glow}`,
        },
        summaryIcon: {
          fontSize: 16,
          marginBottom: 4,
        },
        summaryValue: {
          fontSize: 22,
          fontWeight: '800',
          color: theme.text,
        },
        summaryLabel: {
          fontSize: 10,
          color: theme.textDim,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 2,
        },
        upgradeBanner: {
          backgroundColor: theme.primary + '1A',
          borderWidth: 1,
          borderColor: theme.primary,
          borderRadius: 10,
          padding: 10,
          marginHorizontal: 16,
          marginBottom: 8,
          alignItems: 'center',
        },
        upgradeBannerText: {
          color: theme.primaryLight,
          fontSize: 13,
          fontWeight: '600',
        },
        scanningBanner: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 8,
          marginHorizontal: 16,
          borderRadius: 10,
          gap: 8,
          marginBottom: 8,
        },
        scanningText: {
          color: theme.primaryLight,
          fontSize: 13,
          fontWeight: '500',
        },
        center: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 32,
        },
        loadingText: {
          color: theme.textDim,
          marginTop: 12,
          fontSize: 14,
          fontWeight: '500',
        },
        emptyIcon: {
          fontSize: 48,
          color: theme.textMuted,
          marginBottom: 16,
        },
        emptyTitle: {
          color: theme.text,
          fontSize: 20,
          fontWeight: '700',
          marginBottom: 8,
        },
        emptyText: {
          color: theme.textDim,
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 16,
          lineHeight: 20,
        },
        emptySteps: {
          marginBottom: 24,
          gap: 6,
        },
        stepText: {
          color: theme.textMuted,
          fontSize: 13,
          textAlign: 'center',
        },
        emptyActions: {
          flexDirection: 'row',
          gap: 12,
        },
        primaryBtn: {
          backgroundColor: theme.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        },
        primaryBtnText: {
          color: '#FFF',
          fontWeight: '700',
          fontSize: 15,
        },
        secondaryBtn: {
          backgroundColor: theme.surface,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
        },
        secondaryBtnText: {
          color: theme.text,
          fontWeight: '600',
          fontSize: 15,
        },
        list: {
          paddingTop: 4,
          paddingBottom: 100,
        },
        fab: {
          position: 'absolute',
          right: 20,
          bottom: 24,
          width: 60,
          height: 60,
          borderRadius: 18,
          backgroundColor: theme.primary,
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: `0 4px 20px ${theme.glow}`,
          borderWidth: 1,
          borderColor: theme.primaryLight + '40',
        },
        fabDisabled: {
          backgroundColor: theme.textMuted,
        },
        selectionBar: {
          position: 'absolute',
          bottom: 24,
          left: 20,
          right: 20,
          backgroundColor: theme.surface,
          borderRadius: 18,
          padding: 12,
          borderWidth: 1,
          borderColor: theme.primary + '40',
          boxShadow: `0 4px 24px ${theme.glow}`,
          gap: 8,
        },
        selectionCount: {
          color: theme.text,
          fontSize: 15,
          fontWeight: '600',
          textAlign: 'center',
        },
        selectionActions: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 6,
        },
        batchBtn: {
          backgroundColor: theme.surfaceLight,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.border,
        },
        batchBtnText: {
          color: theme.text,
          fontWeight: '600',
          fontSize: 13,
        },
        batchDeleteBtn: {
          backgroundColor: theme.danger + '1A',
          borderColor: theme.danger + '4D',
        },
        batchDeleteText: {
          color: theme.danger,
        },
        compareBtn: {
          backgroundColor: theme.primary,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 10,
        },
        compareBtnDisabled: {
          opacity: 0.4,
        },
        compareBtnText: {
          color: '#FFF',
          fontWeight: '700',
          fontSize: 13,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        modalContent: {
          backgroundColor: theme.surface,
          borderRadius: 18,
          padding: 20,
          width: '80%',
          maxWidth: 320,
          borderWidth: 1,
          borderColor: theme.border,
          gap: 4,
        },
        modalTitle: {
          color: theme.text,
          fontSize: 18,
          fontWeight: '700',
          marginBottom: 8,
        },
        modalOption: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          borderRadius: 10,
          gap: 10,
        },
        modalOptionText: {
          color: theme.text,
          fontSize: 15,
          fontWeight: '500',
        },
        walletDot: {
          width: 12,
          height: 12,
          borderRadius: 6,
        },
        fabText: {
          color: '#FFF',
          fontSize: 28,
          fontWeight: '400',
          lineHeight: 30,
        },
        walletChip: {
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 16,
          borderWidth: 1,
        },
        walletChipText: {
          fontSize: 12,
          fontWeight: '600',
        },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
          <Text style={styles.headerSub}>
            <Text style={styles.liveDot}>●</Text> {t('dashboard.subtitle')}
          </Text>
        </View>
        {selectionMode ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cancel selection"
            style={styles.settingsBtn}
            onPress={() => {
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}
          >
            <Text style={styles.settingsIcon}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Compare miners"
              style={[styles.settingsBtn, { marginRight: 8 }]}
              onPress={() => setSelectionMode(true)}
            >
              <Text style={styles.settingsIcon}>⇄</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.settingsIcon}>⚙</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {miners.length > 0 && <EarningsCard miners={miners} />}

      <View style={{ paddingHorizontal: 16, gap: 10, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <MetricTile
            title={String(t('dashboard.hashrate'))}
            value={formatTotal(totalHashrate)}
            unit="H/s"
            accent="info"
            trend="-10%"
            chart="sparkline"
            chartData={[40, 55, 48, 62, 70, 58, 65]}
          />
          <MetricTile
            title={String(t('dashboard.efficiency'))}
            value="72"
            unit="%"
            accent="success"
            trend="+8%"
            chart="donut"
          />
          <MetricTile
            title={String(t('dashboard.power'))}
            value={`${totalPower.toFixed(1)}`}
            unit="W"
            accent="warning"
            trend="-12%"
            chart="bars"
            chartData={[120, 180, 140, 210, 160, 190]}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <MetricTile
            title={String(t('dashboard.temp'))}
            value={avgTemp > 0 ? `${avgTemp.toFixed(0)}°` : '—°'}
            accent={avgTemp > 70 ? 'danger' : 'success'}
            chart="gauge"
            size="sm"
          />
          <MetricTile
            title={String(t('dashboard.uptime'))}
            value="98.7%"
            unit="SLA"
            accent="primary"
            chart="sparkline"
            chartData={[80, 82, 79, 83, 85, 84, 86]}
          />
          <MetricTile
            title={String(t('dashboard.workers'))}
            value={String(filteredMiners.length)}
            unit="active"
            accent="info"
            trend="+3"
            chart="bars"
            chartData={[3, 5, 4, 6, 5, 7]}
          />
        </View>
      </View>

      {(wallets.length > 0 || groups.length > 0) && (
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            gap: 6,
            marginBottom: 6,
            flexWrap: 'wrap',
          }}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Filter: All"
            style={[
              styles.walletChip,
              {
                backgroundColor: !walletFilter && !groupFilter ? theme.primary : theme.surfaceLight,
                borderColor: !walletFilter && !groupFilter ? theme.primary : theme.border,
              },
            ]}
            onPress={() => {
              setWalletFilter(null);
              setGroupFilter(null);
            }}
          >
            <Text
              style={[
                styles.walletChipText,
                { color: !walletFilter && !groupFilter ? '#FFF' : theme.text },
              ]}
            >
              {t('common.all')}
            </Text>
          </TouchableOpacity>
          {wallets.map((w) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={w.id}
              accessibilityLabel={`Filter by wallet: ${w.name}`}
              style={[
                styles.walletChip,
                {
                  backgroundColor: walletFilter === w.id ? theme.primary : theme.surfaceLight,
                  borderColor: walletFilter === w.id ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setWalletFilter(walletFilter === w.id ? null : w.id)}
            >
              <Text
                style={[
                  styles.walletChipText,
                  { color: walletFilter === w.id ? '#FFF' : theme.text },
                ]}
              >
                {w.name}
              </Text>
            </TouchableOpacity>
          ))}
          {groups.map((g) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={g}
              accessibilityLabel={`Filter by group: ${g}`}
              style={[
                styles.walletChip,
                {
                  backgroundColor: groupFilter === g ? theme.accent : theme.surfaceLight,
                  borderColor: groupFilter === g ? theme.accent : theme.border,
                },
              ]}
              onPress={() => setGroupFilter(groupFilter === g ? null : g)}
            >
              <Text
                style={[styles.walletChipText, { color: groupFilter === g ? '#FFF' : theme.text }]}
              >
                📁 {g === 'Ungrouped' ? t('dashboard.ungrouped') : g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!canAdd && miners.length > 0 && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Pro"
          style={styles.upgradeBanner}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.upgradeBannerText}>🔒 {t('dashboard.upgradePro')}</Text>
        </TouchableOpacity>
      )}

      <ErrorBanner message={error} onDismiss={clearError} onRetry={loadMiners} />

      {scanning && (
        <View style={styles.scanningBanner}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={styles.scanningText}>
            {t('dashboard.scanning', {
              scanned: scanProgress?.scanned || 0,
              total: scanProgress?.total || 254,
            })}
          </Text>
        </View>
      )}

      {!initialized || (loading && miners.length === 0) ? (
        <View style={{ paddingTop: 8 }}>
          <SkeletonCard rows={4} />
          <SkeletonCard rows={4} />
          <SkeletonCard rows={4} />
        </View>
      ) : miners.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⬡</Text>
          <Text style={styles.emptyTitle}>{t('dashboard.noMiners')}</Text>
          <Text style={styles.emptyText}>{t('dashboard.noMinersBody')}</Text>
          <View style={styles.emptySteps}>
            <Text style={styles.stepText}>{t('dashboard.step1')}</Text>
            <Text style={styles.stepText}>{t('dashboard.step2')}</Text>
            <Text style={styles.stepText}>{t('dashboard.step3')}</Text>
          </View>
          <View style={styles.emptyActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Add Miner"
              style={styles.primaryBtn}
              onPress={handleAddMiner}
            >
              <Text style={styles.primaryBtnText}>{t('dashboard.addMiner')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Scan Network"
              style={styles.secondaryBtn}
              onPress={scanNetwork}
            >
              <Text style={styles.secondaryBtnText}>{t('dashboard.scanNetwork')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredMiners}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MinerCard
              miner={item}
              onPress={handleMinerPress}
              onDelete={() =>
                useToastStore.getState().showUndo({
                  id: `delete-${item.id}`,
                  message: t('dashboard.minerRemoved', { name: item.name }),
                  onUndo: () => {},
                  onConfirm: () => useMinerStore.getState().removeMiner(item.id),
                })
              }
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
              progressBackgroundColor={theme.surface}
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          windowSize={7}
          maxToRenderPerBatch={10}
          removeClippedSubviews
        />
      )}

      {selectionMode && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>
            {t('comparison.nSelected', { count: selectedIds.size })}
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Batch group"
              style={styles.batchBtn}
              onPress={handleBatchGroup}
            >
              <Text style={styles.batchBtnText}>{t('dashboard.group')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Batch wallet"
              style={styles.batchBtn}
              onPress={() => setShowWalletPicker(true)}
            >
              <Text style={styles.batchBtnText}>{t('dashboard.wallet')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Batch delete"
              style={[styles.batchBtn, styles.batchDeleteBtn]}
              onPress={handleBatchDelete}
            >
              <Text style={[styles.batchBtnText, styles.batchDeleteText]}>
                {t('common.delete')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Compare"
              style={[styles.compareBtn, selectedIds.size < 2 && styles.compareBtnDisabled]}
              disabled={selectedIds.size < 2}
              onPress={() => {
                navigation.navigate('MinerComparison', {
                  minerIds: Array.from(selectedIds),
                });
                clearSelection();
              }}
            >
              <Text style={styles.compareBtnText}>{t('comparison.compare')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        visible={showWalletPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWalletPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWalletPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('dashboard.assignWallet')}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="No wallet"
              style={styles.modalOption}
              onPress={() => handleBatchWallet(undefined)}
            >
              <Text style={styles.modalOptionText}>{t('dashboard.noWallet')}</Text>
            </TouchableOpacity>
            {wallets.map((w) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={w.id}
                accessibilityLabel={`Assign wallet: ${w.name}`}
                style={styles.modalOption}
                onPress={() => handleBatchWallet(w.id)}
              >
                <View style={[styles.walletDot, { backgroundColor: w.color }]} />
                <Text style={styles.modalOptionText}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Add miner"
        style={[styles.fab, !canAdd && styles.fabDisabled]}
        onPress={handleAddMiner}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
