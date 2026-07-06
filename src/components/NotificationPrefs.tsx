import { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/auth';
import { getNotificationPrefs, setNotificationPref } from '../api/client';
import * as DB from '../db/database';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';

interface NotificationPrefsProps {
  minerId: string;
}

const ALERT_LABELS_MAP: Record<string, string> = {
  offline: 'notificationPrefs.offline',
  online: 'notificationPrefs.online',
  hot: 'notificationPrefs.hot',
  hashrate_drop: 'notificationPrefs.hashrateDrop',
  pool_lost: 'notificationPrefs.poolLost',
  long_uptime: 'notificationPrefs.longUptime',
};

async function getLocalPrefs(minerId: string): Promise<Record<string, boolean>> {
  const raw = await DB.getSetting(`notify_${minerId}`);
  return raw ? JSON.parse(raw) : {};
}

async function setLocalPref(minerId: string, alertType: string, enabled: boolean): Promise<void> {
  const prefs = await getLocalPrefs(minerId);
  prefs[alertType] = enabled;
  await DB.setSetting(`notify_${minerId}`, JSON.stringify(prefs));
}

export function NotificationPrefs({ minerId }: NotificationPrefsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (token) {
      getNotificationPrefs(minerId)
        .then((p) => {
          if (cancelled) return;
          setPrefs(p);
          for (const [key, val] of Object.entries(p)) {
            setLocalPref(minerId, key, val).catch(() => {});
          }
        })
        .catch(() => {
          if (cancelled) return;
          getLocalPrefs(minerId).then((p) => {
            if (cancelled) return;
            setPrefs(p);
          });
        });
    } else {
      getLocalPrefs(minerId).then((p) => {
        if (cancelled) return;
        setPrefs(p);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [minerId, token]);

  if (!prefs) return null;

  const toggle = async (alertType: string, enabled: boolean) => {
    setPrefs((p) => (p ? { ...p, [alertType]: enabled } : p));
    try {
      if (token) {
        await setNotificationPref(minerId, alertType, enabled);
      }
      await setLocalPref(minerId, alertType, enabled);
    } catch {
      setPrefs((p) => (p ? { ...p, [alertType]: !enabled } : p));
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.textDim }]}>{t('notificationPrefs.title')}</Text>
      {Object.entries(ALERT_LABELS_MAP).map(([key, label]) => (
        <View key={key} style={styles.row}>
          <Text style={[styles.label, { color: theme.text }]}>{t(label)}</Text>
          <Switch
            value={prefs[key] ?? true}
            onValueChange={(v) => toggle(key, v)}
            trackColor={{ false: theme.textMuted, true: theme.primary + '80' }}
            thumbColor={prefs[key] ? theme.primary : theme.textMuted}
            accessibilityLabel={`${t(label)} notification`}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
  },
});
