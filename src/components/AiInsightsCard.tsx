import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight, cardStyle } from '../utils/design';

export interface AiInsight {
  type: 'recommendation' | 'warning' | 'optimization';
  title: string;
  description: string;
  impact: string;
}

interface AiInsightsCardProps {
  insights: AiInsight[];
}

const INSIGHT_ICONS: Record<AiInsight['type'], string> = {
  recommendation: '💡',
  warning: '⚠️',
  optimization: '⚡',
};

const INSIGHT_COLORS = {
  recommendation: 'success',
  warning: 'danger',
  optimization: 'info',
} as const;

export const AiInsightsCard = React.memo(function AiInsightsCard({
  insights,
}: AiInsightsCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          ...cardStyle(theme),
          padding: spacing.md,
          marginHorizontal: spacing.md,
          marginBottom: spacing.sm,
        },
        header: {
          fontSize: fontSize.sm,
          fontWeight: fontWeight.bold,
          color: theme.textDim,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: spacing.sm,
        },
        emptyContainer: {
          alignItems: 'center',
          paddingVertical: spacing.lg,
        },
        emptyText: {
          fontSize: fontSize.base,
          color: theme.textMuted,
          marginTop: spacing.xs,
        },
        insightRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.sm,
          marginBottom: spacing.sm,
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        lastInsight: {
          marginBottom: 0,
          paddingBottom: 0,
          borderBottomWidth: 0,
        },
        icon: {
          fontSize: fontSize.xl,
          marginTop: 2,
        },
        content: {
          flex: 1,
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
        },
        title: {
          fontSize: fontSize.base,
          fontWeight: fontWeight.bold,
          color: theme.text,
        },
        impactBadge: {
          paddingHorizontal: spacing.xxs,
          paddingVertical: 2,
          borderRadius: radius.xxs,
        },
        impactText: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
        },
        description: {
          fontSize: fontSize.sm,
          color: theme.textDim,
          marginTop: spacing.xxs,
          lineHeight: 18,
        },
      }),
    [theme],
  );

  if (insights.length === 0) {
    return (
      <View style={styles.card} accessibilityLabel={t('aiInsights.title')}>
        <Text style={styles.header}>{t('aiInsights.title')}</Text>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            {t('aiInsights.empty')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card} accessibilityLabel={t('aiInsights.title')}>
      <Text style={styles.header}>{t('aiInsights.title')}</Text>
      {insights.map((insight, idx) => {
        const colorKey = INSIGHT_COLORS[insight.type];
        const accentColor =
          colorKey === 'success'
            ? theme.success
            : colorKey === 'danger'
              ? theme.danger
              : theme.info;
        const isLast = idx === insights.length - 1;

        return (
          <View
            key={idx}
            style={[styles.insightRow, isLast && styles.lastInsight]}
            accessibilityLabel={`${insight.type}: ${insight.title}`}
          >
            <Text style={styles.icon}>{INSIGHT_ICONS[insight.type]}</Text>
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{insight.title}</Text>
                <View style={[styles.impactBadge, { backgroundColor: accentColor + '20' }]}>
                  <Text style={[styles.impactText, { color: accentColor }]}>{insight.impact}</Text>
                </View>
              </View>
              <Text style={styles.description}>{insight.description}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});
