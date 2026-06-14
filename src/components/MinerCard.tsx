import { memo, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { Miner } from '../types';
import {
  formatHashrate,
  formatTemperature,
  formatUptime,
  formatPower,
  formatWTHs,
} from '../utils/formatters';
import { useTheme } from '../theme';

interface MinerCardProps {
  miner: Miner;
  onPress: (miner: Miner) => void;
  onDelete?: (miner: Miner) => void;
}

export const MinerCard = memo(function MinerCard({ miner, onPress, onDelete }: MinerCardProps) {
  const theme = useTheme();
  const accentColor = miner.isOnline ? theme.success : theme.danger;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: theme.surface,
          borderRadius: 20,
          padding: 16,
          marginHorizontal: 16,
          marginVertical: 6,
          borderWidth: 1,
          borderColor: theme.border,
          ...(Platform.OS !== 'android'
            ? { boxShadow: `0 4px 24px ${theme.glow}` }
            : { elevation: 4 }),
          position: 'relative',
          overflow: 'hidden',
        },
        cardAccent: {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: accentColor,
          borderTopLeftRadius: 20,
          borderBottomLeftRadius: 20,
        },
        cardOffline: {
          opacity: 0.55,
        },
        topRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
          paddingLeft: 4,
        },
        nameRow: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        dot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          marginRight: 8,
        },
        name: {
          color: theme.text,
          fontSize: 16,
          fontWeight: '700',
          flex: 1,
          letterSpacing: -0.3,
        },
        pulse: {
          width: 28,
          height: 28,
          borderRadius: 14,
          justifyContent: 'center',
          alignItems: 'center',
          ...(Platform.OS !== 'android'
            ? { boxShadow: `0 0 12px ${accentColor}40` }
            : { elevation: 2 }),
        },
        pulseInner: {
          width: 8,
          height: 8,
          borderRadius: 4,
        },
        ip: {
          color: theme.textMuted,
          fontSize: 11,
          fontFamily: 'monospace',
          marginBottom: 10,
          marginLeft: 12,
        },
        divider: {
          height: 1,
          backgroundColor: theme.border,
          marginBottom: 12,
        },
        stats: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        statItem: {
          flex: 1,
        },
        statDivider: {
          width: 1,
          height: 32,
          backgroundColor: theme.border,
          marginHorizontal: 10,
        },
        statLabel: {
          color: theme.textDim,
          fontSize: 9,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 2,
        },
        statValue: {
          fontSize: 18,
          fontWeight: '800',
        },
        footer: {
          flexDirection: 'row',
          gap: 16,
          marginTop: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        },
        footerItem: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        footerIcon: {
          fontSize: 10,
          color: theme.textMuted,
        },
        footerText: {
          color: theme.textDim,
          fontSize: 11,
          fontWeight: '600',
        },
        subFooter: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        },
        powerText: {
          color: theme.textDim,
          fontSize: 11,
          fontWeight: '600',
        },
        poolText: {
          color: theme.textMuted,
          fontSize: 10,
          fontFamily: 'monospace',
          flex: 1,
          textAlign: 'right',
        },
      }),
    [theme, accentColor],
  );

  const { status, isOnline } = miner;
  const hashrate = status ? formatHashrate(status.hashRate, status.hashRateUnit) : '---';
  const tempColor = !status
    ? theme.textMuted
    : status.temperature > 80
      ? theme.danger
      : status.temperature > 65
        ? theme.warning
        : theme.success;

  const handleLongPress = useCallback(() => {
    if (!onDelete) return;
    Alert.alert('Remove Miner', `Remove ${miner.name}? All history will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onDelete(miner),
      },
    ]);
  }, [miner, onDelete]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${miner.name}, ${miner.isOnline ? 'online' : 'offline'}, ${hashrate}`}
      style={[styles.card, !isOnline && styles.cardOffline]}
      onPress={() => onPress(miner)}
      onLongPress={handleLongPress}
      delayLongPress={600}
      activeOpacity={0.7}
    >
      <View style={styles.cardAccent} />
      <View style={styles.topRow}>
        <View style={styles.nameRow}>
          <View style={[styles.dot, { backgroundColor: accentColor }]} />
          <Text style={styles.name} numberOfLines={1}>
            {miner.name}
          </Text>
        </View>
        <View style={[styles.pulse, { backgroundColor: accentColor + '20' }]}>
          <View style={[styles.pulseInner, { backgroundColor: accentColor }]} />
        </View>
      </View>

      <Text style={styles.ip}>{miner.ip}</Text>

      <View style={styles.divider} />

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Hashrate</Text>
          <Text style={[styles.statValue, { color: theme.primary }]}>{hashrate}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Temp</Text>
          <Text style={[styles.statValue, { color: tempColor }]}>
            {status ? formatTemperature(status.temperature) : '---'}
          </Text>
        </View>
        {status && status.fanSpeed > 0 && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Fan</Text>
              <Text style={[styles.statValue, { color: theme.info }]}>
                {status.fanRpm > 0 ? `${status.fanRpm}` : `${status.fanSpeed}%`}
              </Text>
            </View>
          </>
        )}
      </View>

      {status && (
        <>
          <View style={styles.footer}>
            <View style={styles.footerItem}>
              <Text style={styles.footerIcon}>⏱</Text>
              <Text style={styles.footerText}>{formatUptime(status.uptimeSeconds)}</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerIcon}>✓</Text>
              <Text style={styles.footerText}>{status.sharesAccepted}</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerIcon}>✗</Text>
              <Text style={styles.footerText}>{status.sharesRejected}</Text>
            </View>
            {status.fanRpm > 0 && (
              <View style={styles.footerItem}>
                <Text style={styles.footerIcon}>🌀</Text>
                <Text style={styles.footerText}>{status.fanRpm}</Text>
              </View>
            )}
          </View>
          <View style={styles.subFooter}>
            <Text style={styles.powerText}>
              {formatPower(status.power)} ·{' '}
              {formatWTHs(status.power, status.hashRate, status.hashRateUnit)}
            </Text>
            <Text style={styles.poolText} numberOfLines={1}>
              {status.pool && status.poolPort
                ? `${status.pool}:${status.poolPort}`
                : status.pool || 'No pool'}
            </Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
});
