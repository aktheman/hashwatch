import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { HealthPrediction, Prediction } from '../utils/healthPredictions';

interface HealthPredictionCardProps {
  prediction: HealthPrediction;
}

const TYPE_KEY_MAP: Record<string, string> = {
  fan_failure: 'healthPrediction.fanFailure',
  thermal_throttle: 'healthPrediction.thermalThrottle',
  hashrate_decline: 'healthPrediction.hashrateDecline',
  share_rejection_spike: 'healthPrediction.shareRejectionSpike',
  power_anomaly: 'healthPrediction.powerAnomaly',
};

const ACTION_KEY_MAP: Record<string, string> = {
  cleanFanVents: 'healthPrediction.cleanFanVents',
  checkThermalPaste: 'healthPrediction.checkThermalPaste',
  verifyPoolConnection: 'healthPrediction.verifyPoolConnection',
  reduceOverclock: 'healthPrediction.reduceOverclock',
  checkPowerSupply: 'healthPrediction.checkPowerSupply',
};

function riskColor(
  level: string,
  theme: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  },
): string {
  switch (level) {
    case 'low':
      return theme.success;
    case 'medium':
      return theme.warning;
    case 'high':
      return '#F97316';
    case 'critical':
      return theme.danger;
    default:
      return theme.info;
  }
}

function ProbabilityBar({ probability, color }: { probability: number; color: string }) {
  return (
    <View style={probStyles.track}>
      <View
        style={[
          probStyles.fill,
          { width: `${Math.round(probability * 100)}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const probStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});

function PredictionRow({
  prediction,
  theme,
  t,
}: {
  prediction: Prediction;
  theme: ReturnType<typeof useTheme>;
  t: (key: string) => string;
}) {
  const color = riskColor(
    prediction.probability >= 0.7
      ? 'critical'
      : prediction.probability >= 0.5
        ? 'high'
        : prediction.probability >= 0.25
          ? 'medium'
          : 'low',
    theme,
  );
  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.header}>
        <Text style={[rowStyles.type, { color: theme.text }]}>
          {t(TYPE_KEY_MAP[prediction.type])}
        </Text>
        <Text style={[rowStyles.prob, { color }]}>{Math.round(prediction.probability * 100)}%</Text>
      </View>
      <ProbabilityBar probability={prediction.probability} color={color} />
      <View style={rowStyles.meta}>
        <Text style={[rowStyles.timeframe, { color: theme.textDim }]}>{prediction.timeframe}</Text>
        <Text style={[rowStyles.evidence, { color: theme.textMuted }]} numberOfLines={2}>
          {prediction.evidence}
        </Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  type: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  prob: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  meta: {
    marginTop: spacing.xxs,
  },
  timeframe: {
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  evidence: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
});

export const HealthPredictionCard = React.memo(function HealthPredictionCard({
  prediction,
}: HealthPredictionCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const color = riskColor(prediction.riskLevel, theme);

  const hasPredictions = prediction.predictions.length > 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
          <Text style={[styles.badgeText, { color }]}>
            {t(`healthPrediction.riskLevel.${prediction.riskLevel}`)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>{t('healthPrediction.title')}</Text>
          <Text style={[styles.score, { color: theme.textDim }]}>
            {t('healthPrediction.overallScore', { score: prediction.overallScore })}
          </Text>
        </View>
      </View>

      {hasPredictions ? (
        <View style={styles.predictions}>
          {prediction.predictions.map((p, i) => (
            <PredictionRow key={`${p.type}-${i}`} prediction={p} theme={theme} t={t} />
          ))}
        </View>
      ) : (
        <Text style={[styles.noData, { color: theme.textMuted }]}>
          {t('healthPrediction.noData')}
        </Text>
      )}

      {prediction.recommendedActions.length > 0 && (
        <View style={styles.actions}>
          <Text style={[styles.actionsTitle, { color: theme.text }]}>
            {t('healthPrediction.recommendedActions')}
          </Text>
          {prediction.recommendedActions.map((action) => (
            <View key={action} style={styles.actionRow}>
              <Text style={[styles.actionDot, { color }]}>●</Text>
              <Text style={[styles.actionText, { color: theme.textDim }]}>
                {t(ACTION_KEY_MAP[action])}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  score: {
    fontSize: fontSize.sm,
  },
  predictions: {
    marginTop: spacing.xs,
  },
  noData: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  actions: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  actionsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  actionDot: {
    fontSize: 8,
  },
  actionText: {
    fontSize: fontSize.sm,
  },
});
