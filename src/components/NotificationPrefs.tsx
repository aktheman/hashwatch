import { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/auth';
import { getNotificationPrefs, setNotificationPref } from '../api/client';
import * as DB from '../db/database';

interface NotificationPrefsProps {
  minerId: string;
}

const ALERT_LABELS: Record<string, string> = {
  offline: 'Offline',
  online: 'Reconnected',
  hot: 'High Temperature',
  hashrate_drop: 'Hashrate Drop',
  pool_lost: 'Pool Lost',
  long_uptime: 'Long Uptime',
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
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (token) {
      getNotificationPrefs(minerId)
        .then(setPrefs)
        .catch(() => {});
    } else {
      getLocalPrefs(minerId).then(setPrefs);
    }
  }, [minerId, token]);

  if (!prefs) return null;

  const toggle = async (alertType: string, enabled: boolean) => {
    setPrefs((p) => (p ? { ...p, [alertType]: enabled } : p));
    const persist = token
      ? () => setNotificationPref(minerId, alertType, enabled)
      : () => setLocalPref(minerId, alertType, enabled);
    await persist().catch(() => {
      setPrefs((p) => (p ? { ...p, [alertType]: !enabled } : p));
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.textDim }]}>Notifications</Text>
      {Object.entries(ALERT_LABELS).map(([key, label]) => (
        <View key={key} style={styles.row}>
          <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
          <Switch
            value={prefs[key] ?? true}
            onValueChange={(v) => toggle(key, v)}
            trackColor={{ false: theme.textMuted, true: theme.primary + '80' }}
            thumbColor={prefs[key] ? theme.primary : theme.textMuted}
            accessibilityLabel={`${label} notification`}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
});
