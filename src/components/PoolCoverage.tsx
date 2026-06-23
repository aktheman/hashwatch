import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme';

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
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 14,
        boxShadow: `0 1px 14px ${theme.glow}`,
      }}
    >
      <Text
        style={{
          color: theme.textDim,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontSize: 11,
          fontWeight: '700',
        }}
      >
        Pool coverage
      </Text>

      <View
        style={{
          marginTop: 10,
          height: 10,
          borderRadius: 999,
          backgroundColor: theme.border,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 10,
            borderRadius: 999,
            backgroundColor: getColor(),
            width: `${coverage}%`,
          }}
        />
      </View>

      <View
        style={{
          marginTop: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Top pool</Text>
        <Text style={{ color: getColor(), fontSize: 20, fontWeight: '900' }}>{coverage}%</Text>
      </View>

      <Text
        style={{
          color: theme.textDim,
          fontSize: 11,
          marginTop: 2,
        }}
      >
        {pools?.[0]?.name || 'No pool data'}
      </Text>
    </View>
  );
}
