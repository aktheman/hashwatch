import { View, Text, Platform } from 'react-native';
import { Miner } from '../types';
import { useTheme } from '../theme';
import {
  formatHashrate,
  formatTemperature,
  formatUptime,
  formatPower,
  formatWTHs,
} from '../utils/formatters';
import {
  spacing,
  radius,
  fontSize,
  fontWeight,
  cardStyle,
  statLabel,
  statValue,
  headerSub,
} from '../utils/design';

interface MinerSnapshotCardProps {
  miner: Miner;
}

export function MinerSnapshotCard({ miner }: MinerSnapshotCardProps) {
  const theme = useTheme();
  const s = miner.status;

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: radius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: theme.border,
        alignItems: 'center',
        ...(Platform.OS !== 'android'
          ? { boxShadow: `0 8px 32px ${theme.glow}` }
          : { elevation: 8 }),
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: miner.isOnline ? theme.success + '20' : theme.danger + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.sm,
        }}
      >
        <Text style={{ fontSize: 24 }}>⬡</Text>
      </View>
      <Text
        style={{
          color: theme.text,
          fontSize: fontSize.h2,
          fontWeight: fontWeight.extrabold,
          letterSpacing: -0.3,
          marginBottom: spacing.xxs,
        }}
      >
        {miner.name}
      </Text>
      <Text
        style={{
          color: theme.textMuted,
          ...headerSub,
          fontFamily: 'monospace',
          marginBottom: spacing.md,
        }}
      >
        {miner.ip}
      </Text>
      <View
        style={{
          ...cardStyle(theme),
          backgroundColor: theme.surfaceLight,
          padding: spacing.sm,
          marginBottom: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={statLabel}>Hashrate</Text>
            <Text
              style={{
                color: theme.primary,
                ...statValue,
              }}
            >
              {s ? formatHashrate(s.hashRate, s.hashRateUnit) : '---'}
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: theme.border }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={statLabel}>Temp</Text>
            <Text
              style={{
                color: s && s.temperature > 70 ? theme.danger : theme.success,
                ...statValue,
              }}
            >
              {s ? formatTemperature(s.temperature) : '---'}
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: theme.border }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={statLabel}>Uptime</Text>
            <Text style={{ color: theme.info, ...statValue }}>
              {s ? formatUptime(s.uptimeSeconds) : '---'}
            </Text>
          </View>
        </View>
      </View>
      {s && (
        <View style={{ width: '100%', gap: spacing.xxs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>Power</Text>
            <Text
              style={{ color: theme.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
            >
              {formatPower(s.power)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>Efficiency</Text>
            <Text
              style={{ color: theme.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
            >
              {formatWTHs(s.power, s.hashRate, s.hashRateUnit)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>Shares</Text>
            <Text
              style={{ color: theme.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
            >
              ✓{s.sharesAccepted} ✗{s.sharesRejected}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>Pool</Text>
            <Text
              style={{
                color: theme.text,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                fontFamily: 'monospace',
              }}
              numberOfLines={1}
            >
              {s.pool?.replace(/^stratum\+tcp:\/\//, '').split(':')[0] || 'N/A'}
            </Text>
          </View>
        </View>
      )}
      <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, marginTop: spacing.md }}>
        Generated by HashWatch
      </Text>
    </View>
  );
}
