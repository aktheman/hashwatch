import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight, buttonText } from '../utils/design';
import { useAlertHistoryStore, AlertEvent } from '../store/alertHistory';
import { useAuthStore } from '../store/auth';
import { NavigationProp } from '../types';

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

function formatDateLabel(ts: number, t: (key: string) => string): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return t('alertHistory.today');
  if (d.toDateString() === yesterday.toDateString()) return t('alertHistory.yesterday');
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

const ALERT_ICONS: Record<string, string> = {
  offline: '🔴',
  offline_reminder: '🔴',
  online: '🟢',
  hot: '🔥',
  hashrate_drop: '📉',
  pool_lost: '⛏',
  long_uptime: '⏰',
};

function groupByDate(
  events: AlertEvent[],
  t: (key: string) => string,
): { date: string; data: AlertEvent[] }[] {
  const groups = new Map<string, AlertEvent[]>();
  for (const ev of events) {
    const key = formatDateLabel(ev.timestamp, t);
    const list = groups.get(key) || [];
    list.push(ev);
    groups.set(key, list);
  }
  return Array.from(groups.entries()).map(([date, data]) => ({ date, data }));
}

export function AlertHistoryScreen({ navigation: _navigation }: { navigation: NavigationProp }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const events = useAlertHistoryStore((s) => s.events);
  const syncing = useAlertHistoryStore((s) => s.syncing);
  const markRead = useAlertHistoryStore((s) => s.markRead);
  const markAllRead = useAlertHistoryStore((s) => s.markAllRead);
  const clearAll = useAlertHistoryStore((s) => s.clearAll);
  const loadEvents = useAlertHistoryStore((s) => s.loadEvents);
  const syncFromBackend = useAlertHistoryStore((s) => s.syncFromBackend);
  const syncToBackend = useAlertHistoryStore((s) => s.syncToBackend);
  const isAuthed = !!useAuthStore.getState().token;

  useEffect(() => {
    if (isAuthed) {
      syncFromBackend();
      syncToBackend();
    }
  }, [isAuthed, syncFromBackend, syncToBackend]);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    if (isAuthed) {
      await syncFromBackend();
      await syncToBackend();
    }
    setRefreshing(false);
  }, [loadEvents, isAuthed, syncFromBackend, syncToBackend]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setActiveFilter(null);
  }, []);

  const filterOptions = useMemo(
    () => [
      { key: null as string | null, label: t('alertHistory.filterAll', 'All') },
      { key: 'offline', label: t('alertHistory.filterOffline', 'Offline') },
      { key: 'online', label: t('alertHistory.filterOnline', 'Online') },
      { key: 'hot', label: t('alertHistory.filterHot', 'Hot') },
      { key: 'hashrate_drop', label: t('alertHistory.filterHashrateDrop', 'Hashrate Drop') },
      { key: 'pool_lost', label: t('alertHistory.filterPoolLost', 'Pool Lost') },
    ],
    [t],
  );

  const filteredEvents = useMemo(() => {
    let result = events;
    if (activeFilter) {
      result = result.filter((ev) => {
        if (activeFilter === 'offline')
          return ev.type === 'offline' || ev.type === 'offline_reminder';
        if (activeFilter === 'online') return ev.type === 'online' || ev.type === 'long_uptime';
        return ev.type === activeFilter;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (ev) =>
          (ev.minerName?.toLowerCase() || '').includes(q) ||
          ev.title.toLowerCase().includes(q) ||
          ev.type.toLowerCase().includes(q),
      );
    }
    return result;
  }, [events, searchQuery, activeFilter]);

  const hasActiveFilter = searchQuery.trim().length > 0 || activeFilter !== null;

  const sections = useMemo(() => groupByDate(filteredEvents, t), [filteredEvents, t]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        header: {
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
        dateHeader: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxs,
        },
        dateHeaderText: {
          color: theme.textDim,
          fontSize: fontSize.base,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        eventRow: {
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
        eventUnread: {
          borderLeftWidth: 3,
          borderLeftColor: theme.primary,
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
        eventMeta: {
          color: theme.textDim,
          fontSize: fontSize.sm,
          marginTop: spacing.xxs,
        },
        eventTime: {
          color: theme.textMuted,
          fontSize: fontSize.sm,
          marginLeft: spacing.xs,
        },
        emptyBox: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xxl,
        },
        emptyText: {
          color: theme.textDim,
          fontSize: fontSize.md,
          textAlign: 'center',
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
        searchContainer: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
        },
        searchInput: {
          borderRadius: radius.md,
          borderWidth: 1,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          fontSize: fontSize.md,
        },
        filterContainer: {
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xs,
        },
        filterChips: {
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
        clearFiltersRow: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xs,
        },
        clearFiltersBtn: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
        },
        clearFiltersText: {
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      {(events.length > 0 || isAuthed) && (
        <View style={styles.header}>
          {isAuthed && (
            <Pressable
              accessibilityRole="button"
              style={styles.headerBtn}
              onPress={syncFromBackend}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={styles.headerBtnText}>{t('alertHistory.sync', 'Sync')}</Text>
              )}
            </Pressable>
          )}
          {events.length > 0 && (
            <>
              <Pressable accessibilityRole="button" style={styles.headerBtn} onPress={markAllRead}>
                <Text style={styles.headerBtnText}>
                  {t('alertHistory.markAllRead', 'Mark All Read')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.clearBtn}
                onPress={() => {
                  if (events.length > 0) clearAll();
                }}
              >
                <Text style={styles.clearBtnText}>{t('alertHistory.clearAll', 'Clear All')}</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border },
          ]}
          placeholder={t('alertHistory.searchPlaceholder', 'Search alerts...')}
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {filterOptions.map((opt) => {
            const isActive = activeFilter === opt.key;
            return (
              <Pressable
                key={opt.key ?? 'all'}
                accessibilityRole="button"
                style={[
                  styles.filterChip,
                  {
                    borderColor: isActive ? theme.primary : theme.border,
                    backgroundColor: isActive ? theme.primary : theme.surface,
                  },
                ]}
                onPress={() => setActiveFilter(opt.key)}
              >
                <Text
                  style={[styles.filterChipText, { color: isActive ? buttonText : theme.text }]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {hasActiveFilter && (
        <View style={styles.clearFiltersRow}>
          <Pressable
            accessibilityRole="button"
            style={styles.clearFiltersBtn}
            onPress={clearFilters}
          >
            <Text style={[styles.clearFiltersText, { color: theme.primary }]}>
              {t('alertHistory.clearFilters', 'Clear filters')}
            </Text>
          </Pressable>
        </View>
      )}
      <FlatList
        data={sections}
        keyExtractor={(item) => item.date}
        renderItem={({ item: section }) => (
          <View>
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{section.date}</Text>
            </View>
            {section.data.map((ev) => (
              <Pressable
                key={ev.id}
                accessibilityRole="button"
                style={[styles.eventRow, !ev.read && styles.eventUnread]}
                onPress={() => {
                  if (!ev.read) markRead(ev.id);
                }}
              >
                <View style={styles.iconBox}>
                  <Text style={styles.icon}>{ALERT_ICONS[ev.type] || '🔔'}</Text>
                </View>
                <View style={styles.eventBody}>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <Text style={styles.eventMeta}>
                    {ev.minerName} · {t(`alertHistory.${ev.type}`, ev.type.replace('_', ' '))}
                  </Text>
                </View>
                <Text style={styles.eventTime}>{formatTimestamp(ev.timestamp)}</Text>
              </Pressable>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {hasActiveFilter
                ? t('alertHistory.noMatchingAlerts', 'No alerts match your search')
                : t('alertHistory.noAlerts', 'No alert history yet')}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      />
    </View>
  );
}
