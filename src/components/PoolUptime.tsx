import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { Miner } from '../types';

interface PoolUptimeProps {
  miners: Miner[];
}

interface PoolInfo {
  url: string;
  miners: number;
  totalHashrate: number;
  uptimePct: number;
}

export const PoolUptime = React.memo(function PoolUptime({ miners }: PoolUptimeProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const pools = useMemo(() => {
    const onlineMiners = miners.filter((m) => m.isOnline);
    if (onlineMiners.length === 0) return [];

    const poolMap = new Map<string, { miners: Miner[]; totalHash: number; uptimeSum: number }>();

    for (const m of onlineMiners) {
      const poolUrl = m.status?.pool || t('pool.unknown', 'Unknown');
      if (!poolMap.has(poolUrl)) {
        poolMap.set(poolUrl, { miners: [], totalHash: 0, uptimeSum: 0 });
      }
      const entry = poolMap.get(poolUrl)!;
      entry.miners.push(m);
      entry.totalHash += m.status?.hashRate ?? 0;
      entry.uptimeSum += m.status?.uptimeSeconds ?? 0;
    }

    const result: PoolInfo[] = [];
    for (const [url, data] of poolMap) {
      const maxUptime = Math.max(...data.miners.map((m) => m.status?.uptimeSeconds ?? 0), 1);
      const avgUptime = data.uptimeSum / data.miners.length;
      const uptimePct = Math.min(100, (avgUptime / Math.max(maxUptime, 1)) * 100);
      result.push({
        url,
        miners: data.miners.length,
        totalHashrate: data.totalHash,
        uptimePct: Math.round(uptimePct),
      });
    }

    return result.sort((a, b) => b.totalHashrate - a.totalHashrate);
  }, [miners, t]);

  if (pools.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.textDim }]}>
          {t('pool.pools', 'Pools')}
        </Text>
        <Text style={[styles.empty, { color: theme.textMuted }]}>
          {t('pool.noData', 'No pool data available.')}
        </Text>
      </View>
    );
  }

  const totalMiners = pools.reduce((sum, p) => sum + p.miners, 0);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.textDim }]}>
        {t('pool.pools', 'Pools')}
      </Text>

      {pools.map((pool) => {
        const pct = totalMiners > 0 ? (pool.miners / totalMiners) * 100 : 0;
        const shortUrl = pool.url.length > 30 ? pool.url.slice(0, 30) + '...' : pool.url;
        return (
          <View key={pool.url} style={styles.poolRow}>
            <View style={styles.poolHeader}>
              <Text style={[styles.poolUrl, { color: theme.text }]} numberOfLines={1}>
                {shortUrl}
              </Text>
              <Text style={[styles.poolMiners, { color: theme.textMuted }]}>
                {t('pool.minerCount', { count: pool.miners })}
              </Text>
            </View>
            <View style={styles.poolBar}>
              <View style={[styles.barTrack, { backgroundColor: theme.surfaceLight }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.poolPct, { color: theme.textDim }]}>{pct.toFixed(0)}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  empty: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  poolRow: {
    marginBottom: spacing.sm,
  },
  poolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  poolUrl: {
    fontSize: fontSize.xs,
    flex: 1,
    fontFamily: 'monospace',
  },
  poolMiners: {
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
  },
  poolBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  poolPct: {
    width: 35,
    fontSize: fontSize.xs,
    textAlign: 'right',
  },
});
