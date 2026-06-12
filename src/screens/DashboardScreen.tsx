import { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useMinerStore } from '../store/miners';
import { useSubscriptionStore } from '../store/subscription';
import { MinerCard } from '../components/MinerCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { EarningsCard } from '../components/EarningsCard';
import { Miner } from '../types';
import { formatWTHs } from '../utils/formatters';
import { toHashesPerSecond, formatHashrateValue } from '../utils/hashrate';
import { useTheme } from '../theme';
import { Wallet } from '../types';
import * as DB from '../db/database';

interface DashboardScreenProps {
  navigation: any;
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
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
  const canAddMiner = useSubscriptionStore((s) => s.canAddMiner);
  const initSubscription = useSubscriptionStore((s) => s.initialize);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletFilter, setWalletFilter] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  const groups = useMemo(() => {
    const gs = new Set(miners.map((m) => m.group).filter(Boolean) as string[]);
    return Array.from(gs).sort();
  }, [miners]);

  useEffect(() => {
    DB.loadWallets().then(setWallets);
  }, []);

  const filteredMiners = miners.filter((m) => {
    if (walletFilter && m.walletId !== walletFilter) return false;
    if (groupFilter && m.group !== groupFilter) return false;
    return true;
  });

  useEffect(() => {
    initSubscription();
    loadMiners();
    const stop = startPolling(30000);
    const autoScanInterval = setInterval(async () => {
      const v = await DB.getSetting('auto_scan');
      if (v === 'true' && !scanning) {
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
      navigation.navigate('MinerDetail', { minerId: miner.id });
    },
    [navigation],
  );

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

  const onlineCount = miners.filter((m) => m.isOnline).length;
  const totalHashrate = miners.reduce(
    (sum, m) => sum + toHashesPerSecond(m.status?.hashRate ?? 0, m.status?.hashRateUnit),
    0,
  );
  const totalPower = miners.reduce((sum, m) => sum + (m.status?.power ?? 0), 0);
  const minersWithTemp = miners.filter((m) => m.status?.temperature);
  const avgTemp =
    minersWithTemp.length > 0
      ? minersWithTemp.reduce((sum, m) => sum + (m.status?.temperature ?? 0), 0) /
        minersWithTemp.length
      : 0;

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
          backgroundColor: 'rgba(108, 99, 255, 0.1)',
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
          <Text style={styles.headerTitle}>HashWatch</Text>
          <Text style={styles.headerSub}>
            <Text style={styles.liveDot}>●</Text> Live Monitor
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>⬡</Text>
          <Text style={styles.summaryValue}>{miners.length}</Text>
          <Text style={styles.summaryLabel}>Miners</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>🟢</Text>
          <Text style={[styles.summaryValue, { color: theme.success }]}>{onlineCount}</Text>
          <Text style={styles.summaryLabel}>Online</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>⚡</Text>
          <Text style={[styles.summaryValue, { color: theme.primary }]}>
            {formatTotal(totalHashrate)}
          </Text>
          <Text style={styles.summaryLabel}>Hashrate</Text>
        </View>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>🔌</Text>
          <Text style={[styles.summaryValue, { color: theme.warning }]}>
            {totalPower.toFixed(1)}
          </Text>
          <Text style={styles.summaryLabel}>Power (W)</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>🌡</Text>
          <Text
            style={[styles.summaryValue, { color: avgTemp > 70 ? theme.danger : theme.success }]}
          >
            {avgTemp > 0 ? avgTemp.toFixed(0) : '—'}°
          </Text>
          <Text style={styles.summaryLabel}>Avg Temp</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>📊</Text>
          <Text style={[styles.summaryValue, { color: theme.accent }]}>
            {formatWTHs(totalPower, totalHashrate / 1e12, 'TH/s')}
          </Text>
          <Text style={styles.summaryLabel}>Efficiency</Text>
        </View>
      </View>

      {miners.length > 0 && <EarningsCard miners={miners} />}

      {(wallets.length > 0 || groups.length > 0) && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
          <TouchableOpacity
            style={[
              styles.walletChip,
              {
                backgroundColor: !walletFilter && !groupFilter ? theme.primary : theme.surfaceLight,
                borderColor: !walletFilter && !groupFilter ? theme.primary : theme.border,
              },
            ]}
            onPress={() => { setWalletFilter(null); setGroupFilter(null); }}
          >
            <Text style={[styles.walletChipText, { color: !walletFilter && !groupFilter ? '#FFF' : theme.text }]}>
              All
            </Text>
          </TouchableOpacity>
          {wallets.map((w) => (
            <TouchableOpacity
              key={w.id}
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
              key={g}
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
                📁 {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!canAdd && miners.length > 0 && (
        <TouchableOpacity
          style={styles.upgradeBanner}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.upgradeBannerText}>🔒 Upgrade to Pro for unlimited miners</Text>
        </TouchableOpacity>
      )}

      <ErrorBanner message={error} onDismiss={clearError} onRetry={loadMiners} />

      {scanning && (
        <View style={styles.scanningBanner}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={styles.scanningText}>
            Scanning {scanProgress?.scanned || 0}/{scanProgress?.total || 254}...
          </Text>
        </View>
      )}

      {!initialized || (loading && miners.length === 0) ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading miners...</Text>
        </View>
      ) : miners.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⬡</Text>
          <Text style={styles.emptyTitle}>No Miners Yet</Text>
          <Text style={styles.emptyText}>Add your first BitAxe miner to start monitoring</Text>
          <View style={styles.emptySteps}>
            <Text style={styles.stepText}>1. Know your miner's IP address</Text>
            <Text style={styles.stepText}>2. Tap the + button below</Text>
            <Text style={styles.stepText}>3. Enter the IP and a name</Text>
          </View>
          <View style={styles.emptyActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddMiner}>
              <Text style={styles.primaryBtnText}>Add Miner</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={scanNetwork}>
              <Text style={styles.secondaryBtnText}>Scan Network</Text>
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
              onDelete={() => useMinerStore.getState().removeMiner(item.id)}
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
        />
      )}

      <TouchableOpacity
        style={[styles.fab, !canAdd && styles.fabDisabled]}
        onPress={handleAddMiner}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
