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
        borderRadius: 20,
        padding: 24,
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
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 24 }}>⬡</Text>
      </View>
      <Text
        style={{
          color: theme.text,
          fontSize: 22,
          fontWeight: '800',
          letterSpacing: -0.3,
          marginBottom: 4,
        }}
      >
        {miner.name}
      </Text>
      <Text
        style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'monospace', marginBottom: 16 }}
      >
        {miner.ip}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          borderRadius: 8,
          backgroundColor: theme.surfaceLight,
          padding: 12,
          width: '100%',
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              color: theme.textDim,
              fontSize: 9,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 2,
            }}
          >
            Hashrate
          </Text>
          <Text style={{ color: theme.primary, fontSize: 18, fontWeight: '800' }}>
            {s ? formatHashrate(s.hashRate, s.hashRateUnit) : '---'}
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: theme.border }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              color: theme.textDim,
              fontSize: 9,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 2,
            }}
          >
            Temp
          </Text>
          <Text
            style={{
              color: s && s.temperature > 70 ? theme.danger : theme.success,
              fontSize: 18,
              fontWeight: '800',
            }}
          >
            {s ? formatTemperature(s.temperature) : '---'}
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: theme.border }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              color: theme.textDim,
              fontSize: 9,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 2,
            }}
          >
            Uptime
          </Text>
          <Text style={{ color: theme.info, fontSize: 18, fontWeight: '800' }}>
            {s ? formatUptime(s.uptimeSeconds) : '---'}
          </Text>
        </View>
      </View>
      {s && (
        <View style={{ width: '100%', gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textDim, fontSize: 11 }}>Power</Text>
            <Text style={{ color: theme.text, fontSize: 11, fontWeight: '600' }}>
              {formatPower(s.power)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textDim, fontSize: 11 }}>Efficiency</Text>
            <Text style={{ color: theme.text, fontSize: 11, fontWeight: '600' }}>
              {formatWTHs(s.power, s.hashRate, s.hashRateUnit)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textDim, fontSize: 11 }}>Shares</Text>
            <Text style={{ color: theme.text, fontSize: 11, fontWeight: '600' }}>
              ✓{s.sharesAccepted} ✗{s.sharesRejected}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textDim, fontSize: 11 }}>Pool</Text>
            <Text
              style={{
                color: theme.text,
                fontSize: 11,
                fontWeight: '600',
                fontFamily: 'monospace',
              }}
              numberOfLines={1}
            >
              {s.pool?.replace(/^stratum\+tcp:\/\//, '').split(':')[0] || 'N/A'}
            </Text>
          </View>
        </View>
      )}
      <Text style={{ color: theme.textMuted, fontSize: 9, marginTop: 16 }}>
        Generated by HashWatch
      </Text>
    </View>
  );
}
