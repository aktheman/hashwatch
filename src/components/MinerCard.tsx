import { memo, useMemo, useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Miner } from '../types';
import {
  formatHashrate,
  formatTemperature,
  formatUptime,
  formatPower,
  formatWTHs,
} from '../utils/formatters';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';

interface MinerCardProps {
  miner: Miner;
  onPress: (miner: Miner) => void;
  onDelete?: (miner: Miner) => void;
  onRename?: (minerId: string, name: string) => void;
  onClone?: (miner: Miner) => void;
}

export const MinerCard = memo(
  function MinerCard({ miner, onPress, onDelete, onRename, onClone }: MinerCardProps) {
    const theme = useTheme();
    const { t } = useTranslation();
    const accentColor = miner.isOnline ? theme.success : theme.danger;
    const styles = useMemo(
      () =>
        StyleSheet.create({
          card: {
            backgroundColor: theme.surface,
            borderRadius: radius.xl,
            padding: spacing.md,
            marginHorizontal: spacing.md,
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
            marginBottom: spacing.xxs,
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
            marginRight: spacing.xs,
          },
          name: {
            color: theme.text,
            fontSize: fontSize.lg,
            fontWeight: fontWeight.bold,
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
            fontSize: fontSize.sm,
            fontFamily: 'monospace',
            marginBottom: 10,
            marginLeft: spacing.sm,
          },
          divider: {
            height: 1,
            backgroundColor: theme.border,
            marginBottom: spacing.sm,
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
            fontSize: fontSize.xs,
            fontWeight: fontWeight.bold,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 2,
          },
          statValue: {
            fontSize: fontSize.xl,
            fontWeight: fontWeight.extrabold,
          },
          footer: {
            flexDirection: 'row',
            gap: spacing.md,
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          },
          footerItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xxs,
          },
          footerIcon: {
            fontSize: fontSize.xs,
            color: theme.textMuted,
          },
          footerText: {
            color: theme.textDim,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
          },
          subFooter: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing.xs,
            paddingTop: spacing.xs,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          },
          powerText: {
            color: theme.textDim,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
          },
          poolText: {
            color: theme.textMuted,
            fontSize: fontSize.xs,
            fontFamily: 'monospace',
            flex: 1,
            textAlign: 'right',
          },
        }),
      [theme, accentColor],
    );

    const [editingName, setEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');

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
      const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
        { text: t('common.cancel'), style: 'cancel' },
      ];
      if (onClone) {
        buttons.push({
          text: 'Clone',
          onPress: () => onClone(miner),
        });
      }
      if (onDelete) {
        buttons.push({
          text: t('minerCard.remove'),
          style: 'destructive',
          onPress: () => onDelete(miner),
        });
      }
      Alert.alert(
        t('minerCard.removeMiner'),
        t('minerCard.removeConfirm', { name: miner.name }),
        buttons,
      );
    }, [miner, onDelete, onClone, t]);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${miner.name}, ${miner.isOnline ? 'online' : 'offline'}, ${hashrate}`}
        style={[styles.card, !isOnline && styles.cardOffline]}
        onPress={() => onPress(miner)}
        onLongPress={handleLongPress}
        delayLongPress={600}
      >
        <View style={styles.cardAccent} />
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <View style={[styles.dot, { backgroundColor: accentColor }]} />
            {editingName ? (
              <TextInput
                style={[
                  styles.name,
                  { borderBottomWidth: 1, borderBottomColor: theme.primary, paddingVertical: 0 },
                ]}
                value={editNameValue}
                onChangeText={setEditNameValue}
                autoFocus
                onSubmitEditing={() => {
                  if (editNameValue.trim() && onRename) {
                    onRename(miner.id, editNameValue.trim());
                  }
                  setEditingName(false);
                }}
                onBlur={() => {
                  if (editNameValue.trim() && onRename) {
                    onRename(miner.id, editNameValue.trim());
                  }
                  setEditingName(false);
                }}
                returnKeyType="done"
                accessibilityLabel="Rename miner"
              />
            ) : (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                {miner.icon ? (
                  <Text style={{ fontSize: fontSize.lg, marginRight: 4 }}>{miner.icon}</Text>
                ) : null}
                <Text style={styles.name} numberOfLines={1}>
                  {miner.name}
                </Text>
                {onRename && (
                  <Pressable
                    onPress={() => {
                      setEditNameValue(miner.name);
                      setEditingName(true);
                    }}
                    accessibilityLabel="Edit miner name"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ fontSize: 12, color: theme.primary, marginLeft: 4 }}>✎</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
          <View style={[styles.pulse, { backgroundColor: accentColor + '20' }]}>
            <View style={[styles.pulseInner, { backgroundColor: accentColor }]} />
          </View>
        </View>

        {miner.tags && miner.tags.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.xxs,
              marginLeft: spacing.sm,
              marginBottom: spacing.xxs,
            }}
          >
            {miner.tags.slice(0, 3).map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: theme.primary + '25',
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                }}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: fontSize.xs,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {tag}
                </Text>
              </View>
            ))}
            {miner.tags.length > 3 && (
              <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>
                +{miner.tags.length - 3}
              </Text>
            )}
          </View>
        )}

        <Text style={styles.ip}>{miner.ip}</Text>

        <View style={styles.divider} />

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('minerCard.hashrate')}</Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>{hashrate}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('minerCard.temp')}</Text>
            <Text style={[styles.statValue, { color: tempColor }]}>
              {status ? formatTemperature(status.temperature) : '---'}
            </Text>
          </View>
          {status && status.fanSpeed > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('minerCard.fan')}</Text>
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
      </Pressable>
    );
  },
  (prev, next) => {
    return prev.miner === next.miner && prev.onPress === next.onPress;
  },
);
