import { useMemo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { useNotificationHistoryStore, PushNotificationEntry } from '../store/notificationHistory';
import { useAuthStore } from '../store/auth';
import { NavigationProp } from '../types';

const STATUS_ICONS: Record<string, string> = {
  sent: '✅',
  failed: '❌',
};

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

function groupByDate(
  entries: PushNotificationEntry[],
): { date: string; data: PushNotificationEntry[] }[] {
  const groups = new Map<string, PushNotificationEntry[]>();
  for (const ev of entries) {
    const key = formatDateLabel(ev.sentAt);
    const list = groups.get(key) || [];
    list.push(ev);
    groups.set(key, list);
  }
  return Array.from(groups.entries()).map(([date, data]) => ({ date, data }));
}

export function NotificationHistoryScreen({
  navigation: _navigation,
}: {
  navigation: NavigationProp;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const history = useNotificationHistoryStore((s) => s.history);
  const syncing = useNotificationHistoryStore((s) => s.syncing);
  const loadHistory = useNotificationHistoryStore((s) => s.loadHistory);
  const clearHistory = useNotificationHistoryStore((s) => s.clearHistory);
  const syncFromBackend = useNotificationHistoryStore((s) => s.syncFromBackend);
  const syncToBackend = useNotificationHistoryStore((s) => s.syncToBackend);
  const isAuthed = !!useAuthStore.getState().token;

  useEffect(() => {
    loadHistory();
    if (isAuthed) {
      syncFromBackend();
      syncToBackend();
    }
  }, [loadHistory, isAuthed, syncFromBackend, syncToBackend]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    if (isAuthed) {
      await syncFromBackend();
      await syncToBackend();
    }
    setRefreshing(false);
  }, [loadHistory, isAuthed, syncFromBackend, syncToBackend]);

  const sections = useMemo(() => groupByDate(history), [history]);

  const handleClear = useCallback(() => {
    Alert.alert(
      t('notificationHistory.clearTitle', 'Clear History'),
      t('notificationHistory.clearConfirm', 'Delete all push notification history?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: () => clearHistory(),
        },
      ],
    );
  }, [clearHistory, t]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
        headerTitle: {
          color: theme.text,
          fontSize: fontSize.base,
          fontWeight: fontWeight.bold,
        },
        syncBtn: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          marginRight: spacing.sm,
        },
        syncBtnText: {
          color: theme.primary,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        clearBtn: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
        },
        clearBtnText: {
          color: theme.danger,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        sectionHeader: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          backgroundColor: theme.bg,
        },
        sectionHeaderText: {
          color: theme.textDim,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        },
        card: {
          backgroundColor: theme.surface,
          marginHorizontal: spacing.md,
          marginBottom: spacing.xs,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.border,
          padding: spacing.md,
        },
        cardRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        cardTitle: {
          color: theme.text,
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
          flex: 1,
          marginRight: spacing.sm,
        },
        cardBody: {
          color: theme.textDim,
          fontSize: fontSize.sm,
          marginTop: spacing.xxs,
        },
        cardFooter: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: spacing.sm,
        },
        cardTime: {
          color: theme.textMuted,
          fontSize: fontSize.xs,
        },
        empty: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        },
        emptyIcon: {
          fontSize: 48,
          marginBottom: spacing.md,
        },
        emptyText: {
          color: theme.textDim,
          fontSize: fontSize.base,
          textAlign: 'center',
        },
        statusBadge: {
          fontSize: fontSize.sm,
        },
      }),
    [theme],
  );

  if (history.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('notificationHistory.title', 'Notification History')}
          </Text>
          {isAuthed && (
            <Pressable
              accessibilityRole="button"
              style={styles.syncBtn}
              onPress={syncFromBackend}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={styles.syncBtnText}>{t('common.sync', 'Sync')}</Text>
              )}
            </Pressable>
          )}
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>
            {t('notificationHistory.noNotifications', 'No push notifications sent yet')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t('notificationHistory.title', 'Notification History')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isAuthed && (
            <Pressable
              accessibilityRole="button"
              style={styles.syncBtn}
              onPress={syncFromBackend}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={styles.syncBtnText}>{t('common.sync', 'Sync')}</Text>
              )}
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('notificationHistory.clearAction', 'Clear history')}
            style={styles.clearBtn}
            onPress={handleClear}
          >
            <Text style={styles.clearBtnText}>
              {t('notificationHistory.clearAction', 'Clear All')}
            </Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.date}
        renderItem={({ item: section }) => (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.date}</Text>
            </View>
            {section.data.map((entry) => (
              <View key={entry.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>{entry.title}</Text>
                  <Text style={styles.statusBadge}>
                    {STATUS_ICONS[entry.status] ?? entry.status}
                  </Text>
                </View>
                {entry.body ? <Text style={styles.cardBody}>{entry.body}</Text> : null}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardTime}>{formatTimestamp(entry.sentAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      />
    </View>
  );
}
