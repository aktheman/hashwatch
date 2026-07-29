import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../theme';
import { useMinerStore } from '../store/miners';
import { calculateHealthScore, HealthBreakdown } from '../utils/healthScore';
import { detectAnomalies } from '../utils/anomalyDetection';
import { MinerSnapshot } from '../types';
import { RootStackParamList } from '../types';
import { useBitcoinPrice } from '../services/bitcoinPrice';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';

const GRADE_COLORS: Record<string, string> = {
  'A+': '#22c55e',
  A: '#22c55e',
  'B+': '#84cc16',
  B: '#eab308',
  'C+': '#f97316',
  C: '#f97316',
  D: '#ef4444',
  F: '#dc2626',
};

const GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'] as const;

interface MinerHealth {
  miner: ReturnType<typeof useMinerStore.getState>['miners'][number];
  health: HealthBreakdown;
  criticalAlerts: number;
}

export function FleetHealthScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const miners = useMinerStore((s) => s.miners);
  const getSnapshots = useMinerStore((s) => s.getSnapshots);
  const [minerSnapshots, setMinerSnapshots] = useState<Record<string, MinerSnapshot[]>>({});
  const { price: btcPrice } = useBitcoinPrice();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result: Record<string, MinerSnapshot[]> = {};
      await Promise.all(
        miners.map(async (m) => {
          result[m.id] = await getSnapshots(m.id, 50);
        }),
      );
      if (!cancelled) setMinerSnapshots(result);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [miners, getSnapshots]);

  const minerHealths = useMemo<MinerHealth[]>(() => {
    return miners.map((miner) => {
      const health = calculateHealthScore(miner);
      const snaps = minerSnapshots[miner.id] || [];
      const anomalies = detectAnomalies(snaps);
      const criticalAlerts = anomalies.filter((a) => a.severity === 'critical').length;
      return { miner, health, criticalAlerts };
    });
  }, [miners, minerSnapshots]);

  const fleetScore = useMemo(() => {
    if (minerHealths.length === 0) return 0;
    const online = minerHealths.filter((mh) => mh.miner.isOnline);
    if (online.length === 0) return 0;
    return Math.round(online.reduce((a, mh) => a + mh.health.score, 0) / online.length);
  }, [minerHealths]);

  const fleetGrade = useMemo(() => {
    if (fleetScore >= 95) return 'A+';
    if (fleetScore >= 90) return 'A';
    if (fleetScore >= 80) return 'B+';
    if (fleetScore >= 70) return 'B';
    if (fleetScore >= 60) return 'C+';
    if (fleetScore >= 50) return 'C';
    if (fleetScore >= 30) return 'D';
    return 'F';
  }, [fleetScore]);

  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    GRADES.forEach((g) => (dist[g] = 0));
    minerHealths.forEach((mh) => {
      if (mh.miner.isOnline) {
        dist[mh.health.grade] = (dist[mh.health.grade] || 0) + 1;
      }
    });
    return dist;
  }, [minerHealths]);

  const onlineCount = minerHealths.filter((mh) => mh.miner.isOnline).length;
  const offlineCount = minerHealths.length - onlineCount;
  const totalCritical = minerHealths.reduce((a, mh) => a + mh.criticalAlerts, 0);
  const avgTemp = useMemo(() => {
    const online = minerHealths.filter((mh) => mh.miner.isOnline && mh.miner.status);
    if (online.length === 0) return 0;
    return Math.round(
      online.reduce((a, mh) => a + (mh.miner.status?.temperature || 0), 0) / online.length,
    );
  }, [minerHealths]);
  const totalHashrate = useMemo(() => {
    return minerHealths
      .filter((mh) => mh.miner.isOnline && mh.miner.status)
      .reduce((a, mh) => a + (mh.miner.status?.hashRate || 0), 0);
  }, [minerHealths]);

  const totalPower = useMemo(() => {
    return minerHealths
      .filter((mh) => mh.miner.isOnline && mh.miner.status)
      .reduce((a, mh) => a + (mh.miner.status?.power || 0), 0);
  }, [minerHealths]);

  const fleetTrends = useMemo(() => {
    let totalHashChange = 0;
    let totalTempChange = 0;
    let count = 0;
    for (const mh of minerHealths) {
      const snaps = (minerSnapshots[mh.miner.id] || []).slice(0, 10);
      if (snaps.length < 4) continue;
      const mid = Math.floor(snaps.length / 2);
      const newer = snaps.slice(0, mid);
      const older = snaps.slice(mid);
      const oldHash = older.reduce((a, s) => a + s.hashRate, 0) / older.length;
      const newHash = newer.reduce((a, s) => a + s.hashRate, 0) / newer.length;
      const oldTemp = older.reduce((a, s) => a + s.temperature, 0) / older.length;
      const newTemp = newer.reduce((a, s) => a + s.temperature, 0) / newer.length;
      totalHashChange += newHash - oldHash;
      totalTempChange += newTemp - oldTemp;
      count++;
    }
    if (count === 0) return { hashrate: 'stable' as const, temperature: 'stable' as const };
    const avgHash = totalHashChange / count;
    const avgTempDelta = totalTempChange / count;
    return {
      hashrate:
        avgHash > 5 ? ('up' as const) : avgHash < -5 ? ('down' as const) : ('stable' as const),
      temperature:
        avgTempDelta > 2
          ? ('up' as const)
          : avgTempDelta < -2
            ? ('down' as const)
            : ('stable' as const),
    };
  }, [minerHealths, minerSnapshots]);

  const earnings = useMemo(() => {
    const DAILY_BTC_PER_TH = 0.00024;
    const ths = totalHashrate / 1000;
    const dailyBTC = ths * DAILY_BTC_PER_TH;
    const dailyUSD = dailyBTC * btcPrice;
    return { dailyBTC, dailyUSD, monthlyBTC: dailyBTC * 30, monthlyUSD: dailyUSD * 30 };
  }, [totalHashrate, btcPrice]);

  const minerTimelines = useMemo(() => {
    return minerHealths
      .filter((mh) => mh.miner.isOnline)
      .map((mh) => {
        const snaps = (minerSnapshots[mh.miner.id] || []).slice(0, 5).reverse();
        const maxHash = Math.max(...snaps.map((s) => s.hashRate), 1);
        return {
          minerId: mh.miner.id,
          name: mh.miner.name,
          grade: mh.health.grade,
          bars: snaps.map((s) => Math.round((s.hashRate / maxHash) * 100)),
        };
      });
  }, [minerHealths, minerSnapshots]);

  const recommendations = useMemo(() => {
    const recs: { icon: string; text: string; color: string }[] = [];
    if (totalCritical > 0) {
      recs.push({
        icon: '⚠️',
        text: t(
          'fleetHealth.recAttention',
          `${totalCritical} miner${totalCritical > 1 ? 's' : ''} need${totalCritical === 1 ? 's' : ''} attention`,
        ),
        color: '#ef4444',
      });
    }
    if (avgTemp > 70) {
      recs.push({
        icon: '🌡️',
        text: t('fleetHealth.recTempWarning', 'Temperature warning — avg temp above 70°C'),
        color: '#f97316',
      });
    }
    if (totalPower > 3000) {
      recs.push({
        icon: '⚡',
        text: t('fleetHealth.recPowerOpt', 'Power optimization — consider scheduling downtime'),
        color: '#eab308',
      });
    }
    const totalAccepted = minerHealths.reduce(
      (a, mh) => a + (mh.miner.status?.sharesAccepted || 0),
      0,
    );
    const totalRejected = minerHealths.reduce(
      (a, mh) => a + (mh.miner.status?.sharesRejected || 0),
      0,
    );
    const rejectionRate =
      totalAccepted + totalRejected > 0
        ? (totalRejected / (totalAccepted + totalRejected)) * 100
        : 0;
    if (rejectionRate > 5) {
      recs.push({
        icon: '🔄',
        text: t('fleetHealth.recPoolChange', 'High share rejection — consider changing pool'),
        color: '#f97316',
      });
    }
    return recs;
  }, [totalCritical, avgTemp, totalPower, minerHealths, t]);

  const sorted = useMemo(
    () => [...minerHealths].sort((a, b) => a.health.score - b.health.score),
    [minerHealths],
  );

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    header: { alignItems: 'center', marginBottom: spacing.xl },
    title: {
      fontSize: fontSize.h1,
      fontWeight: fontWeight.bold,
      color: theme.text,
      marginBottom: spacing.xs,
    },
    fleetScoreContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 4,
      borderColor: GRADE_COLORS[fleetGrade] || theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    fleetGrade: {
      fontSize: fontSize.hero,
      fontWeight: fontWeight.bold,
      color: GRADE_COLORS[fleetGrade] || theme.primary,
    },
    fleetScoreNum: { fontSize: fontSize.sm, color: theme.textMuted },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    statCard: {
      flex: 1,
      minWidth: '30%',
      backgroundColor: theme.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
    },
    statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: theme.text },
    statLabel: { fontSize: fontSize.xs, color: theme.textMuted, marginTop: spacing.xxs },
    section: { marginBottom: spacing.xl },
    sectionTitle: {
      fontSize: fontSize.h3,
      fontWeight: fontWeight.semibold,
      color: theme.text,
      marginBottom: spacing.md,
    },
    gradeBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    gradeLabel: {
      width: 30,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: theme.textMuted,
    },
    gradeBarBg: {
      flex: 1,
      height: 24,
      backgroundColor: theme.surface,
      borderRadius: radius.xs,
      overflow: 'hidden',
    },
    gradeBarFill: { height: '100%', borderRadius: radius.xs, minWidth: 2 },
    gradeCount: { width: 30, textAlign: 'right', fontSize: fontSize.sm, color: theme.textMuted },
    minerCard: {
      backgroundColor: theme.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    minerGradeBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    minerGradeText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: '#fff' },
    minerInfo: { flex: 1 },
    minerName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: theme.text },
    minerDetails: { fontSize: fontSize.xs, color: theme.textMuted, marginTop: 2 },
    minerScore: { alignItems: 'center' },
    minerScoreNum: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: theme.text },
    minerScoreLabel: { fontSize: fontSize.xs, color: theme.textMuted },
    criticalBadge: {
      backgroundColor: '#dc2626',
      borderRadius: radius.full,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      marginLeft: spacing.xs,
    },
    criticalBadgeText: { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    emptyText: { fontSize: fontSize.md, color: theme.textMuted, textAlign: 'center' },
    trendRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    trendCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
    },
    trendLabel: { fontSize: fontSize.xs, color: theme.textMuted, marginBottom: spacing.xxs },
    trendArrow: { fontSize: 32, fontWeight: fontWeight.bold },
    trendValue: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: theme.text,
      marginTop: spacing.xxs,
    },
    earningsContainer: {
      backgroundColor: theme.surface,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    earningsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.xs,
    },
    earningsLabel: { fontSize: fontSize.sm, color: theme.textMuted },
    earningsValue: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: theme.text },
    earningsDivider: {
      height: 1,
      backgroundColor: theme.border || theme.surface,
      opacity: 0.5,
    },
    earningsDisclaimer: {
      fontSize: fontSize.xs,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
      fontStyle: 'italic',
    },
    timelineCard: {
      backgroundColor: theme.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    timelineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    timelineMinerName: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: theme.text,
    },
    timelineGrade: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    timelineBars: {
      flexDirection: 'row',
      gap: 4,
      height: 40,
      alignItems: 'flex-end',
    },
    timelineBar: {
      flex: 1,
      borderRadius: radius.xs,
      minHeight: 2,
    },
    recCard: {
      backgroundColor: theme.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    recIcon: { fontSize: 20, marginRight: spacing.md },
    recText: { fontSize: fontSize.sm, color: theme.text, flex: 1 },
  });

  if (minerHealths.length === 0) {
    return (
      <View
        style={styles.container}
        accessibilityRole="summary"
        accessibilityLabel={t('fleetHealth.title', 'Fleet Health')}
      >
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t('fleetHealth.noMiners', 'Add miners to see fleet health overview.')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityRole="summary"
      accessibilityLabel={t('fleetHealth.title', 'Fleet Health')}
    >
      <Text style={styles.title}>{t('fleetHealth.title', 'Fleet Health')}</Text>

      <View style={styles.header}>
        <View style={styles.fleetScoreContainer}>
          <Text style={styles.fleetGrade}>{fleetGrade}</Text>
          <Text style={styles.fleetScoreNum}>{fleetScore}/100</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>{onlineCount}</Text>
          <Text style={styles.statLabel}>{t('fleetHealth.online', 'Online')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{offlineCount}</Text>
          <Text style={styles.statLabel}>{t('fleetHealth.offline', 'Offline')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: totalCritical > 0 ? '#ef4444' : '#22c55e' }]}>
            {totalCritical}
          </Text>
          <Text style={styles.statLabel}>{t('fleetHealth.criticalAlerts', 'Critical')}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{avgTemp}°C</Text>
          <Text style={styles.statLabel}>{t('fleetHealth.avgTemp', 'Avg Temp')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalHashrate.toFixed(0)}</Text>
          <Text style={styles.statLabel}>{t('fleetHealth.totalHashrate', 'Total GH/s')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{minerHealths.length}</Text>
          <Text style={styles.statLabel}>{t('fleetHealth.totalMiners', 'Miners')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('fleetHealth.fleetTrends', 'Fleet Trends')}</Text>
        <View style={styles.trendRow}>
          <View style={styles.trendCard}>
            <Text style={styles.trendLabel}>{t('fleetHealth.hashrateTrend', 'Hashrate')}</Text>
            <Text
              style={[
                styles.trendArrow,
                {
                  color:
                    fleetTrends.hashrate === 'up'
                      ? '#22c55e'
                      : fleetTrends.hashrate === 'down'
                        ? '#ef4444'
                        : theme.textMuted,
                },
              ]}
            >
              {fleetTrends.hashrate === 'up' ? '↑' : fleetTrends.hashrate === 'down' ? '↓' : '→'}
            </Text>
            <Text style={styles.trendValue}>
              {fleetTrends.hashrate === 'up'
                ? t('fleetHealth.trendUp', 'Rising')
                : fleetTrends.hashrate === 'down'
                  ? t('fleetHealth.trendDown', 'Falling')
                  : t('fleetHealth.trendStable', 'Stable')}
            </Text>
          </View>
          <View style={styles.trendCard}>
            <Text style={styles.trendLabel}>{t('fleetHealth.tempTrend', 'Temperature')}</Text>
            <Text
              style={[
                styles.trendArrow,
                {
                  color:
                    fleetTrends.temperature === 'up'
                      ? '#ef4444'
                      : fleetTrends.temperature === 'down'
                        ? '#22c55e'
                        : theme.textMuted,
                },
              ]}
            >
              {fleetTrends.temperature === 'up'
                ? '↑'
                : fleetTrends.temperature === 'down'
                  ? '↓'
                  : '→'}
            </Text>
            <Text style={styles.trendValue}>
              {fleetTrends.temperature === 'up'
                ? t('fleetHealth.trendRising', 'Rising')
                : fleetTrends.temperature === 'down'
                  ? t('fleetHealth.trendCooling', 'Cooling')
                  : t('fleetHealth.trendStable', 'Stable')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('fleetHealth.estimatedEarnings', 'Estimated Earnings')}
        </Text>
        <View style={styles.earningsContainer}>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>{t('fleetHealth.dailyBTC', 'Daily (BTC)')}</Text>
            <Text style={styles.earningsValue}>{earnings.dailyBTC.toFixed(6)} BTC</Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>{t('fleetHealth.dailyUSD', 'Daily (USD)')}</Text>
            <Text style={[styles.earningsValue, { color: '#22c55e' }]}>
              ${earnings.dailyUSD.toFixed(2)}
            </Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>{t('fleetHealth.monthlyBTC', 'Monthly (BTC)')}</Text>
            <Text style={styles.earningsValue}>{earnings.monthlyBTC.toFixed(6)} BTC</Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>{t('fleetHealth.monthlyUSD', 'Monthly (USD)')}</Text>
            <Text style={[styles.earningsValue, { color: '#22c55e' }]}>
              ${earnings.monthlyUSD.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.earningsDisclaimer}>
            {t(
              'fleetHealth.earningsDisclaimer',
              'Estimates based on pool mining at current BTC price',
            )}
          </Text>
        </View>
      </View>

      {minerTimelines.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('fleetHealth.healthTimeline', 'Health Timeline')}
          </Text>
          {minerTimelines.map((tl) => (
            <View key={tl.minerId} style={styles.timelineCard}>
              <View style={styles.timelineHeader}>
                <Text style={styles.timelineMinerName}>{tl.name}</Text>
                <Text
                  style={[styles.timelineGrade, { color: GRADE_COLORS[tl.grade] || theme.primary }]}
                >
                  {tl.grade}
                </Text>
              </View>
              <View style={styles.timelineBars}>
                {tl.bars.map((score, i) => (
                  <View
                    key={i}
                    style={[
                      styles.timelineBar,
                      {
                        height: `${Math.max(score, 5)}%`,
                        backgroundColor:
                          score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444',
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('fleetHealth.recommendations', 'Recommendations')}
          </Text>
          {recommendations.map((rec, i) => (
            <View key={i} style={styles.recCard}>
              <Text style={styles.recIcon}>{rec.icon}</Text>
              <Text style={styles.recText}>{rec.text}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('fleetHealth.gradeDistribution', 'Grade Distribution')}
        </Text>
        {GRADES.map((grade) => {
          const count = gradeDistribution[grade] || 0;
          const maxCount = Math.max(...Object.values(gradeDistribution), 1);
          const pct = (count / maxCount) * 100;
          return (
            <View key={grade} style={styles.gradeBar}>
              <Text style={styles.gradeLabel}>{grade}</Text>
              <View style={styles.gradeBarBg}>
                <View
                  style={[
                    styles.gradeBarFill,
                    { width: `${pct}%`, backgroundColor: GRADE_COLORS[grade] || theme.primary },
                  ]}
                />
              </View>
              <Text style={styles.gradeCount}>{count}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('fleetHealth.minerList', 'Miners by Health')}</Text>
        {sorted.map((mh) => (
          <Pressable
            key={mh.miner.id}
            style={styles.minerCard}
            onPress={() => navigation.navigate('MinerDetail', { minerId: mh.miner.id })}
            accessibilityRole="button"
            accessibilityLabel={`${mh.miner.name}, ${t('fleetHealth.score', 'Score')} ${mh.health.score}, ${mh.health.grade}`}
          >
            <View
              style={[
                styles.minerGradeBadge,
                { backgroundColor: GRADE_COLORS[mh.health.grade] || '#666' },
              ]}
            >
              <Text style={styles.minerGradeText}>{mh.health.grade}</Text>
            </View>
            <View style={styles.minerInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.minerName}>{mh.miner.name}</Text>
                {mh.criticalAlerts > 0 && (
                  <View style={styles.criticalBadge}>
                    <Text style={styles.criticalBadgeText}>{mh.criticalAlerts}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.minerDetails}>
                {mh.miner.ip} ·{' '}
                {mh.miner.isOnline
                  ? (mh.miner.status?.hashRate?.toFixed(0) || '---') + ' GH/s'
                  : t('fleetHealth.offline', 'Offline')}
              </Text>
            </View>
            <View style={styles.minerScore}>
              <Text style={styles.minerScoreNum}>{mh.health.score}</Text>
              <Text style={styles.minerScoreLabel}>/100</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
