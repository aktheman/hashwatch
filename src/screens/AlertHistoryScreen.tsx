import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
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

function groupByDate(events: AlertEvent[], t: (key: string) => string): { date: string; data: AlertEvent[] }[] {
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
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    if (isAuthed) {
      await syncFromBackend();
      await syncToBackend();
    }
    setRefreshing(false);
  }, [loadEvents, isAuthed, syncFromBackend, syncToBackend]);

  const sections = useMemo(() => groupByDate(events, t), [events, t]);

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
              {t('alertHistory.noAlerts', 'No alert history yet')}
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
