import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { toHashesPerSecond, estimateBTCPerDay, formatBTC, formatUSD } from '../utils/hashrate';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { Miner } from '../types';

interface EarningsCardProps {
  miners: Miner[];
  title?: string;
}

export function EarningsCard({ miners, title }: EarningsCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const { btcPerDay, sats } = useMemo(() => {
    const hps = miners.reduce(
      (sum, m) => sum + toHashesPerSecond(m.status?.hashRate ?? 0, m.status?.hashRateUnit),
      0,
    );
    const btc = estimateBTCPerDay(hps);
    return { btcPerDay: btc, sats: Math.round(btc * 100000000) };
  }, [miners]);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.textDim }]}>
        {title ?? t('earningsCard.title')}
      </Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={[styles.value, { color: theme.accent }]}>
            {sats > 0 ? formatBTC(btcPerDay) : '—'}
          </Text>
          <Text style={[styles.label, { color: theme.textDim }]}>{t('earningsCard.perDay')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.value, { color: theme.text }]}>
            {sats > 0 ? formatUSD(sats) : '—'}
          </Text>
          <Text style={[styles.label, { color: theme.textDim }]}>
            {t('earningsCard.perDayEst')}
          </Text>
        </View>
      </View>
      {sats > 0 && (
        <Text style={[styles.sats, { color: theme.textMuted }]}>
          {t('earningsCard.satDay', { sats: sats.toLocaleString() })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: 16,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flex: 1,
  },
  value: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.extrabold,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xxs,
  },
  sats: {
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
    textAlign: 'right',
  },
});
