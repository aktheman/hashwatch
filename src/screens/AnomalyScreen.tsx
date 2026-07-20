import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useMinerStore } from '../store/miners';
import { useTheme } from '../theme';
import { useTranslation } from 'react-i18next';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import {
  detectAnomalies,
  getHealthTrend,
  predictFailureProbability,
} from '../utils/anomalyDetection';
import type { Anomaly } from '../utils/anomalyDetection';
import type { MinerSnapshot } from '../types';
import { getSnapshots } from '../db/database';
import * as haptic from '../utils/haptics';

const REFRESH_INTERVAL = 60_000;

const ANOMALY_ICONS: Record<Anomaly['type'], string> = {
  hashrate_decline: '📉',
  temp_spike: '🌡️',
  share_rejection_spike: '🚫',
  voltage_fluctuation: '⚡',
  uptime_drop: '🔄',
};

function ConfidenceBar({ confidence, color }: { confidence: number; color: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.surfaceLight,
        overflow: 'hidden',
        flex: 1,
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${confidence * 100}%`,
          backgroundColor: color,
          borderRadius: 3,
        }}
      />
    </View>
  );
}

function FailureGauge({ probability }: { probability: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const color = probability > 0.7 ? theme.danger : probability > 0.4 ? '#ffaa00' : theme.success;
  const label = probability > 0.7 ? 'High' : probability > 0.4 ? 'Medium' : 'Low';
  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <Text
        style={{ color: theme.textDim, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
      >
        {t('anomalyDetection.failureProbability')}
      </Text>
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          borderWidth: 8,
          borderColor: theme.surfaceLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color, fontSize: fontSize.h2, fontWeight: fontWeight.bold }}>
          {Math.round(probability * 100)}%
        </Text>
        <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>{label}</Text>
      </View>
    </View>
  );
}

function HealthTrendIndicator({ trend }: { trend: 'improving' | 'stable' | 'degrading' }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const icon = trend === 'improving' ? '↑' : trend === 'degrading' ? '↓' : '→';
  const color =
    trend === 'improving' ? theme.success : trend === 'degrading' ? theme.danger : theme.textDim;
  const label = t(`anomalyDetection.${trend}`);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Text
        style={{ color: theme.textDim, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
      >
        {t('anomalyDetection.healthTrend')}:
      </Text>
      <Text style={{ color, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{icon}</Text>
      <Text style={{ color, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>{label}</Text>
    </View>
  );
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const isWarning = anomaly.severity === 'warning';
  const badgeColor = isWarning ? '#ffaa00' : theme.danger;
  const badgeBg = isWarning ? '#ffaa0020' : theme.danger + '20';
  const typeLabel = t(
    `anomalyDetection.${anomaly.type === 'hashrate_decline' ? 'hashrateDecline' : anomaly.type === 'temp_spike' ? 'tempSpike' : anomaly.type === 'share_rejection_spike' ? 'shareRejectionSpike' : anomaly.type === 'voltage_fluctuation' ? 'voltageFluctuation' : 'uptimeDrop'}`,
  );
  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: theme.border,
        gap: spacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={{ fontSize: 20 }}>{ANOMALY_ICONS[anomaly.type]}</Text>
          <Text style={{ color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
            {typeLabel}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: badgeBg,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.xs,
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: badgeColor, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
            {t(`anomalyDetection.${anomaly.severity}`)}
          </Text>
        </View>
      </View>
      <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>{anomaly.message}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
          {t('anomalyDetection.confidence')}:
        </Text>
        <ConfidenceBar
          confidence={anomaly.confidence}
          color={
            anomaly.confidence > 0.7
              ? theme.danger
              : anomaly.confidence > 0.4
                ? '#ffaa00'
                : theme.success
          }
        />
        <Text style={{ color: theme.textDim, fontSize: fontSize.xs }}>
          {Math.round(anomaly.confidence * 100)}%
        </Text>
      </View>
      <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>
        {new Date(anomaly.detectedAt).toLocaleString()}
      </Text>
    </View>
  );
}

export function AnomalyScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const miners = useMinerStore((s) => s.miners);
  const [selectedMinerId, setSelectedMinerId] = useState<string>(miners[0]?.id ?? '');
  const [snapshots, setSnapshots] = useState<MinerSnapshot[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSnapshots = useCallback(async () => {
    if (!selectedMinerId) return;
    const snaps = await getSnapshots(selectedMinerId, 50);
    setSnapshots(snaps);
  }, [selectedMinerId]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  useEffect(() => {
    const id = setInterval(loadSnapshots, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [loadSnapshots]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSnapshots();
    setRefreshing(false);
  }, [loadSnapshots]);

  const anomalies = useMemo(() => detectAnomalies(snapshots), [snapshots]);
  const healthTrend = useMemo(() => getHealthTrend(snapshots), [snapshots]);
  const failureProb = useMemo(() => predictFailureProbability(snapshots), [snapshots]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg, padding: spacing.md }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <Text
        style={{
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.md,
        }}
      >
        {t('anomalyDetection.title')}
      </Text>

      {miners.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing.md }}
        >
          {miners.map((m) => (
            <Pressable
              key={m.id}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radius.md,
                backgroundColor: selectedMinerId === m.id ? theme.primary : theme.surface,
                borderWidth: 1,
                borderColor: selectedMinerId === m.id ? theme.primary : theme.border,
                marginRight: spacing.xs,
              }}
              onPress={() => {
                haptic.selection();
                setSelectedMinerId(m.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Select miner ${m.name}`}
            >
              <Text
                style={{
                  color: selectedMinerId === m.id ? '#FFF' : theme.text,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {m.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
          flexWrap: 'wrap',
          gap: spacing.sm,
        }}
      >
        <HealthTrendIndicator trend={healthTrend} />
      </View>

      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <FailureGauge probability={failureProb} />
      </View>

      {anomalies.length === 0 ? (
        <View style={{ alignItems: 'center', padding: spacing.xl, gap: spacing.sm }}>
          <Text style={{ fontSize: 40 }}>✅</Text>
          <Text style={{ color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
            {t('anomalyDetection.noAnomalies')}
          </Text>
          <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>
            {t('anomalyDetection.healthyMiner')}
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {anomalies.map((a, i) => (
            <AnomalyCard key={`${a.type}-${i}`} anomaly={a} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
