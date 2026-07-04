import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';

interface PoolStats {
  id: string;
  name: string;
  minerCount: number;
  totalHashrate: number;
  unit?: string;
}

interface PoolCoverageProps {
  pools: PoolStats[];
  minersCount: number;
}

export function PoolCoverage({ pools, minersCount }: PoolCoverageProps) {
  const theme = useTheme();

  const coverage = useMemo(() => {
    if (!pools.length) return 0;
    if (minersCount <= 0) return 0;
    // Hver pool dekker en andel av minerne; sum kan overstige 100 hvis miner er fordelt på flere pools.
    // Her viser vi den høyeste pooldelingen som et dekningstrekk.
    const maxPoolMiners = Math.max(...pools.map((p) => p.minerCount));
    const ratio = maxPoolMiners / minersCount;
    return Math.min(100, Math.round(ratio * 100));
  }, [pools, minersCount]);

  const getColor = () => {
    if (coverage >= 75) return theme.success;
    if (coverage >= 40) return theme.primary;
    return theme.danger;
  };

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: theme.border,
        padding: spacing.sm,
        boxShadow: `0 1px 14px ${theme.glow}`,
      }}
    >
      <Text
        style={{
          color: theme.textDim,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.bold,
        }}
      >
        Pool coverage
      </Text>

      <View
        style={{
          marginTop: spacing.xs,
          height: spacing.xs,
          borderRadius: radius.full,
          backgroundColor: theme.border,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: spacing.xs,
            borderRadius: radius.full,
            backgroundColor: getColor(),
            width: `${coverage}%`,
          }}
        />
      </View>

      <View
        style={{
          marginTop: spacing.xs,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
          Top pool
        </Text>
        <Text
          style={{ color: getColor(), fontSize: fontSize.h3, fontWeight: fontWeight.extrabold }}
        >
          {coverage}%
        </Text>
      </View>

      <Text
        style={{
          color: theme.textDim,
          fontSize: fontSize.sm,
          marginTop: spacing.xxs,
        }}
      >
        {pools?.[0]?.name || 'No pool data'}
      </Text>
    </View>
  );
}
