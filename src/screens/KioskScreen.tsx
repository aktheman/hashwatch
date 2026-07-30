import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMinerStore } from '../store/miners';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { formatHashrateValue, toHashesPerSecond } from '../utils/hashrate';
import { Miner } from '../types';

interface KioskScreenProps {
  miners: Miner[];
  onExit: () => void;
}

export function KioskScreen({ miners, onExit }: KioskScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [showExit, setShowExit] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshAll = useMinerStore((s) => s.refreshAll);

  useEffect(() => {
    StatusBar.setHidden(true);
    return () => StatusBar.setHidden(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => refreshAll(), 10000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const handleTap = () => {
    setShowExit(true);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setShowExit(false), 4000);
  };

  const numColumns = width > 900 ? 3 : width > 600 ? 2 : 1;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        exitBtn: {
          position: 'absolute',
          top: 40,
          right: 20,
          zIndex: 100,
          backgroundColor: theme.danger,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderRadius: radius.lg,
        },
        exitText: {
          color: '#fff',
          fontSize: fontSize.lg,
          fontWeight: fontWeight.bold,
        },
        list: {
          flex: 1,
          padding: spacing.lg,
        },
        card: {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          margin: spacing.xs,
          borderWidth: 1,
          borderColor: theme.border,
          minHeight: 180,
        },
        cardInner: {
          flex: 1,
          justifyContent: 'center',
        },
        cardRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.xs,
        },
        minerName: {
          color: theme.text,
          fontSize: fontSize.h2,
          fontWeight: fontWeight.bold,
        },
        statusDot: {
          width: 14,
          height: 14,
          borderRadius: 7,
        },
        hashrateValue: {
          color: theme.primary,
          fontSize: fontSize.h1,
          fontWeight: fontWeight.extrabold,
        },
        hashrateLabel: {
          color: theme.textDim,
          fontSize: fontSize.sm,
        },
        tempText: {
          fontSize: fontSize.xl,
          fontWeight: fontWeight.semibold,
        },
        metaText: {
          color: theme.textDim,
          fontSize: fontSize.md,
        },
      }),
    [theme],
  );

  const renderMiner = ({ item }: { item: Miner }) => {
    const hashrate = toHashesPerSecond(item.status?.hashRate || 0, item.status?.hashRateUnit);
    const temp = item.status?.temperature ?? 0;
    const tempColor = temp > 80 ? theme.danger : temp > 70 ? theme.warning : theme.success;

    return (
      <View style={[styles.card, { flex: 1 / numColumns }]}>
        <View style={styles.cardInner}>
          <View style={styles.cardRow}>
            <Text style={styles.minerName} numberOfLines={1}>
              {item.name || item.ip}
            </Text>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.isOnline ? theme.success : theme.danger },
              ]}
            />
          </View>
          <Text style={styles.hashrateValue}>
            {formatHashrateValue(hashrate)}
            <Text style={styles.hashrateLabel}> {t('realtime.hashrate')}</Text>
          </Text>
          <View style={styles.cardRow}>
            <Text style={[styles.tempText, { color: tempColor }]}>{Math.round(temp)}°C</Text>
            <Text style={styles.metaText}>
              {item.status?.power ? `${Math.round(item.status.power)}W` : ''}
            </Text>
          </View>
          <Text style={styles.metaText}>
            {item.isOnline && item.status?.uptimeSeconds
              ? `${Math.floor(item.status.uptimeSeconds / 3600)}h ${Math.floor((item.status.uptimeSeconds % 3600) / 60)}m`
              : t('minerHealth.offline')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Pressable style={styles.container} onPress={handleTap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Exit kiosk mode"
        style={styles.exitBtn}
        onPress={onExit}
      >
        <Text style={styles.exitText}>{t('dashboard.exitKioskExit')}</Text>
      </Pressable>
      <FlatList
        data={miners}
        keyExtractor={(m) => m.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={styles.list}
        renderItem={renderMiner}
      />
    </Pressable>
  );
}
