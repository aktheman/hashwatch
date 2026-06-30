import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  StyleSheet,
  AppState,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMinerStore } from '../store/miners';
import { useToastStore } from '../store/toast';
import { useSubscriptionStore } from '../store/subscription';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { MinerCard } from '../components/MinerCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { EarningsCard } from '../components/EarningsCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { Miner, Wallet, NavigationProp } from '../types';
import {
  toHashesPerSecond,
  formatHashrateValue,
  getBTCPrice,
  getNetworkHashrate,
  formatHashrateWithUnit,
} from '../utils/hashrate';
import { useTheme, setThemeMode, getThemeMode } from '../theme';
import { exportAllData } from '../utils/export';
import { checkMinerAlerts } from '../services/notifications';
import { MetricTile, ProfitabilityCard } from '../components/DashboardComponents';
import { WorldMap } from '../components/WorldMap';
import { TimeAgo } from '../components/TimeAgo';
import * as DB from '../db/database';
import {
  DashboardCustomizer,
  SectionKey,
  DEFAULT_VISIBLE,
} from '../components/DashboardCustomizer';

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
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [expandedPool, setExpandedPool] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [autoGroupBy, setAutoGroupBy] = useState<null | 'location' | 'tag'>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Record<SectionKey, boolean>>({
    ...DEFAULT_VISIBLE,
  });
  const [powerCost, setPowerCost] = useState(0);

  const groups = useMemo(() => {
    const gs = new Set(miners.map((m) => m.group).filter(Boolean) as string[]);
    const sorted = Array.from(gs).sort();
    if (miners.some((m) => !m.group)) {
      sorted.push('Ungrouped');
    }
    return sorted;
  }, [miners]);

  const locations = useMemo(
    () => [...new Set(miners.map((m) => m.location).filter(Boolean))] as string[],
    [miners],
  );
  const allTags = useMemo(() => [...new Set(miners.flatMap((m) => m.tags || []))], [miners]);

  const [kioskMode, setKioskMode] = useState(false);

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
    DB.getSetting('dashboard_sections').then((saved) => {
      if (saved) {
        try {
          setVisibleSections({ ...DEFAULT_VISIBLE, ...JSON.parse(saved) });
        } catch {}
      }
    });
    DB.getSetting('kiosk_mode').then((v) => {
      if (v === 'true') setKioskMode(true);
    });
    DB.getSetting('power_cost').then((v) => {
      setPowerCost(parseFloat(v || '0') || 0);
    });
  }, []);

  const filteredMiners = useMemo(
    () =>
      miners.filter((m) => {
        if (walletFilter && m.walletId !== walletFilter) return false;
        if (groupFilter === 'Ungrouped' && m.group) return false;
        if (groupFilter && groupFilter !== 'Ungrouped' && m.group !== groupFilter) return false;
        if (locationFilter && m.location !== locationFilter) return false;
        if (tagFilter && !(m.tags || []).includes(tagFilter)) return false;
        return true;
      }),
    [miners, walletFilter, groupFilter, locationFilter, tagFilter],
  );

  const pollingIntervalRef = useRef(30000);
  const stopPollingRef = useRef<(() => void) | null>(null);

  const restartPolling = useCallback(
    (interval: number) => {
      if (stopPollingRef.current) stopPollingRef.current();
      pollingIntervalRef.current = interval;
      stopPollingRef.current = startPolling(interval);
    },
    [startPolling],
  );

  useEffect(() => {
    initSubscription();
    loadMiners();
    stopPollingRef.current = startPolling(30000);
    pollingIntervalRef.current = 30000;
    const autoScanInterval = setInterval(async () => {
      const v = await DB.getSetting('auto_scan');
      if (v === 'true' && !useMinerStore.getState().scanning) {
        scanNetwork();
      }
    }, 300000);
    return () => {
      stopPollingRef.current?.();
      clearInterval(autoScanInterval);
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const interval = state === 'active' ? 5000 : 30000;
      if (interval !== pollingIntervalRef.current) {
        restartPolling(interval);
      }
    });
    return () => sub.remove();
  }, [restartPolling]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectionMode) {
        setSelectionMode(false);
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [selectionMode]);

  const prevMiners = useRef(miners);
  useEffect(() => {
    const prev = prevMiners.current;
    prevMiners.current = miners;
    if (prev.length > 0 || miners.length > 0) {
      checkMinerAlerts(prev, miners);
    }
  }, [miners]);

  const { metrics, uptimeChartData, totalHashrate, totalPower, avgTemp } =
    useDashboardMetrics(filteredMiners);

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

  const handleToggleKiosk = useCallback((val: boolean) => {
    setKioskMode(val);
    DB.setSetting('kiosk_mode', String(val));
  }, []);

  const handleToggleSection = useCallback((key: SectionKey) => {
    setVisibleSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      DB.setSetting('dashboard_sections', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleResetSections = useCallback(() => {
    setVisibleSections({ ...DEFAULT_VISIBLE });
    DB.setSetting('dashboard_sections', JSON.stringify(DEFAULT_VISIBLE));
  }, []);

  const handleApplyPreset = useCallback((sections: Record<SectionKey, boolean>) => {
    setVisibleSections({ ...sections });
    DB.setSetting('dashboard_sections', JSON.stringify(sections));
  }, []);

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

  type GroupedItem =
    | { type: 'header'; group: string; miners: Miner[] }
    | { type: 'miner'; miner: Miner };

  const renderGroupedItem = useCallback(
    ({ item }: { item: GroupedItem }) => {
      if (item.type === 'header') {
        const totalHash = item.miners.reduce(
          (sum, m) => sum + toHashesPerSecond(m.status?.hashRate ?? 0, m.status?.hashRateUnit),
          0,
        );
        const withTemp = item.miners.filter((m) => m.status?.temperature);
        const avgT =
          withTemp.length > 0
            ? withTemp.reduce((sum, m) => sum + (m.status?.temperature ?? 0), 0) / withTemp.length
            : 0;
        const isCollapsed = collapsedGroups.has(item.group);
        return (
          <Pressable
            onPress={() =>
              setCollapsedGroups((prev) => {
                const next = new Set(prev);
                if (next.has(item.group)) next.delete(item.group);
                else next.add(item.group);
                return next;
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`${item.group} group, ${item.miners.length} miners`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 10,
              backgroundColor: theme.surfaceLight,
              marginTop: 8,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          >
            <Text style={{ color: theme.primary, fontSize: 10, marginRight: 6, width: 12 }}>
              {isCollapsed ? '▶' : '▼'}
            </Text>
            <Text
              style={{ color: theme.text, fontSize: 13, fontWeight: '700', flex: 1 }}
              numberOfLines={1}
            >
              {item.group}
            </Text>
            <Text style={{ color: theme.textDim, fontSize: 10, marginRight: 8 }}>
              {item.miners.length} miner{item.miners.length !== 1 ? 's' : ''}
            </Text>
            {totalHash > 0 && (
              <Text
                style={{ color: theme.primary, fontSize: 11, fontWeight: '600', marginRight: 8 }}
              >
                {formatHashrateValue(totalHash)}
              </Text>
            )}
            {avgT > 0 && (
              <Text
                style={{
                  color: avgT > 70 ? theme.danger : theme.success,
                  fontSize: 11,
                  fontWeight: '600',
                }}
              >
                {avgT.toFixed(0)}°
              </Text>
            )}
          </Pressable>
        );
      }
      const m = item.miner;
      return (
        <MinerCard
          miner={m}
          onPress={handleMinerPress}
          onRename={(id, name) => useMinerStore.getState().setMinerName(id, name)}
          onDelete={() =>
            useToastStore.getState().showUndo({
              id: `delete-${m.id}`,
              message: t('dashboard.minerRemoved', { name: m.name }),
              onUndo: () => {},
              onConfirm: () => useMinerStore.getState().removeMiner(m.id),
            })
          }
        />
      );
    },
    [handleMinerPress, t, collapsedGroups, theme],
  );

  const canAdd = canAddMiner(miners.length);

  const formatTotal = (hashesPerSecond: number) => formatHashrateValue(hashesPerSecond);

  const btcPrice = getBTCPrice();
  const networkHashrate = getNetworkHashrate();

  const lastRefreshTime = useMemo(() => {
    const times = miners.map((m) => m.lastSeen).filter(Boolean) as number[];
    if (times.length === 0) return null;
    return Math.max(...times);
  }, [miners]);

  const poolInfo = useMemo(() => {
    const pools = new Map<
      string,
      { accepted: number; rejected: number; miners: number; responseTime: number }
    >();
    for (const m of miners) {
      if (!m.status?.pool) continue;
      const key = m.status.pool;
      if (!pools.has(key)) {
        pools.set(key, { accepted: 0, rejected: 0, miners: 0, responseTime: 0 });
      }
      const entry = pools.get(key)!;
      entry.accepted += m.status.sharesAccepted || 0;
      entry.rejected += m.status.sharesRejected || 0;
      entry.miners += 1;
      entry.responseTime = Math.max(entry.responseTime, m.status.poolResponseTime || 0);
    }
    return pools;
  }, [miners]);

  const [sortBy, setSortBy] = useState<'name' | 'hashrate' | 'temp'>('name');
  const sortedMiners = useMemo(() => {
    const list = [...filteredMiners];
    switch (sortBy) {
      case 'hashrate':
        list.sort((a, b) => (b.status?.hashRate ?? 0) - (a.status?.hashRate ?? 0));
        break;
      case 'temp':
        list.sort((a, b) => (b.status?.temperature ?? 0) - (a.status?.temperature ?? 0));
        break;
      default:
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return list;
  }, [filteredMiners, sortBy]);

  const groupedMiners = useMemo(() => {
    const groups = new Map<string, Miner[]>();
    for (const m of sortedMiners) {
      let key: string;
      if (autoGroupBy === 'location') {
        key = m.location || 'Ungrouped';
      } else if (autoGroupBy === 'tag') {
        key = (m.tags && m.tags[0]) || 'Ungrouped';
      } else {
        key = m.group || 'Ungrouped';
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }
    const items: (
      | { type: 'header'; group: string; miners: Miner[] }
      | { type: 'miner'; miner: Miner }
    )[] = [];
    for (const [group, miners] of groups) {
      items.push({ type: 'header', group, miners });
      if (!collapsedGroups.has(group)) {
        for (const m of miners) items.push({ type: 'miner', miner: m });
      }
    }
    return items;
  }, [sortedMiners, collapsedGroups, autoGroupBy]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        headerBar: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
        },
        headerTitle: {
          color: theme.text,
          fontSize: 30,
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
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: theme.surfaceLight,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: theme.primaryLight,
        },
        settingsIcon: {
          fontSize: 20,
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

  const Outer = Platform.OS === 'web' ? ScrollView : View;
  const outerProps =
    Platform.OS === 'web'
      ? { style: styles.container, contentContainerStyle: { paddingBottom: 80 } }
      : { style: styles.container };

  return (
    <Outer {...outerProps}>
      {kioskMode ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exit kiosk mode"
          style={{
            position: 'absolute',
            top: 50,
            right: 12,
            zIndex: 100,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.textMuted + '40',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => {
            Alert.alert('Exit Kiosk', 'Tap "Exit" to leave kiosk mode.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Exit', onPress: () => handleToggleKiosk(false) },
            ]);
          }}
        >
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>✕</Text>
        </Pressable>
      ) : (
        <View style={styles.headerBar}>
          {selectionMode ? (
            <>
              <Text style={[styles.headerTitle, { textAlign: 'center' }]}>HashWatch</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel selection"
                style={[styles.settingsBtn, { position: 'absolute', right: 20 }]}
                onPress={() => {
                  setSelectionMode(false);
                  setSelectedIds(new Set());
                }}
              >
                <Text style={styles.settingsIcon}>{t('common.cancel')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Compare miners"
                style={[styles.settingsBtn, { position: 'absolute', left: 20 }]}
                onPress={() => setSelectionMode(true)}
              >
                <Text style={styles.settingsIcon}>⇄</Text>
              </Pressable>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.headerTitle, { textAlign: 'center' }]}>HashWatch</Text>
                <Text style={styles.headerSub}>
                  <Text style={styles.liveDot}>●</Text> live monitor
                </Text>
              </View>
              <View style={{ position: 'absolute', right: 20, flexDirection: 'row', gap: 6 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Customize dashboard"
                  style={[styles.settingsBtn, { width: 36, height: 36 }]}
                  onPress={() => setShowCustomizer(true)}
                >
                  <Text style={styles.settingsIcon}>✎</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Export data"
                  style={[styles.settingsBtn, { width: 36, height: 36 }]}
                  onPress={() => exportAllData()}
                >
                  <Text style={styles.settingsIcon}>↓</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Switch theme"
                  style={[styles.settingsBtn, { width: 36, height: 36 }]}
                  onPress={() => {
                    const modes = ['dark', 'neon', 'matrix', '5tratum', 'light'] as const;
                    const current = getThemeMode();
                    const idx = modes.indexOf(current as (typeof modes)[number]);
                    setThemeMode(modes[(idx + 1) % modes.length]);
                  }}
                >
                  <Text style={styles.settingsIcon}>🎨</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  style={[styles.settingsBtn, { width: 36, height: 36 }]}
                  onPress={() => navigation.navigate('Settings')}
                >
                  <Text style={styles.settingsIcon}>⚙</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {visibleSections.earnings && miners.length > 0 && <EarningsCard miners={miners} />}

      {visibleSections.ticker && miners.length > 0 && (
        <View
          style={{
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.success,
                opacity: 0.8,
              }}
            />
            <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '600' }}>
              BTC ${btcPrice.toLocaleString()}
            </Text>
            <Text style={{ color: theme.textDim, fontSize: 11 }}>·</Text>
            <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '600' }}>
              {formatHashrateWithUnit(networkHashrate, 'H/s')}/s
            </Text>
          </View>
          <TimeAgo timestamp={lastRefreshTime} style={{ color: theme.textDim, fontSize: 10 }} />
        </View>
      )}

      {visibleSections.map && (
        <View style={{ paddingHorizontal: 16, gap: 10, marginTop: 4, alignItems: 'center' }}>
          <WorldMap />
        </View>
      )}

      {visibleSections.legend && miners.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 16,
            paddingHorizontal: 16,
            marginTop: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.primaryLight,
                opacity: 0.85,
              }}
            />
            <Text style={{ color: theme.textDim, fontSize: 9 }}>online</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.textMuted,
                opacity: 0.85,
              }}
            />
            <Text style={{ color: theme.textDim, fontSize: 9 }}>offline</Text>
          </View>
          {miners.filter((m) => m.status?.pool).length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.info }} />
              <Text style={{ color: theme.textDim, fontSize: 9 }}>pool</Text>
            </View>
          )}
        </View>
      )}

      {visibleSections.pools && miners.length > 0 && poolInfo.size > 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: 6, gap: 4 }}>
          {Array.from(poolInfo.entries()).map(([pool, info]) => {
            const isExpanded = expandedPool === pool;
            const totalShares = info.accepted + info.rejected;
            const rejectRate =
              totalShares > 0 ? ((info.rejected / totalShares) * 100).toFixed(1) : '0.0';
            const poolMiners = miners.filter((m) => m.status?.pool === pool);
            return (
              <View key={pool}>
                <Pressable
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: theme.surface,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={() => setExpandedPool(isExpanded ? null : pool)}
                  accessibilityRole="button"
                  accessibilityLabel={`${pool} pool details`}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}
                      numberOfLines={1}
                    >
                      {pool.replace(/^stratum\+tcp:\/\//, '').split(':')[0]}
                    </Text>
                    <Text style={{ color: theme.textDim, fontSize: 10 }}>
                      {info.miners} miner{info.miners > 1 ? 's' : ''} · {info.responseTime}ms ·{' '}
                      {rejectRate}% rejected
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
                    <Text style={{ color: theme.success, fontSize: 12, fontWeight: '700' }}>
                      +{info.accepted}
                    </Text>
                    {info.rejected > 0 && (
                      <Text style={{ color: theme.danger, fontSize: 11 }}>-{info.rejected}</Text>
                    )}
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 10, marginLeft: 6 }}>
                    {isExpanded ? '▲' : '▼'}
                  </Text>
                </Pressable>
                {isExpanded && (
                  <View
                    style={{
                      backgroundColor: theme.surfaceLight,
                      borderRadius: 10,
                      marginTop: 2,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    {poolMiners.map((pm) => (
                      <View
                        key={pm.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{ color: theme.text, fontSize: 12, fontWeight: '600', flex: 1 }}
                          numberOfLines={1}
                        >
                          {pm.name}
                        </Text>
                        <Text style={{ color: theme.success, fontSize: 11, marginHorizontal: 8 }}>
                          +{pm.status?.sharesAccepted ?? 0}
                        </Text>
                        <Text style={{ color: theme.danger, fontSize: 11 }}>
                          -{pm.status?.sharesRejected ?? 0}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
          {poolInfo.size > 2 && expandedPool === null && (
            <Text
              style={{
                color: theme.textMuted,
                fontSize: 10,
                textAlign: 'center',
                paddingVertical: 2,
              }}
            >
              +{poolInfo.size - 2} more pool{poolInfo.size - 2 > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}

      {visibleSections.metrics && (
        <View style={{ paddingHorizontal: 16, gap: 14, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <MetricTile
                title={String(t('dashboard.hashrate'))}
                value={formatTotal(totalHashrate)}
                unit="H/s"
                accent="info"
                trend={metrics.hashrateTrend}
                chart={metrics.recentHashrates.length > 0 ? 'sparkline' : undefined}
                chartData={metrics.recentHashrates}
                size="lg"
              />
            </View>
            <View style={{ flex: 1 }}>
              <MetricTile
                title={String(t('dashboard.efficiency'))}
                value={metrics.efficiencyPct > 0 ? metrics.efficiencyPct.toFixed(1) : '—'}
                unit="%"
                accent={metrics.efficiencyPct > 50 ? 'success' : 'warning'}
                chart="donut"
                size="lg"
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <MetricTile
                title={String(t('dashboard.power'))}
                value={`${totalPower.toFixed(1)}`}
                unit="W"
                accent="warning"
                trend={metrics.powerTrend}
                chart={metrics.recentPower.length > 0 ? 'bars' : undefined}
                chartData={metrics.recentPower}
                size="lg"
              />
            </View>
            <View style={{ flex: 1 }}>
              <MetricTile
                title={String(t('dashboard.temp'))}
                value={avgTemp > 0 ? `${avgTemp.toFixed(0)}°` : '—°'}
                accent={avgTemp > 70 ? 'danger' : 'success'}
                chart="gauge"
                size="lg"
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <MetricTile
                title={String(t('dashboard.uptime'))}
                value={
                  metrics.uptimeAvg > 0
                    ? `${Math.round((metrics.uptimeAvg / 86400) * 100) / 100}d`
                    : '—'
                }
                accent="primary"
                chart={metrics.recentUptimes.length > 0 ? 'sparkline' : undefined}
                chartData={uptimeChartData}
                size="lg"
              />
            </View>
            <View style={{ flex: 1 }}>
              <MetricTile
                title={String(t('dashboard.workers'))}
                value={String(filteredMiners.length)}
                unit="active"
                accent="info"
                trend={metrics.workerTrend}
                size="lg"
              />
            </View>
          </View>
        </View>
      )}

      {visibleSections.profitability && miners.length > 0 && (
        <ProfitabilityCard miners={filteredMiners} powerCost={powerCost} />
      )}

      {!kioskMode &&
        visibleSections.filters &&
        (wallets.length > 0 || groups.length > 0 || locations.length > 0 || allTags.length > 0) && (
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: 16,
              gap: 6,
              marginBottom: 6,
              flexWrap: 'wrap',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filter: All"
              style={[
                styles.walletChip,
                {
                  backgroundColor:
                    !walletFilter && !groupFilter && !locationFilter && !tagFilter
                      ? theme.primary
                      : theme.surfaceLight,
                  borderColor:
                    !walletFilter && !groupFilter && !locationFilter && !tagFilter
                      ? theme.primary
                      : theme.border,
                },
              ]}
              onPress={() => {
                setWalletFilter(null);
                setGroupFilter(null);
                setLocationFilter(null);
                setTagFilter(null);
              }}
            >
              <Text
                style={[
                  styles.walletChipText,
                  {
                    color:
                      !walletFilter && !groupFilter && !locationFilter && !tagFilter
                        ? '#FFF'
                        : theme.text,
                  },
                ]}
              >
                {t('common.all')}
              </Text>
            </Pressable>
            {wallets.map((w) => (
              <Pressable
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
              </Pressable>
            ))}
            {groups.map((g) => (
              <Pressable
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
                  style={[
                    styles.walletChipText,
                    { color: groupFilter === g ? '#FFF' : theme.text },
                  ]}
                >
                  📁 {g === 'Ungrouped' ? t('dashboard.ungrouped') : g}
                </Text>
              </Pressable>
            ))}
            {locations.map((loc) => (
              <Pressable
                accessibilityRole="button"
                key={loc}
                accessibilityLabel={`Filter by location: ${loc}`}
                style={[
                  styles.walletChip,
                  {
                    backgroundColor: locationFilter === loc ? theme.primary : theme.surfaceLight,
                    borderColor: locationFilter === loc ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setLocationFilter(locationFilter === loc ? null : loc)}
              >
                <Text
                  style={[
                    styles.walletChipText,
                    { color: locationFilter === loc ? '#FFF' : theme.text },
                  ]}
                >
                  📍 {loc}
                </Text>
              </Pressable>
            ))}
            {allTags.map((tag) => (
              <Pressable
                accessibilityRole="button"
                key={tag}
                accessibilityLabel={`Filter by tag: ${tag}`}
                style={[
                  styles.walletChip,
                  {
                    backgroundColor: tagFilter === tag ? theme.accent : theme.surfaceLight,
                    borderColor: tagFilter === tag ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => setTagFilter(tagFilter === tag ? null : tag)}
              >
                <Text
                  style={[
                    styles.walletChipText,
                    { color: tagFilter === tag ? '#FFF' : theme.text },
                  ]}
                >
                  🏷️ {tag}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

      {!kioskMode && visibleSections.sort && miners.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 16,
            marginBottom: 4,
          }}
        >
          <Text style={{ color: theme.textDim, fontSize: 10, fontWeight: '600' }}>Sort:</Text>
          {(['name', 'hashrate', 'temp'] as const).map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${s}`}
              onPress={() => setSortBy(s)}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: sortBy === s ? theme.primaryLight : theme.surface,
                borderWidth: 1,
                borderColor: sortBy === s ? theme.primaryLight : theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: sortBy === s ? '#FFF' : theme.textMuted,
                }}
              >
                {s === 'name' ? 'Name' : s === 'hashrate' ? 'Hashrate' : 'Temp'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {!kioskMode && visibleSections.sort && miners.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 16,
            marginBottom: 4,
          }}
        >
          <Text style={{ color: theme.textDim, fontSize: 10, fontWeight: '600' }}>Group:</Text>
          {([null, 'location', 'tag'] as const).map((g) => (
            <Pressable
              key={g ?? 'off'}
              accessibilityRole="button"
              onPress={() => setAutoGroupBy(g)}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: autoGroupBy === g ? theme.accent : theme.surface,
                borderWidth: 1,
                borderColor: autoGroupBy === g ? theme.accent : theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: autoGroupBy === g ? '#FFF' : theme.textMuted,
                }}
              >
                {g === null ? 'Off' : g === 'location' ? '📍 Loc' : '🏷️ Tag'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {!canAdd && miners.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Pro"
          style={styles.upgradeBanner}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.upgradeBannerText}>🔒 {t('dashboard.upgradePro')}</Text>
        </Pressable>
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add Miner"
              style={styles.primaryBtn}
              onPress={handleAddMiner}
            >
              <Text style={styles.primaryBtnText}>{t('dashboard.addMiner')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan Network"
              style={styles.secondaryBtn}
              onPress={scanNetwork}
            >
              <Text style={styles.secondaryBtnText}>{t('dashboard.scanNetwork')}</Text>
            </Pressable>
          </View>
        </View>
      ) : Platform.OS === 'web' ? (
        <View style={styles.list}>
          {groupedMiners.map((item) => (
            <View key={item.type === 'header' ? `header-${item.group}` : `miner-${item.miner.id}`}>
              {renderGroupedItem({ item })}
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={groupedMiners}
          keyExtractor={(item) =>
            item.type === 'header' ? `header-${item.group}` : `miner-${item.miner.id}`
          }
          renderItem={renderGroupedItem}
          initialNumToRender={8}
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

      {!kioskMode && selectionMode && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>
            {t('comparison.nSelected', { count: selectedIds.size })}
          </Text>
          <View style={styles.selectionActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Batch group"
              style={styles.batchBtn}
              onPress={handleBatchGroup}
            >
              <Text style={styles.batchBtnText}>{t('dashboard.group')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Batch wallet"
              style={styles.batchBtn}
              onPress={() => setShowWalletPicker(true)}
            >
              <Text style={styles.batchBtnText}>{t('dashboard.wallet')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Batch delete"
              style={[styles.batchBtn, styles.batchDeleteBtn]}
              onPress={handleBatchDelete}
            >
              <Text style={[styles.batchBtnText, styles.batchDeleteText]}>
                {t('common.delete')}
              </Text>
            </Pressable>
            <Pressable
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
            </Pressable>
          </View>
        </View>
      )}

      <Modal
        visible={showWalletPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWalletPicker(false)}
        testID="wallet-picker-modal"
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowWalletPicker(false)}
          accessibilityLabel="Close wallet picker"
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('dashboard.assignWallet')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="No wallet"
              style={styles.modalOption}
              onPress={() => handleBatchWallet(undefined)}
            >
              <Text style={styles.modalOptionText}>{t('dashboard.noWallet')}</Text>
            </Pressable>
            {wallets.map((w) => (
              <Pressable
                accessibilityRole="button"
                key={w.id}
                accessibilityLabel={`Assign wallet: ${w.name}`}
                style={styles.modalOption}
                onPress={() => handleBatchWallet(w.id)}
              >
                <View style={[styles.walletDot, { backgroundColor: w.color }]} />
                <Text style={styles.modalOptionText}>{w.name}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <DashboardCustomizer
        visible={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        visibleSections={visibleSections}
        onToggle={handleToggleSection}
        onReset={handleResetSections}
        onApplyPreset={handleApplyPreset}
        kioskMode={kioskMode}
        onToggleKiosk={handleToggleKiosk}
      />

      {!kioskMode && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add miner"
          style={[styles.fab, !canAdd && styles.fabDisabled]}
          onPress={handleAddMiner}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      )}
    </Outer>
  );
}
