import { useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useMinerStore } from '../store/miners';
import { useSubscriptionStore } from '../store/subscription';
import { MinerCard } from '../components/MinerCard';
import { SubscriptionGate } from '../components/SubscriptionGate';
import { ErrorBanner } from '../components/ErrorBanner';
import { Miner } from '../types';

interface DashboardScreenProps {
  navigation: any;
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const miners = useMinerStore((s) => s.miners);
  const loading = useMinerStore((s) => s.loading);
  const initialized = useMinerStore((s) => s.initialized);
  const scanning = useMinerStore((s) => s.scanning);
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
    navigation.navigate('AddMiner');
  }, [navigation]);

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

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{miners.length}</Text>
          <Text style={styles.summaryLabel}>Miners</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#22C55E' }]}>
            {onlineCount}
          </Text>
          <Text style={styles.summaryLabel}>Online</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>
            {totalHashrate.toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Total GH/s</Text>
        </View>
      </View>

      <ErrorBanner
        message={error}
        onDismiss={clearError}
        onRetry={loadMiners}
      />

      {scanning && (
        <View style={styles.scanningBanner}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.scanningText}>Scanning network...</Text>
        </View>
      )}

      {!initialized || (loading && miners.length === 0) ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading miners...</Text>
        </View>
      ) : miners.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No Miners Yet</Text>
          <Text style={styles.emptyText}>
            Add a miner by IP or scan your network
          </Text>
          <SubscriptionGate feature="Network scanning">
            <TouchableOpacity style={styles.scanBtn} onPress={scanNetwork}>
              <Text style={styles.scanBtnText}>Scan Network</Text>
            </TouchableOpacity>
          </SubscriptionGate>
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
              tintColor="#3B82F6"
              colors={['#3B82F6']}
              progressBackgroundColor="#1F2937"
            />
          }
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, !canAdd && styles.fabDisabled]}
        onPress={canAdd ? handleAddMiner : () => navigation.navigate('Subscription')}
      >
        <Text style={styles.fabText}>+</Text>
        {!canAdd && (
          <Text style={styles.fabSubtext}>Max {maxMiners}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  summary: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  scanningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A5F',
    padding: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  scanningText: {
    color: '#93C5FD',
    fontSize: 13,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  emptyTitle: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  scanBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  scanBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  list: {
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabDisabled: {
    backgroundColor: '#4B5563',
  },
  fabText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
  fabSubtext: {
    color: '#FFF',
    fontSize: 8,
    marginTop: -2,
  },
});
