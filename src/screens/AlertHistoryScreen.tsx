import { useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useAlertHistoryStore, AlertEvent } from '../store/alertHistory';
import { NavigationProp } from '../types';

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

function formatDateLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
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

function groupByDate(events: AlertEvent[]): { date: string; data: AlertEvent[] }[] {
  const groups = new Map<string, AlertEvent[]>();
  for (const ev of events) {
    const key = formatDateLabel(ev.timestamp);
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
  const markRead = useAlertHistoryStore((s) => s.markRead);
  const markAllRead = useAlertHistoryStore((s) => s.markAllRead);
  const clearAll = useAlertHistoryStore((s) => s.clearAll);

  const loadEvents = useAlertHistoryStore((s) => s.loadEvents);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const sections = useMemo(() => groupByDate(events), [events]);

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
          paddingHorizontal: 16,
          paddingVertical: 8,
          gap: 12,
        },
        headerBtn: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        },
        headerBtnText: {
          color: theme.primary,
          fontSize: 13,
          fontWeight: '600',
        },
        dateHeader: {
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 6,
        },
        dateHeaderText: {
          color: theme.textDim,
          fontSize: 13,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        eventRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginHorizontal: 12,
          marginBottom: 4,
          borderRadius: 10,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        },
        eventUnread: {
          borderLeftWidth: 3,
          borderLeftColor: theme.primary,
        },
        iconBox: {
          width: 32,
          height: 32,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          backgroundColor: theme.surfaceLight,
        },
        icon: {
          fontSize: 16,
        },
        eventBody: {
          flex: 1,
        },
        eventTitle: {
          color: theme.text,
          fontSize: 14,
          fontWeight: '600',
        },
        eventMeta: {
          color: theme.textDim,
          fontSize: 12,
          marginTop: 2,
        },
        eventTime: {
          color: theme.textMuted,
          fontSize: 11,
          marginLeft: 8,
        },
        emptyBox: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        },
        emptyText: {
          color: theme.textDim,
          fontSize: 15,
          textAlign: 'center',
        },
        clearBtn: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: theme.danger + '1A',
          borderWidth: 1,
          borderColor: theme.danger + '4D',
        },
        clearBtnText: {
          color: theme.danger,
          fontSize: 13,
          fontWeight: '600',
        },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      {events.length > 0 && (
        <View style={styles.header}>
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
                    {ev.minerName} · {ev.type.replace('_', ' ')}
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
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      />
    </View>
  );
}
