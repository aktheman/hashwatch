import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { Miner } from '../types';
import { estimateBTCPerDay, formatBTC, getBTCPrice, formatHashrateValue } from '../utils/hashrate';

interface EarningsForecastProps {
  miners: Miner[];
  powerCost?: number;
}

interface ProjectionRowProps {
  label: string;
  btcAmount: number;
  btcPrice: number;
  color: string;
}

function ProjectionRow({ label, btcAmount, btcPrice, color }: ProjectionRowProps) {
  const theme = useTheme();
  const usd = btcAmount * btcPrice;
  return (
    <View style={[projStyles.row, { borderBottomColor: theme.border }]}>
      <Text style={[projStyles.label, { color: theme.text }]}>{label}</Text>
      <View style={projStyles.values}>
        <Text style={[projStyles.btc, { color }]}>{formatBTC(btcAmount)}</Text>
        {btcPrice > 0 && (
          <Text style={[projStyles.usd, { color: theme.textDim }]}>
            ~${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </Text>
        )}
      </View>
    </View>
  );
}

export const EarningsForecast = React.memo(function EarningsForecast({
  miners,
  powerCost,
}: EarningsForecastProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const forecast = useMemo(() => {
    const totalHps = miners.reduce((sum, m) => {
      const hr = m.status?.hashRate ?? 0;
      const unit = m.status?.hashRateUnit;
      const multiplier =
        unit === 'KH/s'
          ? 1e3
          : unit === 'MH/s'
            ? 1e6
            : unit === 'GH/s'
              ? 1e9
              : unit === 'TH/s'
                ? 1e12
                : unit === 'PH/s'
                  ? 1e15
                  : 1;
      return sum + hr * multiplier;
    }, 0);

    const btcPerDay = estimateBTCPerDay(totalHps);
    const btcPrice = getBTCPrice();
    const usdPerDay = btcPerDay * btcPrice;

    const totalPowerW = miners.reduce((sum, m) => sum + (m.status?.power ?? 0), 0);
    const dailyPowerCost = powerCost ? (totalPowerW / 1000) * 24 * powerCost : 0;

    return {
      totalHps,
      btcPerDay,
      btcPrice,
      usdPerDay,
      dailyPowerCost,
      projections: {
        '1d': btcPerDay,
        '7d': btcPerDay * 7,
        '30d': btcPerDay * 30,
        '90d': btcPerDay * 90,
        '1y': btcPerDay * 365,
      },
    };
  }, [miners, powerCost]);

  const onlineMiners = miners.filter((m) => m.isOnline);

  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      accessible
      accessibilityRole="summary"
    >
      <Text style={[styles.title, { color: theme.textDim }]}>
        {t('analytics.earningsForecast', 'Earnings Forecast')}
      </Text>

      <View style={[styles.summaryRow, { backgroundColor: theme.surfaceLight }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.textDim }]}>
            {t('analytics.hashrate', 'Hashrate')}
          </Text>
          <Text style={[styles.summaryValue, { color: theme.primary }]}>
            {formatHashrateValue(forecast.totalHps)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.textDim }]}>
            {t('analytics.miners', 'Miners')}
          </Text>
          <Text style={[styles.summaryValue, { color: theme.primary }]}>
            {onlineMiners.length}/{miners.length}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.textDim }]}>
            {t('analytics.power', 'Power')}
          </Text>
          <Text style={[styles.summaryValue, { color: theme.primary }]}>
            {miners.reduce((s, m) => s + (m.status?.power ?? 0), 0).toFixed(0)}W
          </Text>
        </View>
      </View>

      <View style={styles.projections}>
        <ProjectionRow
          label={t('forecast.oneDay', '1 Day')}
          btcAmount={forecast.projections['1d']}
          btcPrice={forecast.btcPrice}
          color={theme.success}
        />
        <ProjectionRow
          label={t('forecast.sevenDays', '7 Days')}
          btcAmount={forecast.projections['7d']}
          btcPrice={forecast.btcPrice}
          color={theme.info}
        />
        <ProjectionRow
          label={t('forecast.thirtyDays', '30 Days')}
          btcAmount={forecast.projections['30d']}
          btcPrice={forecast.btcPrice}
          color={theme.primary}
        />
        <ProjectionRow
          label={t('forecast.ninetyDays', '90 Days')}
          btcAmount={forecast.projections['90d']}
          btcPrice={forecast.btcPrice}
          color={theme.warning}
        />
        <ProjectionRow
          label={t('forecast.oneYear', '1 Year')}
          btcAmount={forecast.projections['1y']}
          btcPrice={forecast.btcPrice}
          color={theme.accent || theme.primary}
        />
      </View>

      {forecast.dailyPowerCost > 0 && forecast.btcPerDay > 0 && (
        <View style={[styles.netRow, { borderTopColor: theme.border }]}>
          <Text style={[styles.netLabel, { color: theme.textDim }]}>
            {t('analytics.netDaily', 'Net/day (after power)')}
          </Text>
          <Text
            style={[
              styles.netValue,
              {
                color:
                  forecast.usdPerDay - forecast.dailyPowerCost > 0 ? theme.success : theme.danger,
              },
            ]}
          >
            ~${(forecast.usdPerDay - forecast.dailyPowerCost).toFixed(2)}
          </Text>
        </View>
      )}

      {forecast.btcPrice > 0 && (
        <Text style={[styles.btcPrice, { color: theme.textDim }]}>
          BTC ${forecast.btcPrice.toLocaleString()}
        </Text>
      )}
    </View>
  );
});

const projStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
  },
  values: {
    alignItems: 'flex-end',
  },
  btc: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  usd: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
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
  summaryRow: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  summaryValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  projections: {
    gap: 0,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
  },
  netLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  netValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  btcPrice: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
