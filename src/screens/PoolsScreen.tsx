import { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useMinerStore } from '../store/miners';
import { useTheme } from '../theme';
import { Miner, NavigationProp } from '../types';
import {
  toHashesPerSecond,
  formatHashrateValue,
  estimateBTCPerDay,
  formatBTC,
} from '../utils/hashrate';

interface PoolGroup {
  pool: string;
  poolPort: number;
  poolUser: string;
  miners: Miner[];
  totalHashrate: number;
}

interface PoolsScreenProps {
  navigation: NavigationProp;
}

export function PoolsScreen({ navigation }: PoolsScreenProps) {
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);

  const poolGroups = useMemo(() => {
    const groups: Record<string, PoolGroup> = {};
    for (const m of miners) {
      if (!m.status?.pool) continue;
      const key = `${m.status.pool}:${m.status.poolPort || 3333}`;
      if (!groups[key]) {
        groups[key] = {
          pool: m.status.pool,
          poolPort: m.status.poolPort || 3333,
          poolUser: m.status.poolUser || '',
          miners: [],
          totalHashrate: 0,
        };
      }
      groups[key].miners.push(m);
      groups[key].totalHashrate += toHashesPerSecond(m.status.hashRate || 0, m.status.hashRateUnit);
    }
    return Object.values(groups).sort((a, b) => b.totalHashrate - a.totalHashrate);
  }, [miners]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.bg },
        headerBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
        },
        headerTitle: { color: theme.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
        headerSub: { color: theme.textDim, fontSize: 12, marginTop: 2 },
        empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
        emptyIcon: { fontSize: 48, color: theme.textMuted, marginBottom: 16 },
        emptyTitle: { color: theme.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
        emptyText: { color: theme.textDim, fontSize: 14, textAlign: 'center' },
        card: {
          backgroundColor: theme.surface,
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.border,
        },
        cardHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        poolName: { color: theme.text, fontSize: 16, fontWeight: '700', flex: 1 },
        poolUser: { color: theme.textDim, fontSize: 12, fontFamily: 'monospace', marginTop: 2 },
        statRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
        stat: { flex: 1 },
        statValue: { color: theme.text, fontSize: 18, fontWeight: '800' },
        statLabel: {
          color: theme.textDim,
          fontSize: 10,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 1,
        },
        minerList: { marginTop: 12, gap: 6 },
        minerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.bg,
          borderRadius: 10,
          padding: 10,
        },
        minerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
        minerName: { color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 },
        minerHash: { color: theme.primary, fontSize: 13, fontWeight: '700' },
      }),
    [theme],
  );

  const formatRate = (hashesPerSecond: number) => formatHashrateValue(hashesPerSecond);

  if (poolGroups.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>Pools</Text>
            <Text style={styles.headerSub}>Mining wallet overview</Text>
          </View>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🌊</Text>
          <Text style={styles.emptyTitle}>No Pools Yet</Text>
          <Text style={styles.emptyText}>
            Add miners with pool connections to see them grouped here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Pools</Text>
          <Text style={styles.headerSub}>
            {poolGroups.length} pool{poolGroups.length !== 1 ? 's' : ''} · {miners.length} miner
            {miners.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      <FlatList
        data={poolGroups}
        keyExtractor={(item) => `${item.pool}:${item.poolPort}`}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.poolName} numberOfLines={1}>
                  {item.pool}:{item.poolPort}
                </Text>
                {item.poolUser && (
                  <Text style={styles.poolUser} numberOfLines={1}>
                    {item.poolUser}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatRate(item.totalHashrate)}</Text>
                <Text style={styles.statLabel}>Hashrate</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {estimateBTCPerDay(item.totalHashrate) > 0
                    ? formatBTC(estimateBTCPerDay(item.totalHashrate))
                    : '—'}
                </Text>
                <Text style={styles.statLabel}>Est. Daily</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{item.miners.length}</Text>
                <Text style={styles.statLabel}>Miners</Text>
              </View>
            </View>
            <View style={styles.minerList}>
              {item.miners.map((m) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={m.id}
                  style={styles.minerRow}
                  onPress={() => navigation.navigate('MinerDetail', { minerId: m.id })}
                >
                  <View
                    style={[
                      styles.minerDot,
                      { backgroundColor: m.isOnline ? theme.success : theme.danger },
                    ]}
                  />
                  <Text style={styles.minerName} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text style={styles.minerHash}>
                    {formatRate(toHashesPerSecond(m.status?.hashRate || 0, m.status?.hashRateUnit))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      />
    </View>
  );
}
