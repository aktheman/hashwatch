import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { useTheme } from '../theme';
import { useTranslation } from 'react-i18next';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { rankPoolsByProfitability } from '../utils/profitabilitySwitch';
import type { PoolCandidate } from '../utils/profitabilitySwitch';
import * as haptic from '../utils/haptics';

const MOCK_CANDIDATES: PoolCandidate[] = [
  {
    name: 'Braiins Pool',
    url: 'stratum+tcp://stratum.braiins.com:3333',
    fee: 2,
    hashrate: 8.5e18,
    luck: 0.95,
    minPayout: 0.001,
    payoutFrequency: 'PPLNS',
  },
  {
    name: 'Luxor',
    url: 'stratum+tcp://stratum.luxor.tech:443',
    fee: 1.5,
    hashrate: 4.2e18,
    luck: 1.02,
    minPayout: 0.0005,
    payoutFrequency: 'Daily',
  },
  {
    name: 'F2Pool',
    url: 'stratum+tcp://stratum.f2pool.com:3333',
    fee: 2.5,
    hashrate: 12e18,
    luck: 0.98,
    minPayout: 0.005,
    payoutFrequency: 'PPLNS',
  },
  {
    name: 'ViaBTC',
    url: 'stratum+tcp://stratum.viabtc.com:3333',
    fee: 1,
    hashrate: 6e18,
    luck: 1.08,
    minPayout: 0.001,
    payoutFrequency: 'PPS+',
  },
];

interface SwitchRecord {
  from: string;
  to: string;
  timestamp: number;
  reason: string;
}

export function ProfitabilitySwitchScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [currentPool, setCurrentPool] = useState<string>(MOCK_CANDIDATES[0].name);
  const [autoSwitch, setAutoSwitch] = useState(false);
  const [threshold, setThreshold] = useState(10);
  const [switchHistory, setSwitchHistory] = useState<SwitchRecord[]>([]);
  const [minerHashrate] = useState(0.5);
  const [btcPrice] = useState(65000);

  const rankedPools = useMemo(
    () => rankPoolsByProfitability(MOCK_CANDIDATES, minerHashrate, btcPrice),
    [minerHashrate, btcPrice],
  );

  const handleSwitch = useCallback(
    (targetName: string) => {
      const target = MOCK_CANDIDATES.find((c) => c.name === targetName);
      if (!target) return;
      Alert.alert(t('profitabilitySwitch.switchTo'), `Switch to ${target.name}?`, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profitabilitySwitch.switchNow'),
          onPress: () => {
            haptic.success();
            setSwitchHistory((prev) => [
              {
                from: currentPool,
                to: target.name,
                timestamp: Date.now(),
                reason: 'Manual switch',
              },
              ...prev.slice(0, 9),
            ]);
            setCurrentPool(target.name);
          },
        },
      ]);
    },
    [currentPool, t],
  );

  const thresholds = [5, 10, 15, 20, 25, 30, 40, 50];

  const currentScore = rankedPools.find((p) => p.pool.name === currentPool);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg, padding: spacing.md }}>
      <Text
        style={{
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.md,
        }}
      >
        {t('profitabilitySwitch.title')}
      </Text>

      {currentScore && (
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.md,
            borderWidth: 1,
            borderColor: theme.primary,
          }}
        >
          <Text
            style={{
              color: theme.textDim,
              fontSize: fontSize.xs,
              fontWeight: fontWeight.bold,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            }}
          >
            {t('profitabilitySwitch.currentPool')}
          </Text>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text style={{ color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
              {currentScore.pool.name}
            </Text>
            <View
              style={{
                backgroundColor: theme.primary + '20',
                borderRadius: radius.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{ color: theme.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}
              >
                {t('profitabilitySwitch.score')}: {currentScore.score}
              </Text>
            </View>
          </View>
          <Text style={{ color: theme.textDim, fontSize: fontSize.sm, marginTop: spacing.xxs }}>
            {t('profitabilitySwitch.estimatedDaily')}: {currentScore.estimatedDailyBtc} BTC
          </Text>
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            {t('profitabilitySwitch.autoSwitch')}
          </Text>
        </View>
        <Switch
          value={autoSwitch}
          onValueChange={(v) => {
            haptic.selection();
            setAutoSwitch(v);
          }}
          trackColor={{ false: theme.border, true: theme.primary + '60' }}
          thumbColor={autoSwitch ? theme.primary : theme.textMuted}
          accessibilityLabel="Toggle auto-switch"
        />
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={{
            color: theme.text,
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
            marginBottom: spacing.xs,
          }}
        >
          {t('profitabilitySwitch.threshold')}: {threshold}%
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {thresholds.map((t) => (
              <Pressable
                key={t}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.md,
                  backgroundColor: threshold === t ? theme.primary : theme.surfaceLight,
                  borderWidth: 1,
                  borderColor: threshold === t ? theme.primary : theme.border,
                }}
                onPress={() => {
                  haptic.selection();
                  setThreshold(t);
                }}
              >
                <Text
                  style={{
                    color: threshold === t ? '#FFF' : theme.text,
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {t}%
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <Text
        style={{
          color: theme.textDim,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: spacing.xs,
        }}
      >
        Ranked Pools
      </Text>
      {rankedPools.map((p, i) => {
        const isCurrent = p.pool.name === currentPool;
        const isBest = i === 0 && !isCurrent;
        return (
          <View
            key={p.pool.name}
            style={{
              backgroundColor: theme.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.xs,
              borderWidth: 1,
              borderColor: isCurrent ? theme.primary : isBest ? theme.success : theme.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text
                  style={{
                    color: theme.textDim,
                    fontSize: fontSize.xs,
                    fontWeight: fontWeight.bold,
                  }}
                >
                  #{i + 1}
                </Text>
                <Text
                  style={{ color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}
                >
                  {p.pool.name}
                </Text>
                {isCurrent && (
                  <View
                    style={{
                      backgroundColor: theme.primary + '20',
                      borderRadius: radius.sm,
                      paddingHorizontal: spacing.xxs,
                      paddingVertical: 1,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.primary,
                        fontSize: fontSize.xs,
                        fontWeight: fontWeight.bold,
                      }}
                    >
                      Current
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={{ color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}
              >
                {p.score}
              </Text>
            </View>
            <Text style={{ color: theme.textDim, fontSize: fontSize.sm, marginTop: spacing.xxs }}>
              {t('profitabilitySwitch.estimatedDaily')}: {p.estimatedDailyBtc} BTC
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>
              Fee: {p.pool.fee}% · Luck: {(p.pool.luck * 100).toFixed(0)}% ·{' '}
              {p.pool.payoutFrequency}
            </Text>
            {p.reasons.length > 0 && (
              <View style={{ marginTop: spacing.xs, gap: 2 }}>
                {p.reasons.map((r, ri) => (
                  <Text key={ri} style={{ color: theme.textDim, fontSize: fontSize.xs }}>
                    • {r}
                  </Text>
                ))}
              </View>
            )}
            {!isCurrent && (
              <Pressable
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: radius.sm,
                  padding: spacing.xs,
                  alignItems: 'center',
                  marginTop: spacing.sm,
                }}
                onPress={() => handleSwitch(p.pool.name)}
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${p.pool.name}`}
              >
                <Text style={{ color: '#FFF', fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
                  {t('profitabilitySwitch.switchTo')}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}

      <View style={{ marginTop: spacing.md }}>
        <Text
          style={{
            color: theme.textDim,
            fontSize: fontSize.xs,
            fontWeight: fontWeight.bold,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: spacing.xs,
          }}
        >
          {t('profitabilitySwitch.switchHistory')}
        </Text>
        {switchHistory.length === 0 ? (
          <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>
            {t('profitabilitySwitch.noHistory')}
          </Text>
        ) : (
          switchHistory.map((h, i) => (
            <View
              key={i}
              style={{
                backgroundColor: theme.surface,
                borderRadius: radius.sm,
                padding: spacing.sm,
                marginBottom: spacing.xxs,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: fontSize.sm }}>
                {h.from} → {h.to}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>
                {new Date(h.timestamp).toLocaleString()} · {h.reason}
              </Text>
            </View>
          ))
        )}
      </View>

      <View
        style={{
          marginTop: spacing.lg,
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text
          style={{
            color: theme.text,
            fontSize: fontSize.md,
            fontWeight: fontWeight.bold,
            marginBottom: spacing.xs,
          }}
        >
          How It Works
        </Text>
        <Text style={{ color: theme.textDim, fontSize: fontSize.sm, lineHeight: 20 }}>
          The algorithm scores each pool based on three weighted factors:
        </Text>
        <Text
          style={{
            color: theme.textDim,
            fontSize: fontSize.sm,
            lineHeight: 20,
            marginTop: spacing.xs,
          }}
        >
          • Fee (40%): Lower fees earn higher scores{'\n'}• Luck (35%): Pools finding blocks faster
          than expected score higher{'\n'}• Payout (25%): PPS+ and daily payouts score higher than
          PPLNS
        </Text>
        <Text
          style={{
            color: theme.textDim,
            fontSize: fontSize.sm,
            lineHeight: 20,
            marginTop: spacing.xs,
          }}
        >
          Estimated daily BTC is calculated using your hashrate, pool hashrate, network difficulty,
          and pool luck.
        </Text>
      </View>
    </ScrollView>
  );
}
