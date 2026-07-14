import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { Miner } from '../types';
import {
  estimateBTCPerDay,
  formatBTC,
  formatHashrateValue,
  getBTCPrice,
  getBTCPriceHistory,
  getNetworkHashrate,
} from '../utils/hashrate';

export const ProfitabilityCard = React.memo(function ProfitabilityCard({
  miners,
  powerCost,
}: {
  miners: Miner[];
  powerCost?: number;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const btcPrice = getBTCPrice();
  const priceHistory = getBTCPriceHistory();
  const netHash = getNetworkHashrate();

  const priceTrend =
    priceHistory.length >= 2 ? priceHistory[priceHistory.length - 1] - priceHistory[0] : 0;

  const perMiner = useMemo(
    () =>
      miners.map((m) => {
        const hps =
          (m.status?.hashRate ?? 0) *
          (() => {
            const u = m.status?.hashRateUnit;
            if (u === 'KH/s') return 1e3;
            if (u === 'MH/s') return 1e6;
            if (u === 'GH/s') return 1e9;
            if (u === 'TH/s') return 1e12;
            if (u === 'PH/s') return 1e15;
            return 1;
          })();
        const btcDay = estimateBTCPerDay(hps);
        return { ...m, btcPerDay: btcDay, hps };
      }),
    [miners],
  );

  const totalBtcDay = useMemo(() => perMiner.reduce((sum, m) => sum + m.btcPerDay, 0), [perMiner]);

  const usdPerDay = totalBtcDay * btcPrice;

  return (
    <View
      style={{
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        backgroundColor: theme.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 16,
        gap: spacing.xl,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>
          {t('dashboardExtra.profitabilityTitle')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {priceHistory.length >= 4 && (
            <Svg width={36} height={20}>
              <Polyline
                points={priceHistory
                  .map((p, i) => {
                    const x = (i / (priceHistory.length - 1)) * 34;
                    const min = Math.min(...priceHistory);
                    const max = Math.max(...priceHistory);
                    const range = max - min || 1;
                    const y = 18 - ((p - min) / range) * 16;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke={priceTrend >= 0 ? theme.success : theme.danger}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
          <Text
            style={{ color: theme.textDim, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
          >
            {t('dashboardExtra.btcLabel')}
          </Text>
          <Text
            style={{ color: theme.text, fontSize: fontSize.base, fontWeight: fontWeight.extrabold }}
          >
            ${btcPrice.toLocaleString()}
          </Text>
          {priceHistory.length >= 2 && (
            <Text
              style={{
                color: priceTrend >= 0 ? theme.success : theme.danger,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.bold,
              }}
            >
              {priceTrend >= 0 ? '▲' : '▼'}{' '}
              {((Math.abs(priceTrend) / priceHistory[0]) * 100).toFixed(1)}%
            </Text>
          )}
        </View>
      </View>
      {/* Network hashrate row */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        }}
      >
        <Text
          style={{ color: theme.textDim, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
        >
          {t('dashboardExtra.networkHashrate')}
        </Text>
        <Text style={{ color: theme.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
          {formatHashrateValue(netHash)}
        </Text>
      </View>
      {perMiner.map((m) => (
        <View
          key={m.id}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: spacing.xxs,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Text
            style={{
              color: theme.text,
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {m.name || m.id}
          </Text>
          <Text
            style={{ color: theme.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}
          >
            {formatBTC(m.btcPerDay)}
            {t('dashboardExtra.perDay')}
          </Text>
          {btcPrice > 0 && (
            <Text style={{ color: theme.textDim, fontSize: fontSize.sm, marginLeft: 6 }}>
              (~${(m.btcPerDay * btcPrice).toFixed(2)})
            </Text>
          )}
        </View>
      ))}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 6,
        }}
      >
        <Text
          style={{ color: theme.text, fontSize: fontSize.base, fontWeight: fontWeight.extrabold }}
        >
          {t('dashboardExtra.total')}
        </Text>
        <Text
          style={{
            color: theme.success,
            fontSize: fontSize.base,
            fontWeight: fontWeight.extrabold,
          }}
        >
          {formatBTC(totalBtcDay)}
          {t('dashboardExtra.perDay')}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{ color: theme.textDim, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}
          >
            {t('dashboardExtra.week')}
          </Text>
          <Text style={{ color: theme.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
            {formatBTC(totalBtcDay * 7)}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{ color: theme.textDim, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}
          >
            {t('dashboardExtra.month')}
          </Text>
          <Text style={{ color: theme.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
            {formatBTC(totalBtcDay * 30)}
          </Text>
        </View>
        {btcPrice > 0 && (
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                color: theme.textDim,
                fontSize: fontSize.xs,
                fontWeight: fontWeight.semibold,
              }}
            >
              {t('dashboardExtra.usdPerDay')}
            </Text>
            <Text
              style={{ color: theme.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}
            >
              ~${usdPerDay.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
      {typeof powerCost === 'number' && powerCost > 0 && totalBtcDay > 0 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 4,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}
        >
          <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>
            {t('dashboardExtra.netPerDay')}
          </Text>
          <Text
            style={{
              color:
                totalBtcDay * btcPrice -
                  (miners.reduce((s, m) => s + (m.status?.power ?? 0), 0) / 1000) * 24 * powerCost >
                0
                  ? theme.success
                  : theme.danger,
              fontSize: fontSize.base,
              fontWeight: fontWeight.bold,
            }}
          >
            $
            {(
              totalBtcDay * btcPrice -
              (miners.reduce((s, m) => s + (m.status?.power ?? 0), 0) / 1000) * 24 * powerCost
            ).toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  );
});
