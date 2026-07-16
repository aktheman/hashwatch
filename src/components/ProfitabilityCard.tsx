import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
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
import { usePoolAnalyticsStore } from '../store/poolAnalytics';
import { getSetting, setSetting } from '../db/database';

const POOL_FEE_RATE = 0.02;

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
  const poolStats = usePoolAnalyticsStore((s) => s.stats);

  const [hardwareCost, setHardwareCost] = useState<number | null>(null);
  const [hardwareCostInput, setHardwareCostInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    getSetting('hardware_cost').then((val) => {
      if (cancelled) return;
      if (val) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          setHardwareCost(num);
          setHardwareCostInput(String(num));
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleHardwareCostBlur = () => {
    const num = parseFloat(hardwareCostInput);
    if (!isNaN(num) && num >= 0) {
      setHardwareCost(num);
      setSetting('hardware_cost', String(num));
    } else {
      setHardwareCost(null);
      setHardwareCostInput('');
    }
  };

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
  const totalWatts = useMemo(
    () => miners.reduce((s, m) => s + (m.status?.power ?? 0), 0),
    [miners],
  );
  const usdPerDay = totalBtcDay * btcPrice;
  const dailyElectricityCost =
    typeof powerCost === 'number' && powerCost > 0 ? (totalWatts / 1000) * 24 * powerCost : 0;
  const dailyNet = usdPerDay - dailyElectricityCost;
  const poolFeeBtcDay = totalBtcDay * POOL_FEE_RATE;
  const netAfterPoolFeeBtcDay = totalBtcDay - poolFeeBtcDay;
  const monthlyElectricityCost =
    typeof powerCost === 'number' && powerCost > 0 ? (totalWatts / 1000) * 24 * 30 * powerCost : 0;
  const monthlyRevenue = totalBtcDay * 30 * btcPrice;
  const monthlyNet = monthlyRevenue - monthlyElectricityCost;
  const breakEvenDays =
    hardwareCost !== null && hardwareCost > 0 && monthlyNet > 0
      ? Math.ceil(hardwareCost / (monthlyNet / 30))
      : null;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={t('dashboardExtra.profitabilityTitle')}
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
          accessibilityLabel={t('dashboardExtra.netPerDay')}
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
              color: dailyNet > 0 ? theme.success : theme.danger,
              fontSize: fontSize.base,
              fontWeight: fontWeight.bold,
            }}
          >
            ${dailyNet.toFixed(2)}
          </Text>
        </View>
      )}
      {totalBtcDay > 0 && (
        <View
          accessibilityLabel={t('dashboardExtra.poolFeeNet')}
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
            {t('dashboardExtra.poolFeeNet')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text
              style={{
                color: theme.text,
                fontSize: fontSize.base,
                fontWeight: fontWeight.bold,
              }}
            >
              {formatBTC(netAfterPoolFeeBtcDay)}
              {t('dashboardExtra.perDay')}
            </Text>
            {btcPrice > 0 && (
              <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>
                (~${(netAfterPoolFeeBtcDay * btcPrice).toFixed(2)})
              </Text>
            )}
          </View>
        </View>
      )}
      {poolStats.length > 0 && totalBtcDay > 0 && (
        <View
          accessibilityLabel={t('dashboardExtra.estVsPool')}
          style={{
            backgroundColor: theme.surfaceLight,
            borderRadius: radius.md,
            padding: spacing.sm,
            gap: spacing.xs,
          }}
        >
          <Text
            style={{
              color: theme.textDim,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
            }}
          >
            {t('dashboardExtra.estVsPool')}
          </Text>
          {poolStats.map((ps) => {
            const variancePct =
              ps.btcEarned > 0 ? ((totalBtcDay - ps.btcEarned) / ps.btcEarned) * 100 : 0;
            return (
              <View key={ps.provider} style={{ gap: spacing.xxs }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: fontSize.sm }}>
                    {t('dashboardExtra.btcLabel')} ({ps.provider})
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
                    {t('dashboardExtra.perDay')}
                  </Text>
                  <Text style={{ color: theme.text, fontSize: fontSize.xs }}>
                    {formatBTC(totalBtcDay)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
                    {t('dashboardExtra.poolReported')}
                  </Text>
                  <Text style={{ color: theme.primary, fontSize: fontSize.xs }}>
                    {formatBTC(ps.btcEarned)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
                    {t('dashboardExtra.variance')}
                  </Text>
                  <Text
                    style={{
                      color: variancePct >= 0 ? theme.success : theme.danger,
                      fontSize: fontSize.xs,
                      fontWeight: fontWeight.bold,
                    }}
                  >
                    {variancePct >= 0 ? '+' : ''}
                    {variancePct.toFixed(1)}% {t('dashboardExtra.vsEstimated')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
      {(typeof powerCost === 'number' && powerCost > 0 && totalBtcDay > 0) ||
      hardwareCost !== null ? (
        <View
          accessibilityLabel={t('dashboardExtra.breakEvenAnalysis')}
          style={{
            backgroundColor: theme.surfaceLight,
            borderRadius: radius.md,
            padding: spacing.sm,
            gap: spacing.xs,
          }}
        >
          <Text
            style={{
              color: theme.textDim,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
            }}
          >
            {t('dashboardExtra.breakEvenAnalysis')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('dashboardExtra.hardwareInvestment')}
            </Text>
            <TextInput
              accessibilityLabel={t('dashboardExtra.hardwareInvestment')}
              placeholder={t('dashboardExtra.hardwareCostPlaceholder')}
              placeholderTextColor={theme.textDim}
              keyboardType="numeric"
              value={hardwareCostInput}
              onChangeText={setHardwareCostInput}
              onBlur={handleHardwareCostBlur}
              style={{
                backgroundColor: theme.surface,
                borderRadius: radius.xs,
                borderWidth: 1,
                borderColor: theme.border,
                color: theme.text,
                fontSize: fontSize.xs,
                paddingHorizontal: spacing.xs,
                paddingVertical: spacing.xxs,
                textAlign: 'right',
                minWidth: 100,
              }}
            />
          </View>
          {monthlyElectricityCost > 0 && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
                {t('dashboardExtra.monthlyElectricity')}
              </Text>
              <Text style={{ color: theme.text, fontSize: fontSize.xs }}>
                ${monthlyElectricityCost.toFixed(2)}
              </Text>
            </View>
          )}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('dashboardExtra.monthlyRevenue')}
            </Text>
            <Text style={{ color: theme.success, fontSize: fontSize.xs }}>
              ${monthlyRevenue.toFixed(2)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
              {t('dashboardExtra.monthlyNet')}
            </Text>
            <Text
              style={{
                color: monthlyNet > 0 ? theme.success : theme.danger,
                fontSize: fontSize.xs,
                fontWeight: fontWeight.bold,
              }}
            >
              ${monthlyNet.toFixed(2)}
            </Text>
          </View>
          {breakEvenDays !== null && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingTop: spacing.xxs,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {t('dashboardExtra.breakEvenDays')}
              </Text>
              <Text
                style={{
                  color: theme.primary,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.extrabold,
                }}
              >
                {breakEvenDays}
              </Text>
            </View>
          )}
          {breakEvenDays === null &&
            monthlyNet <= 0 &&
            hardwareCost !== null &&
            hardwareCost > 0 && (
              <Text
                style={{
                  color: theme.danger,
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {t('dashboardExtra.noBreakEven')}
              </Text>
            )}
        </View>
      ) : null}
    </View>
  );
});
