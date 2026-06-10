import { useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useMinerStore } from '../store/miners';
import { useSubscriptionStore } from '../store/subscription';
import { MinerCard } from '../components/MinerCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { Miner } from '../types';
import { theme } from '../theme';

interface DashboardScreenProps {
  navigation: any;
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
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
  const maxMiners = useSubscriptionStore((s) => s.maxMiners);
  const initSubscription = useSubscriptionStore((s) => s.initialize);

  useEffect(() => {
    initSubscription();
    loadMiners();
    const stop = startPolling(30000);
    return stop;
  }, []);

  const handleMinerPress = useCallback((miner: Miner) => {
    navigation.navigate('MinerDetail', { minerId: miner.id });
  }, [navigation]);

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
    (sum, m) => sum + (m.status?.hashRate ?? 0),
    0
  );

  const canAdd = canAddMiner(miners.length);

  const formatTotal = (v: number) => {
    if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}G`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    return v.toFixed(0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>HashWatch</Text>
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
          <Text style={[styles.summaryValue, { color: theme.success }]}>
            {onlineCount}
          </Text>
          <Text style={styles.summaryLabel}>Online</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryIcon}>⚡</Text>
          <Text style={[styles.summaryValue, { color: theme.primary }]}>
            {formatTotal(totalHashrate)}
          </Text>
          <Text style={styles.summaryLabel}>Total Hash</Text>
        </View>
      </View>

      {!canAdd && miners.length > 0 && (
        <TouchableOpacity
          style={styles.upgradeBanner}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.upgradeBannerText}>
            🔒 Upgrade to Pro for unlimited miners
          </Text>
        </TouchableOpacity>
      )}

      <ErrorBanner
        message={error}
        onDismiss={clearError}
        onRetry={loadMiners}
      />

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
          <Text style={styles.emptyText}>
            Add a miner or scan your local network
          </Text>
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
          data={miners}
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

const styles = StyleSheet.create({
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
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    paddingVertical: 12,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 14,
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
    fontSize: 11,
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
    marginBottom: 24,
    lineHeight: 20,
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
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: `0 4px 16px ${theme.glow}`,
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
});
