import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { Miner } from '../types';

interface MinerHealthScoreProps {
  miner: Miner;
}

interface HealthFactors {
  temperature: number;
  hashrate: number;
  uptime: number;
  shares: number;
  power: number;
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

function calculateHealth(miner: Miner): HealthFactors {
  if (!miner.isOnline) {
    return { temperature: 0, hashrate: 0, uptime: 0, shares: 0, power: 0, overall: 0, grade: 'F' };
  }

  const status = miner.status;
  const temp = status?.temperature ?? 0;
  const tempScore = temp < 50 ? 100 : temp < 65 ? 85 : temp < 75 ? 70 : temp < 85 ? 50 : 20;

  const uptime = status?.uptimeSeconds ?? 0;
  const uptimeDays = uptime / 86400;
  const uptimeScore = uptimeDays < 1 ? 80 : uptimeDays < 7 ? 95 : uptimeDays < 30 ? 100 : uptimeDays < 90 ? 90 : 75;

  const sharesAccepted = status?.sharesAccepted ?? 0;
  const sharesRejected = status?.sharesRejected ?? 0;
  const totalShares = sharesAccepted + sharesRejected;
  const shareScore = totalShares === 0 ? 80 : Math.max(0, Math.min(100, (sharesAccepted / totalShares) * 100));

  const hashrate = status?.hashRate ?? 0;
  const hashrateScore = hashrate > 0 ? 90 : 0;

  const power = status?.power ?? 0;
  const efficiency = power > 0 && hashrate > 0 ? hashrate / power : 0;
  const powerScore = efficiency > 0.5 ? 95 : efficiency > 0.3 ? 85 : efficiency > 0.1 ? 70 : hashrate > 0 ? 60 : 30;

  const overall = Math.round(
    tempScore * 0.25 + uptimeScore * 0.2 + shareScore * 0.25 + hashrateScore * 0.15 + powerScore * 0.15,
  );

  const grade: HealthFactors['grade'] =
    overall >= 90 ? 'A' : overall >= 75 ? 'B' : overall >= 60 ? 'C' : overall >= 40 ? 'D' : 'F';

  return { temperature: tempScore, hashrate: hashrateScore, uptime: uptimeScore, shares: shareScore, power: powerScore, overall, grade };
}

function gradeColor(grade: string, theme: { success: string; info: string; warning: string; danger: string; text: string }): string {
  switch (grade) {
    case 'A': return theme.success;
    case 'B': return theme.info;
    case 'C': return theme.warning;
    case 'D': return '#F97316';
    case 'F': return theme.danger;
    default: return theme.text;
  }
}

export const MinerHealthScore = React.memo(function MinerHealthScore({ miner }: MinerHealthScoreProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const health = useMemo(() => calculateHealth(miner), [miner]);
  const color = gradeColor(health.grade, theme);

  const factors = [
    { label: t('health.temperature', 'Temp'), score: health.temperature },
    { label: t('health.uptime', 'Uptime'), score: health.uptime },
    { label: t('health.shares', 'Shares'), score: health.shares },
    { label: t('health.hashrate', 'Hashrate'), score: health.hashrate },
    { label: t('health.power', 'Power'), score: health.power },
  ];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.gradeBadge, { backgroundColor: color + '20', borderColor: color }]}>
          <Text style={[styles.gradeText, { color }]}>{health.grade}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t('health.title', 'Health Score')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textDim }]}>
            {health.overall}/100
          </Text>
        </View>
      </View>

      {factors.map((f) => (
        <View key={f.label} style={styles.factorRow}>
          <Text style={[styles.factorLabel, { color: theme.textMuted }]}>{f.label}</Text>
          <View style={[styles.barTrack, { backgroundColor: theme.surfaceLight }]}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${f.score}%`,
                  backgroundColor: f.score >= 80 ? theme.success : f.score >= 60 ? theme.warning : theme.danger,
                },
              ]}
            />
          </View>
          <Text style={[styles.factorScore, { color: theme.text }]}>{f.score}</Text>
        </View>
      ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  gradeBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.sm,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  factorLabel: {
    width: 70,
    fontSize: fontSize.xs,
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
  factorScore: {
    width: 30,
    fontSize: fontSize.xs,
    textAlign: 'right',
  },
});
