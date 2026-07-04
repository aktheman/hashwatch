import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { fetchPoolChanges, type PoolChangeEntry } from '../api/client';

interface Props {
  minerId: string;
}

function formatTime(ts: number): string {
  const elapsed = Date.now() - ts;
  if (elapsed < 60000) return '<1m';
  if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m`;
  if (elapsed < 86400000) return `${Math.floor(elapsed / 3600000)}h`;
  return `${Math.floor(elapsed / 86400000)}d`;
}

export function PoolChangeHistory({ minerId }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [changes, setChanges] = useState<PoolChangeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchPoolChanges(minerId, 5)
      .then((data) => {
        if (!cancelled) setChanges(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [minerId]);

  if (loading) {
    return (
      <ActivityIndicator
        size="small"
        color={theme.textMuted}
        style={{ marginVertical: spacing.xs }}
      />
    );
  }

  if (error || changes.length === 0) return null;

  return (
    <View style={{ marginTop: spacing.xs, gap: spacing.xxs }}>
      <Text
        style={{
          color: theme.textDim,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {t('minerDetail.recentPoolChanges', 'Recent Pool Changes')}
      </Text>
      {changes.map((c, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.surfaceLight,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.xs,
            paddingVertical: spacing.xxs,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
            {c.previouspool && (
              <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }} numberOfLines={1}>
                {c.previouspool}
              </Text>
            )}
            <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>→</Text>
            <Text
              style={{
                color: theme.warning,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.bold,
              }}
              numberOfLines={1}
            >
              {c.newpool}
            </Text>
          </View>
          <Text style={{ color: theme.textDim, fontSize: fontSize.xs, marginLeft: spacing.xs }}>
            {formatTime(c.changedat)}
          </Text>
        </View>
      ))}
    </View>
  );
}
