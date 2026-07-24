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
