import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useMinerStore } from '../store/miners';
import { NavigationProp } from '../types';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import * as haptic from '../utils/haptics';
import {
  extractPoolMetrics,
  comparePools,
  getPoolRecommendation,
  MetricComparison,
} from '../utils/poolCompare';
import { formatHashrateValue } from '../utils/hashrate';

const DATE_RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

function formatValue(m: MetricComparison, v: number): string {
  if (m.label === 'hashrate') return formatHashrateValue(v);
  if (m.label === 'efficiency') return `${(v / 1e9).toFixed(2)} GH/J`;
  if (m.label === 'temperature') return `${v.toFixed(1)}°C`;
  if (m.label === 'uptime') return `${Math.round(v / 3600)}h`;
  return String(Math.round(v));
}

export function PoolCompareScreen(_props: { navigation: NavigationProp }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const refreshAll = useMinerStore((s) => s.refreshAll);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState(30);

  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [selectorTarget, setSelectorTarget] = useState<'A' | 'B'>('A');

  const poolMetrics = useMemo(() => extractPoolMetrics(miners), [miners]);
  const poolKeys = useMemo(() => Array.from(poolMetrics.keys()), [poolMetrics]);

  const dataA = selectedA ? poolMetrics.get(selectedA) : null;
  const dataB = selectedB ? poolMetrics.get(selectedB) : null;

  const comparisons = useMemo(() => {
    if (!dataA || !dataB) return [];
    return comparePools(dataA, dataB);
  }, [dataA, dataB]);

  const recommendation = useMemo(() => {
    if (comparisons.length === 0) return null;
    return getPoolRecommendation(comparisons);
  }, [comparisons]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const aWins = comparisons.filter((c) => c.winner === 'A').length;
  const bWins = comparisons.filter((c) => c.winner === 'B').length;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg, padding: spacing.md },
    title: {
      color: theme.text,
      fontSize: fontSize.h3,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.md,
      marginTop: spacing.xs,
      letterSpacing: -0.5,
    },
    rangeRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
    rangeBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    poolSelector: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    selectorLabel: { color: theme.textDim, fontSize: fontSize.sm, marginBottom: spacing.xs },
    selectorValue: { color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    selectorPlaceholder: { color: theme.textMuted, fontSize: fontSize.md },
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    pickerSheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      maxHeight: '60%',
    },
    pickerTitle: {
      color: theme.text,
      fontSize: fontSize.h3,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.md,
    },
    pickerItem: {
      padding: spacing.md,
      borderRadius: radius.md,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    pickerItemText: { color: theme.text, fontSize: fontSize.md },
    pickerItemSub: { color: theme.textDim, fontSize: fontSize.sm },
    comparisonCard: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    metricLabel: { flex: 1, color: theme.textDim, fontSize: fontSize.sm },
    metricValue: {
      flex: 1,
      color: theme.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      textAlign: 'center',
    },
    winnerBadge: {
      backgroundColor: theme.success + '20',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.sm,
    },
    winnerText: { color: theme.success, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    scoreRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    scoreItem: { alignItems: 'center' },
    scoreValue: { color: theme.text, fontSize: fontSize.h3, fontWeight: fontWeight.bold },
    scoreLabel: { color: theme.textDim, fontSize: fontSize.sm },
    recBox: {
      backgroundColor: theme.primary + '15',
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.primary + '40',
    },
    recTitle: {
      color: theme.primary,
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.xs,
    },
    recText: { color: theme.text, fontSize: fontSize.md },
    emptyState: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
    emptyText: { color: theme.textDim, fontSize: fontSize.md },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    headerSide: { flex: 1, alignItems: 'center' },
    headerText: { color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.bold },
    vsText: {
      color: theme.textMuted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      alignSelf: 'center',
      marginHorizontal: spacing.sm,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('poolCompare.title')}</Text>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <View style={styles.rangeRow}>
          {DATE_RANGES.map((r) => (
            <Pressable
              key={r.days}
              style={[
                styles.rangeBtn,
                {
                  backgroundColor: selectedRange === r.days ? theme.primary : theme.surfaceLight,
                  borderColor: selectedRange === r.days ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                haptic.selection();
                setSelectedRange(r.days);
              }}
            >
              <Text
                style={{
                  color: selectedRange === r.days ? '#FFF' : theme.text,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.headerRow}>
          <View style={styles.headerSide}>
            <Pressable
              style={styles.poolSelector}
              onPress={() => {
                haptic.light();
                setSelectorTarget('A');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('poolCompare.selectPoolA')}
            >
              <Text style={styles.selectorLabel}>{t('poolCompare.selectPoolA')}</Text>
              {dataA ? (
                <Text style={styles.selectorValue}>
                  {dataA.pool}:{dataA.poolPort}
                </Text>
              ) : (
                <Text style={styles.selectorPlaceholder}>{t('poolCompare.selectPoolA')}</Text>
              )}
            </Pressable>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.headerSide}>
            <Pressable
              style={styles.poolSelector}
              onPress={() => {
                haptic.light();
                setSelectorTarget('B');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('poolCompare.selectPoolB')}
            >
              <Text style={styles.selectorLabel}>{t('poolCompare.selectPoolB')}</Text>
              {dataB ? (
                <Text style={styles.selectorValue}>
                  {dataB.pool}:{dataB.poolPort}
                </Text>
              ) : (
                <Text style={styles.selectorPlaceholder}>{t('poolCompare.selectPoolB')}</Text>
              )}
            </Pressable>
          </View>
        </View>

        {comparisons.length > 0 && (
          <>
            <View style={styles.scoreRow}>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreValue, { color: theme.primary }]}>{aWins}</Text>
                <Text style={styles.scoreLabel}>{t('poolCompare.selectPoolA')}</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreValue, { color: theme.textMuted }]}>
                  {comparisons.length - aWins - bWins}
                </Text>
                <Text style={styles.scoreLabel}>Ties</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreValue, { color: theme.accent || theme.primary }]}>
                  {bWins}
                </Text>
                <Text style={styles.scoreLabel}>{t('poolCompare.selectPoolB')}</Text>
              </View>
            </View>

            {comparisons.map((c) => (
              <View key={c.label} style={styles.comparisonCard}>
                <View style={styles.metricValue}>
                  <Text
                    style={{
                      color: c.winner === 'A' ? theme.success : theme.text,
                      fontWeight: c.winner === 'A' ? fontWeight.bold : fontWeight.regular,
                    }}
                  >
                    {formatValue(c, c.valueA)}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={styles.metricLabel}>{t(`poolCompare.${c.label}`)}</Text>
                </View>
                <View style={styles.metricValue}>
                  <Text
                    style={{
                      color: c.winner === 'B' ? theme.success : theme.text,
                      fontWeight: c.winner === 'B' ? fontWeight.bold : fontWeight.regular,
                    }}
                  >
                    {formatValue(c, c.valueB)}
                  </Text>
                </View>
                {c.winner !== 'tie' && (
                  <View
                    style={[
                      styles.winnerBadge,
                      { position: 'absolute', right: spacing.xs, top: spacing.xs },
                    ]}
                  >
                    <Text style={styles.winnerText}>{t('poolCompare.winner')}</Text>
                  </View>
                )}
              </View>
            ))}

            {recommendation && (
              <View style={styles.recBox}>
                <Text style={styles.recTitle}>{t('poolCompare.recommendation')}</Text>
                <Text style={styles.recText}>
                  {recommendation === 'A'
                    ? `${dataA!.pool}:${dataA!.poolPort} ${t('poolCompare.winner').toLowerCase()}`
                    : recommendation === 'B'
                      ? `${dataB!.pool}:${dataB!.poolPort} ${t('poolCompare.winner').toLowerCase()}`
                      : 'Both pools perform equally'}
                </Text>
              </View>
            )}
          </>
        )}

        {(!dataA || !dataB) && poolKeys.length < 2 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 32 }}>📊</Text>
            <Text style={styles.emptyText}>{t('poolCompare.noData')}</Text>
          </View>
        )}
      </ScrollView>

      {poolKeys.length > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.surface,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            padding: spacing.md,
            maxHeight: '50%',
          }}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>
              {selectorTarget === 'A' ? t('poolCompare.selectPoolA') : t('poolCompare.selectPoolB')}
            </Text>
            <ScrollView>
              {poolKeys.map((key) => {
                const m = poolMetrics.get(key)!;
                const isSelected =
                  (selectorTarget === 'A' && selectedA === key) ||
                  (selectorTarget === 'B' && selectedB === key);
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.pickerItem,
                      {
                        backgroundColor: isSelected ? theme.primary + '20' : theme.surfaceLight,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => {
                      haptic.selection();
                      if (selectorTarget === 'A') setSelectedA(key);
                      else setSelectedB(key);
                    }}
                  >
                    <Text style={styles.pickerItemText}>
                      {m.pool}:{m.poolPort}
                    </Text>
                    <Text style={styles.pickerItemSub}>
                      {m.minerCount} miner{m.minerCount !== 1 ? 's' : ''} ·{' '}
                      {formatHashrateValue(m.totalHashrate)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}
