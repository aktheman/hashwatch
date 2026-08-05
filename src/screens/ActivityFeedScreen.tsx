import { useState, useMemo, useCallback, useEffect } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import * as haptic from '../utils/haptics';
import { useActivityFeedStore, ActivityEvent, ActivityType } from '../store/activityFeed';

const TYPE_ICONS: Record<ActivityType, string> = {
  miner_online: '🟢',
  miner_offline: '🔴',
  alert_fired: '⚠️',
  firmware_updated: '📦',
  group_changed: '📁',
  wallet_changed: '💰',
  settings_changed: '⚙️',
  team_member_joined: '👥',
  team_member_left: '👥',
  maintenance_scheduled: '🔧',
  maintenance_completed: '✅',
  pool_switched: '🌊',
  miner_added: '➕',
  miner_removed: '➖',
  miner_shared: '🔗',
  miner_unshared: '🔓',
};

const SEVERITY_BORDER: Record<ActivityEvent['severity'], string> = {
  info: 'primary',
  warning: 'warning',
  error: 'danger',
  success: 'success',
};

type FilterKey = 'all' | ActivityType;

const FILTERS: { key: FilterKey; label: string; types?: ActivityType[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'miner_online', label: 'Miner Online/Offline', types: ['miner_online', 'miner_offline'] },
  { key: 'alert_fired', label: 'Alerts', types: ['alert_fired'] },
  { key: 'firmware_updated', label: 'Firmware', types: ['firmware_updated'] },
  {
    key: 'maintenance_scheduled',
    label: 'Maintenance',
    types: ['maintenance_scheduled', 'maintenance_completed'],
  },
  { key: 'team_member_joined', label: 'Teams', types: ['team_member_joined', 'team_member_left'] },
  {
    key: 'settings_changed',
    label: 'Settings',
    types: ['settings_changed', 'wallet_changed', 'group_changed'],
  },
];

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupByDay(events: ActivityEvent[]): { label: string; data: ActivityEvent[] }[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayStr = today.toDateString();
  const yesterdayStr = yesterday.toDateString();

  const map = new Map<string, ActivityEvent[]>();
  const order: string[] = [];

  for (const ev of events) {
    const d = new Date(ev.timestamp);
    const ds = d.toDateString();
    let label: string;
    if (ds === todayStr) label = 'Today';
    else if (ds === yesterdayStr) label = 'Yesterday';
    else
      label = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });

    if (!map.has(label)) {
      map.set(label, []);
      order.push(label);
    }
    map.get(label)!.push(ev);
  }

  return order.map((label) => ({ label, data: map.get(label)! }));
}

export function ActivityFeedScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const events = useActivityFeedStore((s) => s.events);
  const markRead = useActivityFeedStore((s) => s.markRead);
  const markAllRead = useActivityFeedStore((s) => s.markAllRead);
  const clearEvents = useActivityFeedStore((s) => s.clearEvents);
  const syncFromBackend = useActivityFeedStore((s) => s.syncFromBackend);

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncFromBackend();
    setRefreshing(false);
  }, [syncFromBackend]);

  useEffect(() => {
    syncFromBackend();
  }, [syncFromBackend]);

  const unreadCount = useMemo(() => events.filter((e) => !e.read).length, [events]);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const todayCount = useMemo(
    () => events.filter((e) => e.timestamp >= todayStart).length,
    [events, todayStart],
  );

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return events;
    const filter = FILTERS.find((f) => f.key === activeFilter);
    if (!filter || !filter.types) return events;
    const types = filter.types;
    return events.filter((e) => types.includes(e.type));
  }, [events, activeFilter]);

  const sections = useMemo(() => groupByDay(filteredEvents), [filteredEvents]);

  const handleMarkAllRead = useCallback(() => {
    haptic.light();
    markAllRead();
  }, [markAllRead]);

  const handleClearAll = useCallback(() => {
    haptic.light();
    clearEvents();
  }, [clearEvents]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        headerRow: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          gap: spacing.sm,
        },
        headerBtn: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        },
        headerBtnText: {
          color: theme.primary,
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
        },
        clearBtn: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
          backgroundColor: theme.danger + '1A',
          borderWidth: 1,
          borderColor: theme.danger + '4D',
        },
        clearBtnText: {
          color: theme.danger,
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
        },
        statsRow: {
          flexDirection: 'row',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xxs,
          gap: spacing.xs,
        },
        statCard: {
          flex: 1,
          borderRadius: radius.lg,
          padding: 14,
          alignItems: 'center',
          borderWidth: 1,
        },
        statValue: {
          fontSize: fontSize.h2,
          fontWeight: fontWeight.extrabold,
        },
        statLabel: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginTop: spacing.xxs,
        },
        filterRow: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
        filterScroll: {
          flexDirection: 'row',
          gap: spacing.xs,
        },
        filterChip: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.full,
          borderWidth: 1,
        },
        filterChipText: {
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        dayHeader: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxs,
        },
        dayHeaderText: {
          color: theme.textDim,
          fontSize: fontSize.base,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        eventCard: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          marginHorizontal: spacing.sm,
          marginBottom: spacing.xxs,
          borderRadius: radius.sm,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        },
        unreadCard: {
          borderLeftWidth: 3,
        },
        iconBox: {
          width: spacing.xxl,
          height: spacing.xxl,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.sm,
          backgroundColor: theme.surfaceLight,
        },
        icon: {
          fontSize: fontSize.lg,
        },
        eventBody: {
          flex: 1,
        },
        eventTitle: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
        },
        eventTitleRead: {
          fontWeight: fontWeight.regular,
        },
        eventDesc: {
          color: theme.textDim,
          fontSize: fontSize.sm,
          marginTop: spacing.xxs,
        },
        eventRight: {
          marginLeft: spacing.xs,
          alignItems: 'flex-end',
        },
        eventTime: {
          color: theme.textMuted,
          fontSize: fontSize.sm,
        },
        unreadDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.primary,
          marginTop: spacing.xxs,
        },
        emptyBox: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xxl,
        },
        emptyIcon: {
          fontSize: 48,
          marginBottom: spacing.md,
        },
        emptyTitle: {
          color: theme.text,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.xs,
        },
        emptyDesc: {
          color: theme.textDim,
          fontSize: fontSize.md,
          textAlign: 'center',
        },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      {events.length > 0 && (
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            style={styles.headerBtn}
            onPress={handleMarkAllRead}
          >
            <Text style={styles.headerBtnText}>
              {t('activityFeed.markAllRead', 'Mark All Read')}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.clearBtn} onPress={handleClearAll}>
            <Text style={styles.clearBtnText}>{t('activityFeed.clearAll', 'Clear All')}</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {events.length > 0 && (
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.statValue, { color: theme.text }]}>{events.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textDim }]}>
                {t('activityFeed.total', 'Total')}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: theme.primary + '1A', borderColor: theme.primary + '4D' },
              ]}
            >
              <Text style={[styles.statValue, { color: theme.primary }]}>{unreadCount}</Text>
              <Text style={[styles.statLabel, { color: theme.primary }]}>
                {t('activityFeed.unread', 'Unread')}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.statValue, { color: theme.text }]}>{todayCount}</Text>
              <Text style={[styles.statLabel, { color: theme.textDim }]}>
                {t('activityFeed.today', 'Today')}
              </Text>
            </View>
          </View>
        )}

        {events.length > 0 && (
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterScroll}>
                {FILTERS.map((f) => {
                  const selected = activeFilter === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      accessibilityRole="button"
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: selected ? theme.primary : theme.surface,
                          borderColor: selected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => {
                        haptic.light();
                        setActiveFilter(f.key);
                      }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: selected ? '#FFFFFF' : theme.textDim },
                        ]}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {filteredEvents.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>{t('activityFeed.emptyTitle', 'No activity yet')}</Text>
            <Text style={styles.emptyDesc}>
              {t('activityFeed.emptyDesc', 'Events from your miners and team will appear here.')}
            </Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.label}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{section.label}</Text>
              </View>
              {section.data.map((ev) => {
                const severityKey = SEVERITY_BORDER[ev.severity];
                const borderColorVal = theme[severityKey as keyof typeof theme] as string;
                return (
                  <Pressable
                    key={ev.id}
                    accessibilityRole="button"
                    style={[
                      styles.eventCard,
                      !ev.read && styles.unreadCard,
                      { borderLeftColor: borderColorVal },
                    ]}
                    onPress={() => {
                      if (!ev.read) {
                        haptic.light();
                        markRead(ev.id);
                      }
                    }}
                  >
                    <View style={styles.iconBox}>
                      <Text style={styles.icon}>{TYPE_ICONS[ev.type]}</Text>
                    </View>
                    <View style={styles.eventBody}>
                      <Text style={[styles.eventTitle, !ev.read ? null : styles.eventTitleRead]}>
                        {ev.title}
                      </Text>
                      <Text style={styles.eventDesc} numberOfLines={2}>
                        {ev.description}
                      </Text>
                    </View>
                    <View style={styles.eventRight}>
                      <Text style={styles.eventTime}>{formatRelativeTime(ev.timestamp)}</Text>
                      {!ev.read && <View style={styles.unreadDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
