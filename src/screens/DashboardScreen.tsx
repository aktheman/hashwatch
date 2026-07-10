import { useEffect, useCallback, useState, useMemo, useRef, lazy, Suspense } from 'react';
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
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMinerStore } from '../store/miners';
import { useToastStore } from '../store/toast';
import { useSubscriptionStore } from '../store/subscription';
import { useDashboardMetrics, TimeRange } from '../hooks/useDashboardMetrics';
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
import { spacing, radius, fontSize, fontWeight, buttonText, cardShadow } from '../utils/design';
import { exportAllData } from '../utils/export';
import { BitAxeClient } from '../api/bitaxe';
import { LATEST_FIRMWARE, getFirmwareBinaryUrl } from '../utils/version';
import { MetricTile, ProfitabilityCard } from '../components/DashboardComponents';
import { MinerDrillDownModal } from '../components/MinerDrillDownModal';
import { TimeAgo } from '../components/TimeAgo';

const LazyWorldMap = lazy(() =>
  import('../components/WorldMap').then((m) => ({ default: m.WorldMap })),
);
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
  const minerErrors = useMinerStore((s) => s.minerErrors);
  const loadMiners = useMinerStore((s) => s.loadMiners);
  const startPolling = useMinerStore((s) => s.startPolling);
  const scanNetwork = useMinerStore((s) => s.scanNetwork);
  const clearError = useMinerStore((s) => s.clearError);
  const clearMinerErrors = useMinerStore((s) => s.clearMinerErrors);
  const lastRefreshTimestamp = useMinerStore((s) => s.lastRefreshTimestamp);
  const removeMiner = useMinerStore((s) => s.removeMiner);
  const setMinerGroup = useMinerStore((s) => s.setMinerGroup);
  const setMinerWallet = useMinerStore((s) => s.setMinerWallet);
  const setMinerLocation = useMinerStore((s) => s.setMinerLocation);
  const canAddMiner = useSubscriptionStore((s) => s.canAddMiner);
  const initSubscription = useSubscriptionStore((s) => s.initialize);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletFilter, setWalletFilter] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [groupPickerInput, setGroupPickerInput] = useState('');
  const [expandedPool, setExpandedPool] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [autoGroupBy, setAutoGroupBy] = useState<null | 'location' | 'tag'>(null);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [drillDown, setDrillDown] = useState<{
    metricType: 'hashrate' | 'power' | 'uptime' | 'temp';
    title: string;
  } | null>(null);
  const TIME_RANGE_OPTIONS: { key: TimeRange; label: string }[] = [
    { key: '1h', label: '1H' },
    { key: '6h', label: '6H' },
    { key: '24h', label: '24H' },
    { key: '7d', label: '7D' },
  ];

  useEffect(() => {
    import('../db/database').then((DB) =>
      DB.getSetting('groups_order').then((raw) => {
        if (raw) {
          try {
            const p = JSON.parse(raw);
            if (Array.isArray(p)) setGroupOrder(p);
          } catch {
            /* ignore */
          }
        }
      }),
    );
  }, []);
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
        if (statusFilter === 'online' && !m.isOnline) return false;
        if (statusFilter === 'offline' && m.isOnline) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const nameMatch = (m.name || '').toLowerCase().includes(q);
          const ipMatch = m.ip.toLowerCase().includes(q);
          if (!nameMatch && !ipMatch) return false;
        }
        return true;
      }),
    [miners, walletFilter, groupFilter, locationFilter, tagFilter, statusFilter, searchQuery],
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
    if (
      typeof autoScanInterval === 'object' &&
      autoScanInterval !== null &&
      'unref' in autoScanInterval
    ) {
      (autoScanInterval as { unref: () => void }).unref();
    }
    const unsubReconnect = (async () => {
      try {
        const { onNetworkReconnect } = await import('../services/networkStatus');
        return onNetworkReconnect(() => {
          useMinerStore.getState().refreshAll();
        });
      } catch {
        return () => {};
      }
    })();
    return () => {
      stopPollingRef.current?.();
      clearInterval(autoScanInterval);
      unsubReconnect.then((fn) => fn());
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

  const { metrics, uptimeChartData, totalHashrate, totalPower, avgTemp } = useDashboardMetrics(
    filteredMiners,
    timeRange,
  );

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
    setGroupPickerInput('');
    setShowGroupPicker(true);
  }, [miners, selectedIds, setShowGroupPicker]);

  const handleBatchGroupAssign = useCallback(
    (name: string | undefined) => {
      const selected = miners.filter((m) => selectedIds.has(m.id));
      selected.forEach((m) => setMinerGroup(m.id, name));
      setShowGroupPicker(false);
    },
    [miners, selectedIds, setMinerGroup],
  );

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

  const LOCATIONS = ['Home', 'Office', 'Lab', 'Garage', 'Data Center', 'Mining Farm'];

  const handleBatchLocation = useCallback(
    (location: string | undefined) => {
      const selected = miners.filter((m) => selectedIds.has(m.id));
      selected.forEach((m) => setMinerLocation(m.id, location));
      setShowLocationPicker(false);
    },
    [miners, selectedIds, setMinerLocation],
  );

  const handleBatchFlash = useCallback(() => {
    const selected = miners.filter((m) => selectedIds.has(m.id));
    if (selected.length === 0) return;
    const target = LATEST_FIRMWARE;
    Alert.alert(
      t('dashboard.batchFlashTitle'),
      t('dashboard.batchFlashBody', { count: selected.length, version: target }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('dashboard.batchFlashConfirm'),
          style: 'default',
          onPress: async () => {
            let success = 0;
            let fail = 0;
            for (const m of selected) {
              try {
                const client = new BitAxeClient(
                  m.ip,
                  m.port,
                  m.apiPath ?? undefined,
                  m.statusPath ?? undefined,
                );
                const binUrl = getFirmwareBinaryUrl(target);
                const ok = await client.flashFirmware(binUrl);
                if (ok) success++;
                else fail++;
              } catch {
                fail++;
              }
            }
            Alert.alert(
              t('dashboard.batchFlashResult'),
              t('dashboard.batchFlashResultBody', { success, fail }),
            );
            clearSelection();
          },
        },
      ],
    );
  }, [miners, selectedIds, clearSelection, t]);

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
    { type: 'header'; group: string; miners: Miner[] } | { type: 'miner'; miner: Miner };

  const handleRename = useCallback((id: string, name: string) => {
    useMinerStore.getState().setMinerName(id, name);
  }, []);

  const handleDelete = useCallback(
    (minerId: string, minerName: string) => {
      useToastStore.getState().showUndo({
        id: `delete-${minerId}`,
        message: t('dashboard.minerRemoved', { name: minerName }),
        onUndo: () => {},
        onConfirm: () => useMinerStore.getState().removeMiner(minerId),
      });
    },
    [t],
  );

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
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.xs,
              backgroundColor: theme.surfaceLight,
              marginTop: spacing.sm,
              borderTopLeftRadius: radius.md,
              borderTopRightRadius: radius.md,
            }}
          >
            <Text
              style={{
                color: theme.primary,
                fontSize: fontSize.xs,
                marginRight: spacing.xs,
                width: 12,
              }}
            >
              {isCollapsed ? '\u25B6' : '\u25BC'}
            </Text>
            <Text
              style={{
                color: theme.text,
                fontSize: fontSize.base,
                fontWeight: fontWeight.bold,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {item.group}
            </Text>
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs, marginRight: spacing.xs }}>
              {item.miners.length} miner{item.miners.length !== 1 ? 's' : ''}
            </Text>
            {totalHash > 0 && (
              <Text
                style={{
                  color: theme.primary,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  marginRight: spacing.xs,
                }}
              >
                {formatHashrateValue(totalHash)}
              </Text>
            )}
            {avgT > 0 && (
              <Text
                style={{
                  color: avgT > 70 ? theme.danger : theme.success,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {avgT.toFixed(0)}
                {'\u00B0'}
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
          onRename={handleRename}
          onDelete={() => handleDelete(m.id, m.name)}
        />
      );
    },
    [handleMinerPress, handleRename, handleDelete, collapsedGroups, theme],
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
      { type: 'header'; group: string; miners: Miner[] } | { type: 'miner'; miner: Miner }
    )[] = [];
    const orderedGroups = groupOrder.filter((g) => groups.has(g));
    const remaining = Array.from(groups.keys())
      .filter((g) => !orderedGroups.includes(g) && g !== 'Ungrouped')
      .sort((a, b) => a.localeCompare(b));
    const sortedKeys = [...orderedGroups, ...remaining];
    if (groups.has('Ungrouped')) sortedKeys.push('Ungrouped');
    for (const group of sortedKeys) {
      const miners = groups.get(group)!;
      items.push({ type: 'header', group, miners });
      if (!collapsedGroups.has(group)) {
        for (const m of miners) items.push({ type: 'miner', miner: m });
      }
    }
    return items;
  }, [sortedMiners, collapsedGroups, autoGroupBy, groupOrder]);

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
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xs,
        },
        headerTitle: {
          color: theme.text,
          fontSize: fontSize.h1,
          fontWeight: fontWeight.bold,
          letterSpacing: -0.5,
        },
        headerSub: {
          color: theme.textDim,
          fontSize: fontSize.xs,
          marginTop: spacing.xxs,
          flexDirection: 'row',
          alignItems: 'center',
        },
        liveDot: {
          color: theme.success,
          fontSize: fontSize.xs,
          marginRight: spacing.xxs,
        },
        settingsBtn: {
          width: 44,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: theme.surfaceLight,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: theme.primaryLight,
        },
        settingsIcon: {
          fontSize: fontSize.md,
        },
        summaryRow: {
          flexDirection: 'row',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xxs,
          gap: spacing.xs,
        },
        summaryCard: {
          flex: 1,
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          padding: spacing.sm,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.border,
          ...cardShadow(theme, 'sm'),
        },
        summaryIcon: {
          fontSize: fontSize.md,
          marginBottom: spacing.xxs,
        },
        summaryValue: {
          fontSize: fontSize.h2,
          fontWeight: fontWeight.bold,
          color: theme.text,
        },
        summaryLabel: {
          fontSize: fontSize.xs,
          color: theme.textDim,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: spacing.xxs,
        },
        upgradeBanner: {
          backgroundColor: theme.primary + '1A',
          borderWidth: 1,
          borderColor: theme.primary,
          borderRadius: radius.md,
          padding: spacing.sm,
          marginHorizontal: spacing.md,
          marginBottom: spacing.xs,
          alignItems: 'center',
        },
        upgradeBannerText: {
          color: theme.primaryLight,
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
        },
        scanningBanner: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          padding: spacing.sm,
          marginHorizontal: spacing.md,
          borderRadius: radius.md,
          gap: spacing.xs,
          marginBottom: spacing.xs,
        },
        scanningText: {
          color: theme.primaryLight,
          fontSize: fontSize.base,
          fontWeight: fontWeight.regular,
        },
        center: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xl,
        },
        loadingText: {
          color: theme.textDim,
          marginTop: spacing.sm,
          fontSize: fontSize.base,
          fontWeight: fontWeight.regular,
        },
        emptyIcon: {
          fontSize: fontSize.hero,
          color: theme.textMuted,
          marginBottom: spacing.md,
        },
        emptyTitle: {
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.xs,
        },
        emptyText: {
          color: theme.textDim,
          fontSize: fontSize.base,
          textAlign: 'center',
          marginBottom: spacing.md,
          lineHeight: 20,
        },
        emptySteps: {
          marginBottom: spacing.lg,
          gap: spacing.xxs,
        },
        stepText: {
          color: theme.textMuted,
          fontSize: fontSize.sm,
          textAlign: 'center',
        },
        emptyActions: {
          flexDirection: 'row',
          gap: spacing.md,
        },
        primaryBtn: {
          backgroundColor: theme.primary,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
        },
        primaryBtnText: {
          color: buttonText,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.md,
        },
        secondaryBtn: {
          backgroundColor: theme.surface,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        secondaryBtnText: {
          color: theme.text,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.md,
        },
        list: {
          paddingTop: spacing.xxs,
          paddingBottom: 80,
        },
        fab: {
          position: 'absolute',
          right: spacing.md,
          bottom: spacing.lg,
          width: spacing.xs,
          height: spacing.xs,
          borderRadius: radius.xxl,
          backgroundColor: theme.primary,
          justifyContent: 'center',
          alignItems: 'center',
          ...cardShadow(theme, 'lg'),
          borderWidth: 1,
          borderColor: theme.primaryLight + '40',
        },
        fabDisabled: {
          backgroundColor: theme.textMuted,
        },
        selectionBar: {
          position: 'absolute',
          bottom: spacing.lg,
          left: spacing.md,
          right: spacing.md,
          backgroundColor: theme.surface,
          borderRadius: radius.xxl,
          padding: spacing.sm,
          borderWidth: 1,
          borderColor: theme.primary + '40',
          ...cardShadow(theme, 'lg'),
          gap: spacing.xs,
        },
        selectionCount: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
          textAlign: 'center',
        },
        selectionActions: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: spacing.xxs,
        },
        batchBtn: {
          backgroundColor: theme.surfaceLight,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        batchBtnText: {
          color: theme.text,
          fontWeight: fontWeight.semibold,
          fontSize: fontSize.xs,
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
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xxs,
          borderRadius: radius.md,
        },
        compareBtnDisabled: {
          opacity: 0.4,
        },
        compareBtnText: {
          color: buttonText,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.xs,
        },
        timeRangeChip: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs + 2,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surfaceLight,
        },
        timeRangeChipText: {
          color: theme.text,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: theme.bg + '99',
          justifyContent: 'center',
          alignItems: 'center',
        },
        modalContent: {
          backgroundColor: theme.surface,
          borderRadius: radius.xxl,
          padding: spacing.md,
          width: '80%',
          maxWidth: 320,
          borderWidth: 1,
          borderColor: theme.border,
          gap: spacing.xxs,
        },
        modalTitle: {
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.xs,
        },
        modalOption: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.sm,
          borderRadius: radius.md,
          gap: spacing.sm,
        },
        modalOptionText: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.regular,
        },
        walletDot: {
          width: 12,
          height: 12,
          borderRadius: radius.sm,
        },
        fabText: {
          color: buttonText,
          fontSize: fontSize.hero,
          fontWeight: fontWeight.regular,
          lineHeight: 30,
        },
        walletChip: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.lg,
          borderWidth: 1,
        },
        walletChipText: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
        },
        groupInput: {
          backgroundColor: theme.surfaceLight,
          color: theme.text,
          fontSize: fontSize.md,
          padding: spacing.sm,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: theme.border,
          marginTop: spacing.xs,
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
            borderRadius: radius.md,
            backgroundColor: theme.textMuted + '40',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => {
            Alert.alert(t('dashboard.exitKioskTitle'), t('dashboard.exitKioskBody'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('dashboard.exitKioskExit'), onPress: () => handleToggleKiosk(false) },
            ]);
          }}
        >
          <Text style={{ color: theme.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
            ✕
          </Text>
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
                  <Text style={styles.liveDot}>●</Text> {t('dashboard.subtitle')}
                </Text>
              </View>
              <View
                style={{ position: 'absolute', right: 20, flexDirection: 'row', gap: spacing.xs }}
              >
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
            paddingHorizontal: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing.xs,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View
              style={{
                width: spacing.xs,
                height: spacing.xs,
                borderRadius: radius.xs,
                backgroundColor: theme.success,
                opacity: 0.8,
              }}
            />
            <Text
              style={{
                color: theme.textMuted,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
              }}
            >
              BTC ${btcPrice.toLocaleString()}
            </Text>
            <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>·</Text>
            <Text
              style={{
                color: theme.textMuted,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
              }}
            >
              {formatHashrateWithUnit(networkHashrate, 'H/s')}/s
            </Text>
          </View>
          <TimeAgo
            timestamp={lastRefreshTime}
            style={{ color: theme.textDim, fontSize: fontSize.xs }}
          />
        </View>
      )}

      {visibleSections.map && (
        <View
          style={{
            paddingHorizontal: spacing.md,
            gap: spacing.sm,
            marginTop: spacing.xxs,
            alignItems: 'center',
          }}
        >
          <Suspense fallback={null}>
            <LazyWorldMap />
          </Suspense>
        </View>
      )}

      {visibleSections.legend && miners.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.md,
            marginTop: spacing.xxs,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
            <View
              style={{
                width: spacing.xs,
                height: spacing.xs,
                borderRadius: radius.xs,
                backgroundColor: theme.primaryLight,
                opacity: 0.85,
              }}
            />
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('common.online')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
            <View
              style={{
                width: spacing.xs,
                height: spacing.xs,
                borderRadius: radius.xs,
                backgroundColor: theme.textMuted,
                opacity: 0.85,
              }}
            />
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('common.offline')}
            </Text>
          </View>
          {miners.filter((m) => m.status?.pool).length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
              <View
                style={{
                  width: spacing.xs,
                  height: spacing.xs,
                  borderRadius: radius.xs,
                  backgroundColor: theme.info,
                }}
              />
              <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
                {t('dashboard.pool')}
              </Text>
            </View>
          )}
        </View>
      )}

      {visibleSections.pools && miners.length > 0 && poolInfo.size > 0 && (
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.xs, gap: spacing.xxs }}>
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
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={() => setExpandedPool(isExpanded ? null : pool)}
                  accessibilityRole="button"
                  accessibilityLabel={`${pool} pool details`}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: fontSize.base,
                        fontWeight: fontWeight.bold,
                      }}
                      numberOfLines={1}
                    >
                      {pool.replace(/^stratum\+tcp:\/\//, '').split(':')[0]}
                    </Text>
                    <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
                      {t('dashboard.minersCount', { count: info.miners })} · {info.responseTime}ms ·{' '}
                      {t('dashboard.rejectedRate', { rate: rejectRate })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
                    <Text
                      style={{
                        color: theme.success,
                        fontSize: fontSize.base,
                        fontWeight: fontWeight.bold,
                      }}
                    >
                      +{info.accepted}
                    </Text>
                    {info.rejected > 0 && (
                      <Text style={{ color: theme.danger, fontSize: fontSize.xs }}>
                        -{info.rejected}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, marginLeft: 6 }}>
                    {isExpanded ? '▲' : '▼'}
                  </Text>
                </Pressable>
                {isExpanded && (
                  <View
                    style={{
                      backgroundColor: theme.surfaceLight,
                      borderRadius: 10,
                      marginTop: spacing.xxs,
                      padding: spacing.sm,
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
                          paddingVertical: spacing.xxs,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: fontSize.base,
                            fontWeight: fontWeight.semibold,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {pm.name}
                        </Text>
                        <Text
                          style={{
                            color: theme.success,
                            fontSize: fontSize.xs,
                            marginHorizontal: spacing.xs,
                          }}
                        >
                          +{pm.status?.sharesAccepted ?? 0}
                        </Text>
                        <Text style={{ color: theme.danger, fontSize: fontSize.xs }}>
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
                fontSize: fontSize.xs,
                textAlign: 'center',
                paddingVertical: spacing.xxs,
              }}
            >
              {t('dashboard.morePools', { count: poolInfo.size - 2 })}
            </Text>
          )}
        </View>
      )}

      {visibleSections.metrics && (
        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm, marginTop: spacing.xxs }}>
          <View style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' }}>
            {TIME_RANGE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                accessibilityRole="button"
                accessibilityLabel={`Time range: ${opt.label}`}
                onPress={() => setTimeRange(opt.key)}
                style={[
                  styles.timeRangeChip,
                  timeRange === opt.key && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
              >
                <Text
                  style={[styles.timeRangeChipText, timeRange === opt.key && { color: buttonText }]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
                onPress={() =>
                  setDrillDown({ metricType: 'hashrate', title: t('dashboard.hashrate') })
                }
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
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
                onPress={() => setDrillDown({ metricType: 'power', title: t('dashboard.power') })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <MetricTile
                title={String(t('dashboard.temp'))}
                value={avgTemp > 0 ? `${avgTemp.toFixed(0)}°` : '—°'}
                accent={avgTemp > 70 ? 'danger' : 'success'}
                chart="gauge"
                size="lg"
                onPress={() => setDrillDown({ metricType: 'temp', title: t('dashboard.temp') })}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
                onPress={() => setDrillDown({ metricType: 'uptime', title: t('dashboard.uptime') })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <MetricTile
                title={String(t('dashboard.workers'))}
                value={String(filteredMiners.length)}
                unit={t('dashboard.active')}
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

      {lastRefreshTimestamp > 0 && Date.now() - lastRefreshTimestamp > 120000 && (
        <View style={{ paddingHorizontal: spacing.md, marginBottom: 6 }}>
          <Text
            style={{ color: theme.warning, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
          >
            {'\u26A0'} Data from {new Date(lastRefreshTimestamp).toLocaleTimeString()} —{' '}
            {t('dashboard.staleData') || 'stale'}
          </Text>
        </View>
      )}

      {!kioskMode &&
        visibleSections.filters &&
        (wallets.length > 0 || groups.length > 0 || locations.length > 0 || allTags.length > 0) && (
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: spacing.md,
              gap: spacing.xs,
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
                    !walletFilter &&
                    !groupFilter &&
                    !locationFilter &&
                    !tagFilter &&
                    statusFilter === 'all'
                      ? theme.primary
                      : theme.surfaceLight,
                  borderColor:
                    !walletFilter &&
                    !groupFilter &&
                    !locationFilter &&
                    !tagFilter &&
                    statusFilter === 'all'
                      ? theme.primary
                      : theme.border,
                },
              ]}
              onPress={() => {
                setWalletFilter(null);
                setGroupFilter(null);
                setLocationFilter(null);
                setTagFilter(null);
                setStatusFilter('all');
              }}
            >
              <Text
                style={[
                  styles.walletChipText,
                  {
                    color:
                      !walletFilter &&
                      !groupFilter &&
                      !locationFilter &&
                      !tagFilter &&
                      statusFilter === 'all'
                        ? '#FFF'
                        : theme.text,
                  },
                ]}
              >
                {t('common.all')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filter: Online"
              style={[
                styles.walletChip,
                {
                  backgroundColor: statusFilter === 'online' ? theme.primary : theme.surfaceLight,
                  borderColor: statusFilter === 'online' ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setStatusFilter(statusFilter === 'online' ? 'all' : 'online')}
            >
              <Text
                style={[
                  styles.walletChipText,
                  { color: statusFilter === 'online' ? '#FFF' : theme.text },
                ]}
              >
                {'\u25CF'} {t('common.online')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filter: Offline"
              style={[
                styles.walletChip,
                {
                  backgroundColor: statusFilter === 'offline' ? theme.accent : theme.surfaceLight,
                  borderColor: statusFilter === 'offline' ? theme.accent : theme.border,
                },
              ]}
              onPress={() => setStatusFilter(statusFilter === 'offline' ? 'all' : 'offline')}
            >
              <Text
                style={[
                  styles.walletChipText,
                  { color: statusFilter === 'offline' ? '#FFF' : theme.text },
                ]}
              >
                {'\u25CB'} {t('common.offline')}
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
            gap: spacing.xs,
            paddingHorizontal: spacing.md,
            marginBottom: 4,
          }}
        >
          <Text
            style={{ color: theme.textDim, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}
          >
            {t('dashboard.sortBy')}
          </Text>
          {(['name', 'hashrate', 'temp'] as const).map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${s}`}
              onPress={() => setSortBy(s)}
              style={{
                paddingHorizontal: spacing.xs,
                paddingVertical: spacing.xxs,
                borderRadius: radius.sm,
                backgroundColor: sortBy === s ? theme.primaryLight : theme.surface,
                borderWidth: 1,
                borderColor: sortBy === s ? theme.primaryLight : theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.bold,
                  color: sortBy === s ? '#FFF' : theme.textMuted,
                }}
              >
                {s === 'name'
                  ? t('dashboard.sortByName')
                  : s === 'hashrate'
                    ? t('dashboard.sortByHashrate')
                    : t('dashboard.sortByTemp')}
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
            gap: spacing.xs,
            paddingHorizontal: spacing.md,
            marginBottom: 4,
          }}
        >
          <Text
            style={{ color: theme.textDim, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}
          >
            {t('dashboard.groupBy')}
          </Text>
          {([null, 'location', 'tag'] as const).map((g) => (
            <Pressable
              key={g ?? 'off'}
              accessibilityRole="button"
              accessibilityLabel={
                g === null
                  ? t('dashboard.groupOff')
                  : g === 'location'
                    ? t('dashboard.groupByLocation')
                    : t('dashboard.groupByTag')
              }
              onPress={() => setAutoGroupBy(g)}
              style={{
                paddingHorizontal: spacing.xs,
                paddingVertical: spacing.xxs,
                borderRadius: radius.sm,
                backgroundColor: autoGroupBy === g ? theme.accent : theme.surface,
                borderWidth: 1,
                borderColor: autoGroupBy === g ? theme.accent : theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.bold,
                  color: autoGroupBy === g ? '#FFF' : theme.textMuted,
                }}
              >
                {g === null
                  ? t('dashboard.groupOff')
                  : g === 'location'
                    ? t('dashboard.groupByLocation')
                    : t('dashboard.groupByTag')}
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

      {Object.keys(minerErrors).length > 0 && (
        <ErrorBanner
          message={t('dashboard.minerErrors', {
            count: Object.keys(minerErrors).length,
            defaultValue: '{{count}} miner(s) unreachable',
          })}
          onDismiss={clearMinerErrors}
          onRetry={loadMiners}
        />
      )}

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

      {!kioskMode && miners.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.md,
            marginBottom: 6,
          }}
        >
          <Text style={{ color: theme.textMuted, fontSize: fontSize.md }}>🔍</Text>
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: radius.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              color: theme.text,
              backgroundColor: theme.surface,
              fontSize: fontSize.base,
            }}
            placeholder={t('dashboard.searchPlaceholder', 'Search miners...')}
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search miners"
          />
          {searchQuery.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearchQuery('')}
            >
              <Text style={{ color: theme.textMuted, fontSize: fontSize.lg }}>✕</Text>
            </Pressable>
          )}
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
              accessibilityLabel="Batch location"
              style={styles.batchBtn}
              onPress={() => setShowLocationPicker(true)}
            >
              <Text style={styles.batchBtnText}>{t('dashboard.location', 'Location')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Batch flash"
              style={styles.batchBtn}
              onPress={handleBatchFlash}
            >
              <Text style={styles.batchBtnText}>{t('dashboard.flash')}</Text>
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

      <Modal
        visible={showLocationPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationPicker(false)}
        testID="location-picker-modal"
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLocationPicker(false)}
          accessibilityLabel="Close location picker"
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t('dashboard.assignLocation', 'Assign Location')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear location"
              style={styles.modalOption}
              onPress={() => handleBatchLocation(undefined)}
            >
              <Text style={styles.modalOptionText}>{t('common.clear', 'Clear')}</Text>
            </Pressable>
            {LOCATIONS.map((loc) => (
              <Pressable
                accessibilityRole="button"
                key={loc}
                accessibilityLabel={`Set location to ${loc}`}
                style={styles.modalOption}
                onPress={() => handleBatchLocation(loc)}
              >
                <Text style={styles.modalOptionText}>{loc}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showGroupPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGroupPicker(false)}
        testID="group-picker-modal"
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowGroupPicker(false)}
          accessibilityLabel="Close group picker"
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t('dashboard.assignGroup')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove group"
              style={styles.modalOption}
              onPress={() => handleBatchGroupAssign(undefined)}
            >
              <Text style={styles.modalOptionText}>{t('dashboard.removeGroup')}</Text>
            </Pressable>
            {groups
              .filter((g) => g !== 'Ungrouped')
              .map((g) => (
                <Pressable
                  accessibilityRole="button"
                  key={g}
                  accessibilityLabel={`Assign group: ${g}`}
                  style={styles.modalOption}
                  onPress={() => handleBatchGroupAssign(g)}
                >
                  <Text style={styles.modalOptionText}>{g}</Text>
                </Pressable>
              ))}
            <TextInput
              style={styles.groupInput}
              placeholder={t('dashboard.createNewGroup', 'Create new group...')}
              placeholderTextColor={theme.textMuted}
              value={groupPickerInput}
              onChangeText={setGroupPickerInput}
              onSubmitEditing={(e) => {
                const text = e?.nativeEvent?.text ?? groupPickerInput;
                if (text.trim()) {
                  handleBatchGroupAssign(text.trim());
                }
              }}
              returnKeyType="done"
              testID="group-picker-input"
            />
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
        onReorder={(ordered) => {
          DB.setSetting('dashboard_section_order', JSON.stringify(ordered)).catch(() => {});
        }}
        kioskMode={kioskMode}
        onToggleKiosk={handleToggleKiosk}
      />

      <MinerDrillDownModal
        visible={drillDown !== null}
        onClose={() => setDrillDown(null)}
        miners={filteredMiners}
        metricType={drillDown?.metricType ?? 'hashrate'}
        title={drillDown?.title ?? ''}
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
