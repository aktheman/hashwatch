import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../theme';
import { useMinerStore } from '../store/miners';
import { spacing, radius, fontSize, fontWeight, cardStyle } from '../utils/design';
import { Miner, RootStackParamList } from '../types';
import * as haptic from '../utils/haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAP_PADDING = spacing.lg;
const MAP_WIDTH = SCREEN_WIDTH - MAP_PADDING * 2;
const MAP_HEIGHT = MAP_WIDTH * 0.55;
const DOT_RADIUS = 7;
const DOT_BORDER = 2;

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getMinerStatus(miner: Miner): 'healthy' | 'warning' | 'critical' {
  const temp = miner.status?.temperature ?? 0;
  const hashrate = miner.status?.hashRate ?? 0;
  if (temp > 80 || !miner.isOnline) return 'critical';
  if (temp > 65 || (hashrate > 0 && hashrate < 100)) return 'warning';
  if (miner.isOnline && hashrate > 100) return 'healthy';
  return 'warning';
}

function getStatusColor(
  status: 'healthy' | 'warning' | 'critical',
  theme: ReturnType<typeof useTheme>,
) {
  if (status === 'healthy') return theme.success;
  if (status === 'warning') return theme.warning;
  return theme.danger;
}

function getStatusGlow(
  status: 'healthy' | 'warning' | 'critical',
  theme: ReturnType<typeof useTheme>,
) {
  if (status === 'healthy') return theme.glowSuccess;
  if (status === 'warning') return theme.glowWarning;
  return theme.glowDanger;
}

type FilterMode = 'all' | 'online' | 'critical';

interface LocationGroup {
  name: string;
  miners: Miner[];
  onlineCount: number;
  avgTemp: number;
  totalHashrate: number;
}

export function WorldMapScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const miners = useMinerStore((s) => s.miners);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedMiner, setSelectedMiner] = useState<Miner | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const filteredMiners = useMemo(() => {
    let list = miners;
    if (selectedLocation) {
      list = list.filter((m) => (m.location || 'Unknown') === selectedLocation);
    }
    switch (filter) {
      case 'online':
        return list.filter((m) => m.isOnline);
      case 'critical':
        return list.filter((m) => getMinerStatus(m) === 'critical');
      default:
        return list;
    }
  }, [miners, filter, selectedLocation, theme]);

  const minerPositions = useMemo(() => {
    return filteredMiners.map((miner) => {
      const key = miner.ip || miner.name;
      const h = simpleHash(key);
      const x = (h % (MAP_WIDTH - DOT_RADIUS * 4)) + DOT_RADIUS * 2;
      const y = ((h * 7 + 13) % (MAP_HEIGHT - DOT_RADIUS * 4)) + DOT_RADIUS * 2;
      return { miner, x, y, status: getMinerStatus(miner) };
    });
  }, [filteredMiners, theme]);

  const locationGroups = useMemo<LocationGroup[]>(() => {
    const map = new Map<string, Miner[]>();
    for (const m of miners) {
      const loc = m.location || 'Unknown';
      const arr = map.get(loc) || [];
      arr.push(m);
      map.set(loc, arr);
    }
    return Array.from(map.entries())
      .map(([name, group]) => ({
        name,
        miners: group,
        onlineCount: group.filter((m) => m.isOnline).length,
        avgTemp:
          group.filter((m) => m.isOnline && m.status).length > 0
            ? Math.round(
                group
                  .filter((m) => m.isOnline && m.status)
                  .reduce((a, m) => a + (m.status?.temperature ?? 0), 0) /
                  group.filter((m) => m.isOnline && m.status).length,
              )
            : 0,
        totalHashrate: group.reduce((a, m) => a + (m.status?.hashRate ?? 0), 0),
      }))
      .sort((a, b) => b.miners.length - a.miners.length);
  }, [miners]);

  const totalMapped = miners.length;
  const onlineCount = miners.filter((m) => m.isOnline).length;
  const criticalCount = miners.filter((m) => getMinerStatus(m) === 'critical').length;
  const locationsCount = locationGroups.length;

  const handleDotPress = useCallback((miner: Miner) => {
    haptic.light();
    setSelectedMiner(miner);
  }, []);

  const handleLocationPress = useCallback((locName: string) => {
    haptic.light();
    setSelectedLocation((prev) => (prev === locName ? null : locName));
  }, []);

  const handleFilterPress = useCallback((mode: FilterMode) => {
    haptic.light();
    setFilter(mode);
  }, []);

  const handleViewDetails = useCallback(() => {
    if (!selectedMiner) return;
    haptic.medium();
    setSelectedMiner(null);
    navigation.navigate('MinerDetail', { minerId: selectedMiner.id });
  }, [selectedMiner, navigation]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { paddingBottom: spacing.xxl },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
    },
    title: {
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -0.5,
    },
    mapContainer: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      overflow: 'hidden',
    },
    mapArea: {
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      position: 'relative',
    },
    mapOverlay: {
      ...StyleSheet.absoluteFill,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    mapGridLine: {
      position: 'absolute',
      backgroundColor: theme.border,
    },
    dot: {
      position: 'absolute',
      width: DOT_RADIUS * 2 + DOT_BORDER * 2,
      height: DOT_RADIUS * 2 + DOT_BORDER * 2,
      borderRadius: DOT_RADIUS + DOT_BORDER,
      borderWidth: DOT_BORDER,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotInner: {
      width: DOT_RADIUS * 2,
      height: DOT_RADIUS * 2,
      borderRadius: DOT_RADIUS,
    },
    mapLabel: {
      position: 'absolute',
      bottom: spacing.xs,
      right: spacing.xs,
      fontSize: fontSize.xs,
      color: theme.textMuted,
      fontWeight: fontWeight.semibold,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      marginTop: spacing.md,
      gap: spacing.xs,
    },
    filterBtn: {
      flex: 1,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: 'center',
    },
    filterBtnText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
    },
    legendRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      marginTop: spacing.sm,
      gap: spacing.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: fontSize.xs,
      color: theme.textMuted,
    },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      marginTop: spacing.md,
      gap: spacing.xs,
    },
    statCard: {
      flex: 1,
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: 'center',
      borderWidth: 1,
    },
    statValue: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
    },
    statLabel: {
      fontSize: fontSize.xs,
      color: theme.textMuted,
      marginTop: spacing.xxs,
      fontWeight: fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    section: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: theme.text,
      marginBottom: spacing.sm,
    },
    locationCard: {
      ...cardStyle(theme),
      padding: spacing.md,
      marginBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    locationCardActive: {
      borderColor: theme.primary,
    },
    locationInfo: {
      flex: 1,
    },
    locationName: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: theme.text,
    },
    locationStats: {
      fontSize: fontSize.xs,
      color: theme.textMuted,
      marginTop: 2,
    },
    locationRight: {
      alignItems: 'flex-end',
    },
    locationHashrate: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: theme.primary,
    },
    locationTemp: {
      fontSize: fontSize.xs,
      color: theme.textMuted,
      marginTop: 2,
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    },
    modal: {
      width: SCREEN_WIDTH * 0.8,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    modalName: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: theme.text,
      flex: 1,
    },
    modalStatusBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
      borderRadius: radius.full,
    },
    modalStatusText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: '#fff',
    },
    modalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    modalLabel: {
      fontSize: fontSize.sm,
      color: theme.textMuted,
    },
    modalValue: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: theme.text,
    },
    modalTempValue: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
    },
    modalDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: spacing.sm,
    },
    viewDetailsBtn: {
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    viewDetailsText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: '#fff',
    },
    closeModalBtn: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeModalText: {
      fontSize: fontSize.lg,
      color: theme.textMuted,
      fontWeight: fontWeight.bold,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
      marginTop: spacing.xxl * 2,
    },
    emptyText: {
      fontSize: fontSize.md,
      color: theme.textMuted,
      textAlign: 'center',
    },
    locationFilterBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.surface,
    },
    locationFilterText: {
      fontSize: fontSize.sm,
      color: theme.primary,
      fontWeight: fontWeight.semibold,
    },
    clearFilterText: {
      fontSize: fontSize.xs,
      color: theme.danger,
      fontWeight: fontWeight.semibold,
    },
  });

  const gridLines = useMemo(() => {
    const lines: { key: string; left?: number; top?: number; width: number; height: number }[] = [];
    for (let i = 1; i < 4; i++) {
      lines.push({
        key: `v${i}`,
        left: (MAP_WIDTH / 4) * i,
        top: 0,
        width: 1,
        height: MAP_HEIGHT,
      });
    }
    for (let i = 1; i < 4; i++) {
      lines.push({
        key: `h${i}`,
        left: 0,
        top: (MAP_HEIGHT / 4) * i,
        width: MAP_WIDTH,
        height: 1,
      });
    }
    return lines;
  }, []);

  if (miners.length === 0) {
    return (
      <View
        style={styles.container}
        accessibilityRole="summary"
        accessibilityLabel={t('worldMap.title', 'World Map')}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('worldMap.title', 'World Map')}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t('worldMap.noMiners', 'Add miners to see their locations on the world map.')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityRole="summary"
      accessibilityLabel={t('worldMap.title', 'World Map')}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('worldMap.title', 'World Map')}</Text>
      </View>

      {selectedLocation && (
        <View style={styles.locationFilterBanner}>
          <Text style={styles.locationFilterText}>
            {t('worldMap.filteredTo', 'Filtered to')}: {selectedLocation}
          </Text>
          <Pressable
            onPress={() => {
              haptic.light();
              setSelectedLocation(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('worldMap.clearFilter', 'Clear filter')}
          >
            <Text style={styles.clearFilterText}>{t('worldMap.clear', 'Clear')}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.mapContainer}>
        <View style={styles.mapArea}>
          <View style={styles.mapOverlay} />
          {gridLines.map((line) => (
            <View
              key={line.key}
              style={[
                styles.mapGridLine,
                { left: line.left, top: line.top, width: line.width, height: line.height },
              ]}
            />
          ))}
          {minerPositions.map(({ miner, x, y, status }) => {
            const color = getStatusColor(status, theme);
            const glow = getStatusGlow(status, theme);
            const dotSize = DOT_RADIUS * 2 + DOT_BORDER * 2;
            return (
              <Pressable
                key={miner.id}
                style={[
                  styles.dot,
                  {
                    left: x - dotSize / 2,
                    top: y - dotSize / 2,
                    borderColor: color,
                    backgroundColor: glow,
                  },
                ]}
                onPress={() => handleDotPress(miner)}
                accessibilityRole="button"
                accessibilityLabel={`${miner.name}, ${status}`}
              >
                <View style={[styles.dotInner, { backgroundColor: color }]} />
              </Pressable>
            );
          })}
          <Text style={styles.mapLabel}>
            {t('worldMap.minersCount', '{{count}} miners', { count: filteredMiners.length })}
          </Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {[
          { key: 'all' as FilterMode, label: t('worldMap.showAll', 'Show All') },
          { key: 'online' as FilterMode, label: t('worldMap.onlineOnly', 'Online Only') },
          { key: 'critical' as FilterMode, label: t('worldMap.criticalOnly', 'Critical Only') },
        ].map((opt) => (
          <Pressable
            key={opt.key}
            style={[
              styles.filterBtn,
              {
                backgroundColor: filter === opt.key ? theme.primary : theme.surface,
                borderColor: filter === opt.key ? theme.primary : theme.border,
              },
            ]}
            onPress={() => handleFilterPress(opt.key)}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: filter === opt.key }}
          >
            <Text
              style={[styles.filterBtnText, { color: filter === opt.key ? '#fff' : theme.textDim }]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
          <Text style={styles.legendText}>{t('worldMap.legendHealthy', 'Healthy')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.warning }]} />
          <Text style={styles.legendText}>{t('worldMap.legendWarning', 'Warning')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.danger }]} />
          <Text style={styles.legendText}>{t('worldMap.legendCritical', 'Critical')}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View
          style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={styles.statValue}>{totalMapped}</Text>
          <Text style={styles.statLabel}>{t('worldMap.totalMiners', 'Mapped')}</Text>
        </View>
        <View
          style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.statValue, { color: theme.success }]}>{onlineCount}</Text>
          <Text style={styles.statLabel}>{t('worldMap.online', 'Online')}</Text>
        </View>
        <View
          style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text
            style={[styles.statValue, { color: criticalCount > 0 ? theme.danger : theme.success }]}
          >
            {criticalCount}
          </Text>
          <Text style={styles.statLabel}>{t('worldMap.critical', 'Critical')}</Text>
        </View>
        <View
          style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={styles.statValue}>{locationsCount}</Text>
          <Text style={styles.statLabel}>{t('worldMap.locations', 'Locations')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('worldMap.locationList', 'Locations')}</Text>
        {locationGroups.map((loc) => (
          <Pressable
            key={loc.name}
            style={[
              styles.locationCard,
              selectedLocation === loc.name && styles.locationCardActive,
            ]}
            onPress={() => handleLocationPress(loc.name)}
            accessibilityRole="button"
            accessibilityLabel={`${loc.name}, ${loc.miners.length} miners`}
            accessibilityState={{ selected: selectedLocation === loc.name }}
          >
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{loc.name}</Text>
              <Text style={styles.locationStats}>
                {loc.onlineCount}/{loc.miners.length} {t('worldMap.onlineLower', 'online')} ·{' '}
                {loc.avgTemp}°C
              </Text>
            </View>
            <View style={styles.locationRight}>
              <Text style={styles.locationHashrate}>
                {loc.totalHashrate > 0 ? `${loc.totalHashrate.toFixed(0)} GH/s` : '---'}
              </Text>
              <Text style={styles.locationTemp}>
                {loc.miners.length} {loc.miners.length === 1 ? 'miner' : 'miners'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {selectedMiner && (
        <Pressable
          style={styles.overlay}
          onPress={() => setSelectedMiner(null)}
          accessibilityRole="none"
        >
          <Pressable
            style={[styles.modal, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
            accessibilityRole="none"
            accessibilityLabel={t('worldMap.minerDetail', 'Miner detail')}
          >
            <Pressable
              style={[styles.closeModalBtn, { backgroundColor: theme.surfaceLight }]}
              onPress={() => setSelectedMiner(null)}
              accessibilityRole="button"
              accessibilityLabel={t('worldMap.close', 'Close')}
            >
              <Text style={styles.closeModalText}>x</Text>
            </Pressable>
            <View style={styles.modalHeader}>
              <Text style={styles.modalName} numberOfLines={1}>
                {selectedMiner.name}
              </Text>
              <View
                style={[
                  styles.modalStatusBadge,
                  {
                    backgroundColor: selectedMiner.isOnline ? theme.success : theme.danger,
                  },
                ]}
              >
                <Text style={styles.modalStatusText}>
                  {selectedMiner.isOnline
                    ? t('worldMap.online', 'Online')
                    : t('worldMap.offline', 'Offline')}
                </Text>
              </View>
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>{t('worldMap.ip', 'IP')}</Text>
              <Text style={styles.modalValue}>{selectedMiner.ip}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>{t('worldMap.hashrate', 'Hashrate')}</Text>
              <Text style={styles.modalValue}>
                {selectedMiner.status?.hashRate
                  ? `${selectedMiner.status.hashRate.toFixed(0)} GH/s`
                  : '---'}
              </Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>{t('worldMap.temperature', 'Temp')}</Text>
              <Text
                style={[
                  styles.modalTempValue,
                  {
                    color:
                      (selectedMiner.status?.temperature ?? 0) > 80
                        ? theme.danger
                        : (selectedMiner.status?.temperature ?? 0) > 65
                          ? theme.warning
                          : theme.success,
                  },
                ]}
              >
                {selectedMiner.status?.temperature
                  ? `${selectedMiner.status.temperature.toFixed(1)}°C`
                  : '---'}
              </Text>
            </View>

            <View style={styles.modalDivider} />

            <Pressable
              style={[styles.viewDetailsBtn, { backgroundColor: theme.primary }]}
              onPress={handleViewDetails}
              accessibilityRole="button"
              accessibilityLabel={t('worldMap.viewDetails', 'View Details')}
            >
              <Text style={styles.viewDetailsText}>
                {t('worldMap.viewDetails', 'View Details')}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      )}
    </ScrollView>
  );
}
