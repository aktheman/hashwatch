import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMinerStore } from '../store/miners';
import { useTheme } from '../theme';
import {
  formatHashrate,
  formatTemperature,
  formatUptime,
  formatPower,
  formatWTHs,
} from '../utils/formatters';
import { Miner, RootStackParamList } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';

interface StatRow {
  label: string;
  getValue: (m: Miner) => string;
  compare: (a: string, b: string) => 'better' | 'worse' | 'equal';
}

const STAT_ROWS: StatRow[] = [
  {
    label: 'comparison.hashrate',
    getValue: (m) => (m.status ? formatHashrate(m.status.hashRate, m.status.hashRateUnit) : '---'),
    compare: (a, b) => {
      const pa = parseFloat(a.replace(/[^0-9.]/g, ''));
      const pb = parseFloat(b.replace(/[^0-9.]/g, ''));
      if (isNaN(pa) || isNaN(pb)) return 'equal';
      return pa > pb ? 'better' : pa < pb ? 'worse' : 'equal';
    },
  },
  {
    label: 'comparison.temp',
    getValue: (m) => (m.status ? formatTemperature(m.status.temperature) : '---'),
    compare: (a, b) => {
      const pa = parseFloat(a);
      const pb = parseFloat(b);
      if (isNaN(pa) || isNaN(pb)) return 'equal';
      return pa < pb ? 'better' : pa > pb ? 'worse' : 'equal';
    },
  },
  {
    label: 'comparison.power',
    getValue: (m) => (m.status ? `${formatPower(m.status.power)}` : '---'),
    compare: (a, b) => {
      const pa = parseFloat(a.replace(/[^0-9.]/g, ''));
      const pb = parseFloat(b.replace(/[^0-9.]/g, ''));
      if (isNaN(pa) || isNaN(pb)) return 'equal';
      return pa < pb ? 'better' : pa > pb ? 'worse' : 'equal';
    },
  },
  {
    label: 'comparison.efficiency',
    getValue: (m) =>
      m.status ? formatWTHs(m.status.power, m.status.hashRate, m.status.hashRateUnit) : '---',
    compare: (a, b) => {
      const pa = parseFloat(a);
      const pb = parseFloat(b);
      if (isNaN(pa) || isNaN(pb)) return 'equal';
      return pa < pb ? 'better' : pa > pb ? 'worse' : 'equal';
    },
  },
  {
    label: 'comparison.uptime',
    getValue: (m) => (m.status ? formatUptime(m.status.uptimeSeconds) : '---'),
    compare: (a, b) => {
      const toSeconds = (s: string): number => {
        const p = parseFloat(s);
        if (s.includes('d')) return p * 86400;
        if (s.includes('h')) return p * 3600;
        if (s.includes('m')) return p * 60;
        return p;
      };
      const pa = toSeconds(a);
      const pb = toSeconds(b);
      if (isNaN(pa) || isNaN(pb)) return 'equal';
      return pa > pb ? 'better' : pa < pb ? 'worse' : 'equal';
    },
  },
  {
    label: 'comparison.sharesAccepted',
    getValue: (m) => (m.status ? String(m.status.sharesAccepted) : '---'),
    compare: (a, b) => {
      const pa = parseInt(a, 10);
      const pb = parseInt(b, 10);
      if (isNaN(pa) || isNaN(pb)) return 'equal';
      return pa > pb ? 'better' : pa < pb ? 'worse' : 'equal';
    },
  },
  {
    label: 'comparison.sharesRejected',
    getValue: (m) => (m.status ? String(m.status.sharesRejected) : '---'),
    compare: (a, b) => {
      const pa = parseInt(a, 10);
      const pb = parseInt(b, 10);
      if (isNaN(pa) || isNaN(pb)) return 'equal';
      return pa < pb ? 'better' : pa > pb ? 'worse' : 'equal';
    },
  },
  {
    label: 'comparison.frequency',
    getValue: (m) => (m.status ? `${m.status.frequency} MHz` : '---'),
    compare: (a, b) => {
      const pa = parseFloat(a);
      const pb = parseFloat(b);
      if (isNaN(pa) || isNaN(pb)) return 'equal';
      return pa > pb ? 'better' : pa < pb ? 'worse' : 'equal';
    },
  },
  {
    label: 'comparison.voltage',
    getValue: (m) => (m.status ? `${m.status.coreVoltage} V` : '---'),
    compare: (a, b) => {
      const pa = parseFloat(a);
      const pb = parseFloat(b);
      if (isNaN(pa) || isNaN(pb)) return 'equal';
      return pa > pb ? 'better' : pa < pb ? 'worse' : 'equal';
    },
  },
  {
    label: 'comparison.bestDiff',
    getValue: (m) => m.status?.bestDiff || '---',
    compare: () => 'equal' as const,
  },
  {
    label: 'comparison.pool',
    getValue: (m) => {
      if (!m.status) return '---';
      return m.status.pool && m.status.poolPort
        ? `${m.status.pool}:${m.status.poolPort}`
        : m.status.pool || '---';
    },
    compare: () => 'equal' as const,
  },
];

export function MinerComparisonScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, 'MinerComparison'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const minerIds: string[] = route.params?.minerIds || [];
  const selectedMiners = useMemo(
    () => minerIds.map((id) => miners.find((m) => m.id === id)).filter(Boolean) as Miner[],
    [minerIds, miners],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        scroll: {
          padding: spacing.sm,
        },
        header: {
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.extrabold,
          marginBottom: spacing.md,
          marginLeft: spacing.xxs,
        },
        table: {
          borderRadius: radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
        },
        row: {
          flexDirection: 'row',
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        rowLast: {
          borderBottomWidth: 0,
        },
        label: {
          width: 100,
          padding: spacing.xs,
          backgroundColor: theme.surfaceLight,
          justifyContent: 'center',
          borderRightWidth: 1,
          borderRightColor: theme.border,
        },
        labelText: {
          color: theme.textDim,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        cell: {
          flex: 1,
          padding: spacing.xs,
          alignItems: 'center',
          justifyContent: 'center',
        },
        cellValue: {
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
          textAlign: 'center',
        },
        cellBetter: {
          color: theme.success,
        },
        cellWorse: {
          color: theme.danger,
        },
        cellEqual: {
          color: theme.text,
        },
        minerHeader: {
          flex: 1,
          padding: spacing.xs,
          alignItems: 'center',
        },
        minerName: {
          color: theme.text,
          fontSize: fontSize.base,
          fontWeight: fontWeight.bold,
          textAlign: 'center',
        },
        minerIp: {
          color: theme.textMuted,
          fontSize: fontSize.xs,
          fontFamily: 'monospace',
          marginTop: spacing.xxs,
        },
        minerStatus: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
          marginTop: spacing.xxs,
        },
        empty: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xxl,
        },
        emptyText: {
          color: theme.textDim,
          fontSize: fontSize.md,
        },
      }),
    [theme],
  );

  if (selectedMiners.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t('comparison.selectAtLeastTwo')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      accessibilityRole="summary"
      accessibilityLabel={t('comparison.title')}
    >
      <Text style={styles.header}>{t('comparison.title')}</Text>
      <View style={styles.table}>
        <View style={[styles.row, styles.rowLast]}>
          <View style={styles.label}>
            <Text style={styles.labelText}>{t('comparison.miner')}</Text>
          </View>
          {selectedMiners.map((m) => (
            <View key={m.id} style={styles.minerHeader}>
              <Text style={styles.minerName} numberOfLines={1}>
                {m.name}
              </Text>
              <Text style={styles.minerIp}>{m.ip}</Text>
              <Text
                style={[styles.minerStatus, { color: m.isOnline ? theme.success : theme.danger }]}
              >
                {m.isOnline ? t('common.online') : t('common.offline')}
              </Text>
            </View>
          ))}
        </View>
        {STAT_ROWS.map((stat, ri) => {
          const values = selectedMiners.map(stat.getValue);
          const bestIndex = values.reduce((best, v, i) => {
            if (i === 0) return 0;
            const cmp = stat.compare(values[best], v);
            return cmp === 'worse' ? i : best;
          }, 0);
          return (
            <View
              key={stat.label}
              style={[styles.row, ri === STAT_ROWS.length - 1 && styles.rowLast]}
            >
              <View style={styles.label}>
                <Text style={styles.labelText}>{t(stat.label)}</Text>
              </View>
              {selectedMiners.map((m, ci) => {
                const cmp =
                  ci === bestIndex ? 'better' : stat.compare(values[bestIndex], values[ci]);
                const isBest = cmp === 'better' || cmp === 'equal';
                return (
                  <View key={m.id} style={styles.cell}>
                    <Text style={[styles.cellValue, isBest ? styles.cellBetter : styles.cellWorse]}>
                      {values[ci]}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
