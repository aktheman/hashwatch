import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  Switch,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useMinerStore } from '../store/miners';
import { useSubscriptionStore } from '../store/subscription';
import { useAuthStore, queueSetting } from '../store/auth';
import {
  useTheme,
  setCustomTheme,
  getActiveCustomThemeId,
  scheduleThemeSwitch,
  clearThemeSchedule,
} from '../theme';
import { startAutoTheme, stopAutoTheme } from '../services/autoTheme';
import { getSetting, setSetting } from '../db/database';
import { FeatureGate } from '../components/FeatureGate';
import {
  exportAllData,
  exportJSON,
  exportMinerStatusCSV,
  importFromCSV,
  previewCSV,
} from '../utils/export';
import { exportBackup, importBackup } from '../services/backup';
import { setProxyUrl, getProxyUrl } from '../constants';
import { putSetting as putRemoteSetting } from '../api/client';
import { NavigationProp } from '../types';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../services/networkStatus';
import { useNotificationHistoryStore } from '../store/notificationHistory';
import { registerPushToken, unregisterPushToken } from '../services/pushRegistration';
import i18n from '../i18n';
import { spacing, radius, fontSize, fontWeight, buttonText } from '../utils/design';
import { ThemePicker } from '../components/ThemePicker';
import * as haptic from '../utils/haptics';
import { useCustomThemesStore, customThemeToTheme } from '../store/customThemes';

function CustomThemesSection({ navigation }: { navigation: NavigationProp }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { themes, load, create } = useCustomThemesStore();

  useEffect(() => {
    load();
  }, []);

  const handleImport = useCallback(async () => {
    const { pasteThemeFromClipboard } = await import('../utils/themeShare');
    const imported = await pasteThemeFromClipboard();
    if (imported) {
      await create(imported.name, imported.colors);
      Alert.alert('Imported', `Theme "${imported.name}" imported`);
    } else {
      Alert.alert('Import Failed', 'No valid theme in clipboard');
    }
  }, [create]);

  return (
    <View style={{ marginTop: spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xs,
        }}
      >
        <Text
          style={{ color: theme.textDim, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
        >
          Custom Themes
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <FeatureGate feature={t('subscriptionGate.marketplace')}>
            <Pressable
              onPress={() => navigation.navigate('ThemeMarketplace')}
              style={{ padding: spacing.xxs }}
            >
              <Text style={{ color: theme.accent, fontSize: fontSize.sm }}>Marketplace</Text>
            </Pressable>
          </FeatureGate>
          <Pressable onPress={handleImport} style={{ padding: spacing.xxs }}>
            <Text style={{ color: theme.primary, fontSize: fontSize.sm }}>Import</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('CustomThemeEditor')}
            style={{ padding: spacing.xxs }}
          >
            <Text style={{ color: theme.primary, fontSize: fontSize.sm }}>+ New</Text>
          </Pressable>
        </View>
      </View>
      {themes.length === 0 ? (
        <Pressable
          style={{
            borderRadius: radius.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.border,
            padding: spacing.lg,
            alignItems: 'center',
            gap: spacing.xs,
            backgroundColor: theme.surface,
          }}
          onPress={() => navigation.navigate('CustomThemeEditor')}
          accessibilityRole="button"
          accessibilityLabel="Create your first custom theme"
        >
          <Text style={{ fontSize: 24 }}>🎨</Text>
          <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>No custom themes yet</Text>
          <Text style={{ color: theme.primary, fontSize: fontSize.sm }}>+ Create your first</Text>
        </Pressable>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {themes.map((ct) => {
            const ctTheme = customThemeToTheme(ct);
            return (
              <Pressable
                key={ct.id}
                style={{
                  width: '47%',
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: getActiveCustomThemeId() === ct.id ? theme.primary : theme.border,
                  padding: spacing.sm,
                  gap: spacing.xxs,
                  backgroundColor: theme.surface,
                }}
                onPress={() => {
                  setCustomTheme(customThemeToTheme(ct), ct.id);
                }}
                onLongPress={() => {
                  navigation.navigate('CustomThemeEditor', { themeId: ct.id });
                }}
                accessibilityRole="button"
                accessibilityLabel={`Apply custom theme ${ct.name}`}
              >
                <View style={{ flexDirection: 'row', gap: spacing.xxs }}>
                  <View
                    style={{ width: 16, height: 16, borderRadius: 2, backgroundColor: ctTheme.bg }}
                  />
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 2,
                      backgroundColor: ctTheme.primary,
                    }}
                  />
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 2,
                      backgroundColor: ctTheme.accent,
                    }}
                  />
                </View>
                <Text style={{ color: theme.text, fontSize: fontSize.sm }} numberOfLines={1}>
                  {ct.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            style={{
              width: '47%',
              borderRadius: radius.md,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: theme.border,
              padding: spacing.sm,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => navigation.navigate('CustomThemeEditor')}
          >
            <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>+ Create</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function NotificationHistorySection() {
  const theme = useTheme();
  const { t } = useTranslation();
  const history = useNotificationHistoryStore((s) => s.history);
  const sent = history.filter((e) => e.status === 'sent').length;
  const failed = history.filter((e) => e.status === 'failed').length;
  const recent = history.slice(0, 50);
  const styles = StyleSheet.create({
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      color: theme.textDim,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: spacing.xs,
      marginLeft: spacing.xxs,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.surface,
      padding: spacing.md,
      borderRadius: radius.md,
      marginBottom: 2,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rowLabel: {
      color: theme.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.regular,
    },
    rowValue: {
      color: theme.textDim,
      fontSize: fontSize.md,
    },
  });
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('notificationHistory.title')}</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('notificationHistory.sent')}</Text>
        <Text style={[styles.rowValue, { color: theme.success }]}>{sent}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('notificationHistory.failed')}</Text>
        <Text style={[styles.rowValue, { color: theme.danger }]}>{failed}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('notificationHistory.last50')}</Text>
        <Text style={styles.rowValue}>
          {recent.length > 0
            ? `${recent[0].title} · ${new Date(recent[0].sentAt).toLocaleDateString()}`
            : t('notificationHistory.noNotifications')}
        </Text>
      </View>
    </View>
  );
}

function formatLastSync(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function SettingsScreen({ navigation }: { navigation: NavigationProp }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const miners = useMinerStore((s) => s.miners);
  const [proxyUrl, setProxyUrlState] = useState(getProxyUrl());

  const saveProxyUrl = async () => {
    await setProxyUrl(proxyUrl);
    Alert.alert(t('settings.proxyUrlUpdated'), `Proxy URL set to ${proxyUrl}`);
  };
  const loadMiners = useMinerStore((s) => s.loadMiners);
  const scanNetwork = useMinerStore((s) => s.scanNetwork);
  const scanning = useMinerStore((s) => s.scanning);
  const { isPro } = useSubscriptionStore();
  const { token, email, login, register, logout, syncNow, syncing, lastSyncTimestamp } =
    useAuthStore();
  const { isOnline } = useNetworkStatus();

  const [showAuth, setShowAuth] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState('');
  const [powerCost, setPowerCost] = useState('');
  const [autoScan, setAutoScan] = useState(false);
  const [autoPoolSwitch, setAutoPoolSwitch] = useState(false);
  const [lastSwitchTimestamp, setLastSwitchTimestamp] = useState<number | null>(null);
  const [language, setLanguage] = useState(i18n.language);
  const [autoDarkHour, setAutoDarkHour] = useState<number | null>(null);
  const [sunMode, setSunMode] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const powerCostDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [csvInput, setCsvInput] = useState('');
  const [csvPreview, setCsvPreview] = useState<{ name: string; ip: string; port: number }[] | null>(
    null,
  );
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [retentionDays, setRetentionDays] = useState(7);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [electronUpdate, setElectronUpdate] = useState<{ version: string; url: string } | null>(
    null,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMiners();
    const pc = await getSetting('power_cost');
    setPowerCost(pc || '');
    const as = await getSetting('auto_scan');
    setAutoScan(as === 'true');
    const wh = await getSetting('webhook_url');
    setWebhookUrl(wh || '');
    setRefreshing(false);
  }, [loadMiners]);

  const loadDebugInfo = useCallback(async () => {
    try {
      const { default: Purchases } = await import('react-native-purchases');
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(JSON.stringify(info, null, 2));
      const ent = info.entitlements.active;
      setEntitlements(
        Object.keys(ent).length > 0
          ? JSON.stringify(
              Array.from(Object.entries(ent)).map(([k, v]) => ({
                [k]: { expiresDate: v.expirationDate },
              })),
              null,
              2,
            )
          : t('settings.noActiveEntitlements'),
      );
    } catch (e) {
      setCustomerInfo('Error loading: ' + String(e));
    }
  }, []);

  useEffect(() => {
    getSetting('power_cost').then((v) => setPowerCost(v || ''));
    getSetting('auto_scan').then((v) => setAutoScan(v === 'true'));
    getSetting('auto_pool_switch').then((v) => setAutoPoolSwitch(v === 'true'));
    import('../services/autoPoolSwitch').then((m) =>
      m.getLastSwitchTimestamp().then(setLastSwitchTimestamp),
    );
    getSetting('language').then((saved) => {
      if (saved) i18n.changeLanguage(saved);
    });
    getSetting('auto_dark_hour').then((v) => setAutoDarkHour(v ? parseInt(v) : null));
    getSetting('auto_theme_mode').then((v) => setSunMode(v === 'sunrise_sunset'));
    getSetting('user_latitude').then((v) => setLatitude(v || ''));
    getSetting('user_longitude').then((v) => setLongitude(v || ''));
    getSetting('webhook_url').then((v) => setWebhookUrl(v || ''));
    getSetting('snapshot_retention_days').then((v) => setRetentionDays(v ? parseInt(v, 10) : 7));
    import('../db/database').then((m) =>
      m
        .getSnapshots('*', 0)
        .then(() => m.getSnapshots('*', 999999).then((snaps) => setSnapshotCount(snaps.length))),
    );
    useNotificationHistoryStore.getState().loadHistory();
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.isElectron) return;
    const unsub = window.electronAPI.onCheckForUpdate((info) => setElectronUpdate(info));
    return unsub;
  }, []);

  const handleAuth = async () => {
    setAuthError('');
    const ok = isRegister
      ? await register(authEmail, authPassword)
      : await login(authEmail, authPassword);
    if (ok) {
      setShowAuth(false);
      setAuthEmail('');
      setAuthPassword('');
    } else {
      setAuthError(isRegister ? t('settings.registrationFailed') : t('settings.loginFailed'));
    }
  };

  const saveWebhookUrl = useCallback(async () => {
    await setSetting('webhook_url', webhookUrl);
    const { useAuthStore } = await import('../store/auth');
    const token = useAuthStore.getState().token;
    if (token) {
      putRemoteSetting('webhook_url', webhookUrl).catch(() => {});
    }
    Alert.alert(t('common.success'), t('settingsExtra.webhookSaved'));
  }, [webhookUrl, t]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
          padding: spacing.md,
        },
        title: {
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.lg,
          marginTop: spacing.xs,
          letterSpacing: -0.5,
        },
        section: {
          marginBottom: spacing.lg,
        },
        sectionTitle: {
          color: theme.textDim,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: spacing.xs,
          marginLeft: spacing.xs,
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.surface,
          padding: spacing.md,
          borderRadius: radius.lg,
          marginBottom: 2,
          borderWidth: 1,
          borderColor: theme.border,
        },
        rowLabel: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
        },
        rowValue: {
          color: theme.textDim,
          fontSize: fontSize.md,
        },
        rowRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xxs,
        },
        badge: {
          paddingHorizontal: spacing.xs,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
        },
        badgeText: {
          fontSize: fontSize.sm,
          fontWeight: fontWeight.bold,
        },
        chevron: {
          color: theme.textMuted,
          fontSize: fontSize.h3,
          fontWeight: '300',
        },
        actionText: {
          color: theme.primary,
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
        },
        authBox: {
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: spacing.md,
          marginTop: 2,
          gap: spacing.xs,
          borderWidth: 1,
          borderColor: theme.border,
        },
        authInput: {
          backgroundColor: theme.surface,
          borderRadius: radius.md,
          padding: spacing.sm,
          color: theme.text,
          fontSize: fontSize.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        authError: {
          color: theme.danger,
          fontSize: fontSize.base,
        },
        authBtn: {
          backgroundColor: theme.primary,
          borderRadius: radius.md,
          padding: spacing.sm,
          alignItems: 'center',
        },
        authBtnText: {
          color: buttonText,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.md,
        },
        authToggle: {
          color: theme.primary,
          fontSize: fontSize.base,
          textAlign: 'center',
          fontWeight: fontWeight.regular,
        },
        logoutBtn: {
          backgroundColor: theme.danger + '1A',
          borderRadius: radius.md,
          padding: spacing.sm,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.danger + '4D',
        },
        logoutBtnText: {
          color: theme.danger,
          fontWeight: fontWeight.bold,
        },
        themeBtn: {
          paddingHorizontal: spacing.xs,
          paddingVertical: spacing.xs,
          borderRadius: radius.sm,
          borderWidth: 1,
        },
        themeBtnText: {
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        sectionSub: {
          color: theme.textDim,
          fontSize: fontSize.sm,
          lineHeight: 18,
        },
        input: {
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: spacing.sm,
          color: theme.text,
          fontSize: fontSize.base,
          fontFamily: 'monospace',
          borderWidth: 1,
          borderColor: theme.border,
        },
        proxyBtn: {
          borderRadius: radius.md,
          padding: spacing.xs,
          alignItems: 'center',
          marginTop: spacing.xs,
        },
        proxyBtnText: {
          color: '#FFF',
          fontWeight: fontWeight.bold,
          fontSize: fontSize.base,
        },
      }),
    [theme],
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <Text style={styles.title}>{t('settings.title')}</Text>

      {Platform.OS === 'web' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.connection')}</Text>
          <Text style={[styles.sectionSub, { marginBottom: 10 }]}>
            {t('settings.proxyUrlHelp')}
          </Text>
          <TextInput
            style={styles.input}
            value={proxyUrl}
            onChangeText={setProxyUrlState}
            placeholder="http://localhost:4567"
            placeholderTextColor={theme.textMuted}
            onSubmitEditing={saveProxyUrl}
            returnKeyType="done"
            accessibilityLabel="Proxy URL input"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.saveProxyUrl')}
            style={[styles.proxyBtn, { backgroundColor: theme.primary }]}
            onPress={() => {
              haptic.success();
              saveProxyUrl();
            }}
          >
            <Text style={styles.proxyBtnText}>{t('settings.saveProxyUrl')}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Wallets"
          style={styles.row}
          onPress={() => {
            haptic.light();
            navigation.navigate('Wallets');
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.wallets')}</Text>
          <View style={styles.rowRight}>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Plan"
          style={styles.row}
          onPress={() => {
            haptic.light();
            navigation.navigate('Subscription');
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.plan')}</Text>
          <View style={styles.rowRight}>
            <View
              style={[
                styles.badge,
                { backgroundColor: isPro ? theme.success + '26' : theme.surfaceLight },
              ]}
            >
              <Text style={[styles.badgeText, { color: isPro ? theme.success : theme.textDim }]}>
                {isPro ? t('settings.pro') : t('settings.free')}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showDebugPanel ? t('settings.hideDebug') : t('settings.debugMenu')}
          onPress={() => {
            haptic.light();
            setShowDebugPanel(!showDebugPanel);
            if (!showDebugPanel) loadDebugInfo();
          }}
          style={{ marginTop: spacing.xs }}
        >
          <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, textAlign: 'center' }}>
            {showDebugPanel ? `▲ ${t('settings.hideDebug')}` : `▼ ${t('settings.debugMenu')}`}
          </Text>
        </Pressable>
        {showDebugPanel && (
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: radius.lg,
              padding: spacing.md,
              marginTop: spacing.xs,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ gap: spacing.xs }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
                style={{
                  backgroundColor: theme.primary + '20',
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  alignItems: 'center',
                }}
                onPress={() => {
                  haptic.medium();
                  useSubscriptionStore.getState().restore();
                  Alert.alert(t('settings.restoreTitle'), t('settings.restoreBody'));
                }}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontWeight: fontWeight.semibold,
                    fontSize: fontSize.base,
                  }}
                >
                  {t('settings.restorePurchases')}
                </Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: spacing.xxs }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Force pro status"
                  style={{
                    flex: 1,
                    backgroundColor: theme.success + '20',
                    borderRadius: 8,
                    padding: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    haptic.medium();
                    useSubscriptionStore.getState().setPro();
                    Alert.alert(t('settings.debugProTitle'), t('settings.debugProBody'));
                  }}
                >
                  <Text
                    style={{
                      color: theme.success,
                      fontWeight: fontWeight.semibold,
                      fontSize: fontSize.base,
                    }}
                  >
                    {t('settings.forcePro')}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Force free status"
                  style={{
                    flex: 1,
                    backgroundColor: theme.danger + '20',
                    borderRadius: 8,
                    padding: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    haptic.medium();
                    useSubscriptionStore.getState().setFree();
                    Alert.alert(t('settings.debugProTitle'), t('settings.debugFreeBody'));
                  }}
                >
                  <Text
                    style={{
                      color: theme.danger,
                      fontWeight: fontWeight.semibold,
                      fontSize: fontSize.base,
                    }}
                  >
                    {t('settings.forceFree')}
                  </Text>
                </Pressable>
              </View>
              {customerInfo && (
                <View
                  style={{
                    backgroundColor: '#000' + '40',
                    borderRadius: radius.sm,
                    padding: spacing.xs,
                  }}
                >
                  <Text
                    style={{ color: theme.textDim, fontSize: fontSize.xs, fontFamily: 'monospace' }}
                  >
                    {customerInfo}
                  </Text>
                </View>
              )}
              {entitlements && (
                <View
                  style={{
                    backgroundColor: '#000' + '40',
                    borderRadius: radius.sm,
                    padding: spacing.xs,
                  }}
                >
                  <Text
                    style={{ color: theme.textDim, fontSize: fontSize.xs, fontFamily: 'monospace' }}
                  >
                    {entitlements}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remote Sync"
          style={styles.row}
          onPress={() => {
            haptic.light();
            setShowAuth(!showAuth);
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.remoteSync')}</Text>
          <View style={styles.rowRight}>
            <Text style={[styles.rowValue, token && { color: theme.success }]}>
              {token ? email || t('settings.connected') : t('settings.off')}
            </Text>
            <Text style={styles.chevron}>{showAuth ? 'v' : '›'}</Text>
          </View>
        </Pressable>

        {showAuth && (
          <View style={styles.authBox}>
            {token ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Disconnect"
                  style={styles.logoutBtn}
                  onPress={() => {
                    haptic.heavy();
                    logout();
                  }}
                >
                  <Text style={styles.logoutBtnText}>{t('settings.disconnect')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sync Now"
                  accessibilityHint={
                    syncing ? 'Syncing in progress' : 'Syncs all settings with the server'
                  }
                  accessibilityState={{ disabled: syncing }}
                  style={[styles.authBtn, { marginTop: spacing.xs }]}
                  onPress={() => {
                    haptic.medium();
                    syncNow();
                  }}
                  disabled={syncing}
                >
                  <Text style={styles.authBtnText}>
                    {syncing ? t('settings.syncing') : t('settings.syncNow')}
                  </Text>
                </Pressable>
                {lastSyncTimestamp && (
                  <Text style={[styles.sectionSub, { textAlign: 'center', marginTop: spacing.xs }]}>
                    {t('settings.lastSync', {
                      time: formatLastSync(lastSyncTimestamp),
                    })}
                  </Text>
                )}
              </>
            ) : (
              <>
                <TextInput
                  style={styles.authInput}
                  placeholder={t('settings.emailPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  value={authEmail}
                  onChangeText={setAuthEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  accessibilityLabel="Email input"
                />
                <TextInput
                  style={styles.authInput}
                  placeholder={t('settings.passwordPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  value={authPassword}
                  onChangeText={setAuthPassword}
                  secureTextEntry
                  accessibilityLabel="Password input"
                />
                {authError && <Text style={styles.authError}>{authError}</Text>}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isRegister ? 'Create Account' : 'Sign In'}
                  style={styles.authBtn}
                  onPress={() => {
                    haptic.medium();
                    handleAuth();
                  }}
                >
                  <Text style={styles.authBtnText}>
                    {isRegister ? t('settings.createAccount') : t('settings.signIn')}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isRegister ? 'Switch to sign in' : 'Switch to create account'}
                  onPress={() => setIsRegister(!isRegister)}
                >
                  <Text style={styles.authToggle}>
                    {isRegister ? t('settings.switchToSignIn') : t('settings.switchToCreate')}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('settings.theme')}</Text>
        </View>
        <ThemePicker
          onThemeChange={(mode) => {
            const val = mode === 'system' ? 'system' : mode;
            setSetting('theme_mode', val);
            if (token) {
              if (isOnline) {
                putRemoteSetting('theme_mode', val).catch(() =>
                  console.warn('Failed to sync theme_mode'),
                );
              } else {
                queueSetting('theme_mode', val);
              }
            }
          }}
        />

        {token && <CustomThemesSection navigation={navigation} />}

        <View style={{ ...styles.row, marginTop: spacing.xs }}>
          <Text style={styles.rowLabel}>{t('settings.language')}</Text>
        </View>
        <View style={{ paddingHorizontal: 4, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs }}>
            {['en', 'es', 'zh', 'ja', 'de', 'fr'].map((lang) => (
              <Pressable
                key={lang}
                accessibilityRole="button"
                accessibilityLabel={`Switch language to ${lang}`}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.md,
                  backgroundColor: language === lang ? theme.primary : theme.surfaceLight,
                  borderWidth: 1,
                  borderColor: language === lang ? theme.primary : theme.border,
                }}
                onPress={() => {
                  haptic.selection();
                  i18n.changeLanguage(lang);
                  setLanguage(lang);
                  setSetting('language', lang);
                }}
              >
                <Text
                  style={{
                    color: language === lang ? '#FFF' : theme.text,
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {
                    {
                      en: '🇬🇧 English',
                      es: '🇪🇸 Español',
                      zh: '🇨🇳 中文',
                      ja: '🇯🇵 日本語',
                      de: '🇩🇪 Deutsch',
                      fr: '🇫🇷 Français',
                    }[lang]
                  }
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ ...styles.row, marginTop: spacing.md }}>
          <Text style={styles.rowLabel}>{t('settings.darkModeSchedule')}</Text>
        </View>
        <View style={{ paddingHorizontal: 4, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Disable dark mode schedule"
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radius.md,
                backgroundColor: autoDarkHour === null ? theme.primary : theme.surfaceLight,
                borderWidth: 1,
                borderColor: autoDarkHour === null ? theme.primary : theme.border,
              }}
              onPress={() => {
                haptic.selection();
                setAutoDarkHour(null);
                clearThemeSchedule();
                setSetting('auto_dark_hour', '');
              }}
            >
              <Text
                style={{
                  color: autoDarkHour === null ? '#FFF' : theme.text,
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {t('settings.off')}
              </Text>
            </Pressable>
            {[17, 18, 19, 20, 21, 22, 23, 0, 1, 2].map((hour) => (
              <Pressable
                key={hour}
                accessibilityRole="button"
                accessibilityLabel={`Schedule dark mode at ${hour}:00`}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.md,
                  backgroundColor: autoDarkHour === hour ? theme.primary : theme.surfaceLight,
                  borderWidth: 1,
                  borderColor: autoDarkHour === hour ? theme.primary : theme.border,
                }}
                onPress={() => {
                  haptic.selection();
                  setAutoDarkHour(hour);
                  scheduleThemeSwitch(hour, 'dark');
                  scheduleThemeSwitch((hour + (hour >= 23 ? -17 : 1)) % 24, 'light');
                  setSetting('auto_dark_hour', String(hour));
                }}
              >
                <Text
                  style={{
                    color: autoDarkHour === hour ? '#FFF' : theme.text,
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {hour === 0
                    ? '12a'
                    : hour < 12
                      ? `${hour}a`
                      : hour === 12
                        ? '12p'
                        : `${hour - 12}p`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ marginTop: spacing.md }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { marginBottom: spacing.xxs }]}>
                Follow sunrise & sunset
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>
                Auto dark at sunset, light at sunrise
              </Text>
            </View>
            <Switch
              value={sunMode}
              onValueChange={async (v) => {
                setSunMode(v);
                if (v) {
                  setAutoDarkHour(null);
                  setSetting('auto_dark_hour', '');
                  clearThemeSchedule();
                  await setSetting('auto_theme_mode', 'sunrise_sunset');
                } else {
                  await setSetting('auto_theme_mode', '');
                }
                stopAutoTheme();
                startAutoTheme();
              }}
              trackColor={{ false: theme.surfaceLight, true: theme.primary + '88' }}
              thumbColor={sunMode ? theme.primary : theme.surface}
            />
          </View>
          {sunMode && (
            <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: theme.surfaceLight,
                    borderRadius: radius.sm,
                    padding: spacing.sm,
                    color: theme.text,
                    fontSize: fontSize.sm,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  value={latitude}
                  onChangeText={setLatitude}
                  placeholder="Latitude (e.g. 40.71)"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                />
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: theme.surfaceLight,
                    borderRadius: radius.sm,
                    padding: spacing.sm,
                    color: theme.text,
                    fontSize: fontSize.sm,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="Longitude (e.g. -74.00)"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                />
              </View>
              <Pressable
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: radius.sm,
                  padding: spacing.sm,
                  alignItems: 'center',
                }}
                onPress={async () => {
                  haptic.success();
                  await setSetting('user_latitude', latitude);
                  await setSetting('user_longitude', longitude);
                  stopAutoTheme();
                  startAutoTheme();
                  Alert.alert('Saved', 'Location saved. Theme will follow sunrise/sunset.');
                }}
                accessibilityRole="button"
                accessibilityLabel="Save location for sunrise sunset"
              >
                <Text style={{ color: '#FFF', fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
                  Save Location
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionSub, { marginBottom: 10 }]}>{t('settings.powerCostHelp')}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('settings.perKwh')}</Text>
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 12, maxWidth: 120, textAlign: 'right' }]}
            value={powerCost}
            onChangeText={(t) => {
              setPowerCost(t);
              if (powerCostDebounceRef.current) clearTimeout(powerCostDebounceRef.current);
              powerCostDebounceRef.current = setTimeout(() => {
                setSetting('power_cost', t);
                if (token) {
                  if (isOnline) {
                    putRemoteSetting('power_cost', t).catch(() =>
                      console.warn('Failed to sync power_cost'),
                    );
                  } else {
                    queueSetting('power_cost', t);
                  }
                }
              }, 500);
            }}
            placeholder="0.12"
            placeholderTextColor={theme.textMuted}
            keyboardType="decimal-pad"
            accessibilityLabel="Power cost input"
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitle}>
          <Text style={{ color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
            {t('settings.notifications')}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderRadius: radius.lg,
            padding: spacing.md,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.text, fontSize: fontSize.base }}>
            {t('settings.pushAlerts')}
          </Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={(val) => {
              setNotificationsEnabled(val);
              setSetting('notifications_enabled', String(val));
              const valStr = String(val);
              putRemoteSetting('notifications_enabled', valStr).catch(() =>
                console.warn('Failed to sync notifications_enabled'),
              );
              queueSetting('notifications_enabled', valStr);
              if (val) {
                registerPushToken(token);
              } else {
                unregisterPushToken(token);
              }
            }}
            trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
            thumbColor={notificationsEnabled ? theme.primary : theme.textMuted}
            accessibilityLabel="Toggle push notifications"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.alertHistory')}
          style={[styles.row, { marginTop: spacing.xs }]}
          onPress={() => {
            haptic.light();
            navigation.navigate('AlertHistory');
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.alertHistory')}</Text>
          <View style={styles.rowRight}>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.notificationHistory')}
          style={[styles.row, { marginTop: spacing.xxs }]}
          onPress={() => {
            haptic.light();
            navigation.navigate('NotificationHistory');
          }}
        >
          <Text style={styles.rowLabel}>
            {t('settings.notificationHistory', 'Notification History')}
          </Text>
          <View style={styles.rowRight}>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Pressable>
      </View>

      <NotificationHistorySection />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settingsExtra.webhooks')}</Text>
        <View style={styles.row}>
          <TextInput
            style={{
              flex: 1,
              color: theme.text,
              backgroundColor: theme.surfaceLight,
              borderRadius: 8,
              padding: 10,
              fontSize: fontSize.md,
              borderWidth: 1,
              borderColor: theme.border,
            }}
            value={webhookUrl}
            onChangeText={setWebhookUrl}
            placeholder="https://hooks.example.com/alert"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save webhook URL"
            style={{
              backgroundColor: theme.primary,
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 10,
              marginLeft: 8,
            }}
            onPress={() => {
              haptic.success();
              saveWebhookUrl();
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: fontWeight.bold }}>{t('common.save')}</Text>
          </Pressable>
        </View>
        <Text
          style={{
            color: theme.textDim,
            fontSize: fontSize.xs,
            paddingHorizontal: spacing.sm,
            paddingTop: spacing.xxs,
          }}
        >
          Receive POST requests when miner alerts fire. The payload includes event, miner info,
          title, body, and timestamp.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.miners')}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('settings.totalMiners')}</Text>
          <Text style={styles.rowValue}>{miners.length}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('settings.online')}</Text>
          <Text style={[styles.rowValue, { color: theme.success }]}>
            {miners.filter((m) => m.isOnline).length}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('settings.autoScan')}</Text>
          <Switch
            value={autoScan}
            onValueChange={(v) => {
              setAutoScan(v);
              const val = String(v);
              setSetting('auto_scan', val);
              if (token) {
                if (isOnline) {
                  putRemoteSetting('auto_scan', val).catch(() =>
                    console.warn('Failed to sync auto_scan'),
                  );
                } else {
                  queueSetting('auto_scan', val);
                }
              }
            }}
            trackColor={{ false: theme.border, true: theme.primary + '60' }}
            thumbColor={autoScan ? theme.primary : theme.textMuted}
            accessibilityLabel="Auto-scan network"
          />
        </View>
        <FeatureGate feature={t('settings.autoPoolSwitch')}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.autoPoolSwitch')}</Text>
            <Switch
              value={autoPoolSwitch}
              onValueChange={(v) => {
                setAutoPoolSwitch(v);
                const val = String(v);
                setSetting('auto_pool_switch', val);
                if (token) {
                  if (isOnline) {
                    putRemoteSetting('auto_pool_switch', val).catch(() =>
                      console.warn('Failed to sync auto_pool_switch'),
                    );
                  } else {
                    queueSetting('auto_pool_switch', val);
                  }
                }
              }}
              trackColor={{ false: theme.border, true: theme.primary + '60' }}
              thumbColor={autoPoolSwitch ? theme.primary : theme.textMuted}
              accessibilityLabel="Auto-switch pools"
            />
          </View>
        </FeatureGate>
        {autoPoolSwitch && lastSwitchTimestamp && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.lastPoolSwitch')}</Text>
            <Text style={styles.rowValue}>{new Date(lastSwitchTimestamp).toLocaleString()}</Text>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.refreshAll')}
          style={styles.row}
          onPress={() => {
            haptic.light();
            loadMiners();
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.refreshAll')}</Text>
          <Text style={styles.actionText}>{t('settings.refresh')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={scanning ? t('settings.scanning') : t('settings.scanNetwork')}
          accessibilityState={{ disabled: scanning }}
          accessibilityHint="Scans local network for new miners"
          style={styles.row}
          onPress={() => {
            haptic.medium();
            scanNetwork();
          }}
          disabled={scanning}
        >
          <Text style={styles.rowLabel}>{t('settings.scanNetwork')}</Text>
          <Text style={styles.actionText}>
            {scanning ? t('settings.scanning') : t('settings.scan')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Groups"
          style={styles.row}
          onPress={() => {
            haptic.light();
            navigation.navigate('Groups');
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.groups')}</Text>
          <View style={styles.rowRight}>
            <Text style={styles.actionText}>{t('settings.manage')}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Pressable>
        <FeatureGate feature={t('navigator.firmware', 'Firmware')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('navigator.firmware', 'Firmware')}
            style={styles.row}
            onPress={() => {
              haptic.light();
              navigation.navigate('Firmware');
            }}
          >
            <Text style={styles.rowLabel}>{t('navigator.firmware', 'Firmware')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
        </FeatureGate>
        <FeatureGate feature={t('navigator.darkPool', 'Dark Pool')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('navigator.darkPool', 'Dark Pool')}
            style={styles.row}
            onPress={() => {
              haptic.light();
              navigation.navigate('DarkPool');
            }}
          >
            <Text style={styles.rowLabel}>{t('navigator.darkPool', 'Dark Pool')}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
        </FeatureGate>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.dataStorage', 'Data Storage')}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>
            {t('settings.snapshotRetention', 'Snapshot Retention')}
          </Text>
          <Text style={styles.rowValue}>
            {retentionDays} {t('settings.days', 'days')} ({snapshotCount})
          </Text>
        </View>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs }}>
            {[1, 3, 7, 14, 30, 60, 90].map((days) => (
              <Pressable
                key={days}
                accessibilityRole="button"
                accessibilityLabel={`Set retention to ${days} days`}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.md,
                  backgroundColor: retentionDays === days ? theme.primary : theme.surfaceLight,
                  borderWidth: 1,
                  borderColor: retentionDays === days ? theme.primary : theme.border,
                }}
                onPress={() => {
                  haptic.selection();
                  setRetentionDays(days);
                  setSetting('snapshot_retention_days', String(days));
                  if (token && isOnline) {
                    putRemoteSetting('snapshot_retention_days', String(days)).catch(() => {});
                  } else if (token) {
                    queueSetting('snapshot_retention_days', String(days));
                  }
                }}
              >
                <Text
                  style={{
                    color: retentionDays === days ? '#FFF' : theme.text,
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {days}d
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, marginTop: spacing.xs }}>
            {t('settings.retentionHelp', 'Snapshots older than this are auto-cleaned.')}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export CSV"
          style={styles.row}
          onPress={() => {
            haptic.medium();
            exportAllData().catch(() => {
              Alert.alert(t('settings.exportFailed'), t('settings.exportFailed'));
            });
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.exportCsv')}</Text>
          <Text style={styles.actionText}>{t('settings.snapshots')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export Status CSV"
          style={styles.row}
          onPress={() => {
            haptic.medium();
            exportMinerStatusCSV().catch(() => {
              Alert.alert(t('settings.exportFailed'), t('settings.exportFailed'));
            });
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.exportStatus')}</Text>
          <Text style={styles.actionText}>{t('settings.currentStatus')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export JSON backup"
          style={styles.row}
          onPress={() => {
            haptic.medium();
            exportJSON().catch(() => {
              Alert.alert(t('settings.exportFailed'), t('settings.exportFailed'));
            });
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.exportJson')}</Text>
          <Text style={styles.actionText}>{t('settings.fullBackup')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import data"
          style={styles.row}
          onPress={() => {
            haptic.light();
            navigation.navigate('ImportData');
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.importData')}</Text>
          <View style={styles.rowRight}>
            <Text style={styles.actionText}>{t('settings.restore')}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import CSV"
          style={styles.row}
          onPress={() => {
            haptic.light();
            setShowCsvImport(!showCsvImport);
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.importCsv')}</Text>
          <Text style={styles.actionText}>
            {showCsvImport ? t('settings.cancel') : t('settings.import')}
          </Text>
        </Pressable>
        {showCsvImport && (
          <View style={{ marginTop: spacing.md, gap: spacing.xxs }}>
            <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>
              {t('settings.csvHelp')}
            </Text>
            {csvPreview ? (
              <>
                <View
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: fontWeight.bold, marginBottom: 4 }}>
                    Preview ({csvPreview.length} miners)
                  </Text>
                  {csvPreview.slice(0, 5).map((m, i) => (
                    <Text key={i} style={{ color: theme.textDim, fontSize: fontSize.sm }}>
                      {m.name} @ {m.ip}:{m.port}
                    </Text>
                  ))}
                  {csvPreview.length > 5 && (
                    <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, marginTop: 2 }}>
                      ...and {csvPreview.length - 5} more
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.xxs }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Confirm CSV import"
                    style={{
                      flex: 1,
                      backgroundColor: theme.primary,
                      borderRadius: radius.md,
                      padding: 12,
                      alignItems: 'center',
                    }}
                    onPress={async () => {
                      haptic.success();
                      const result = await importFromCSV(csvInput);
                      Alert.alert(
                        t('settings.importComplete'),
                        `${t('settings.import')}: ${result.imported} miner${result.imported !== 1 ? 's' : ''}${result.errors.length > 0 ? `\nErrors: ${result.errors.length}` : ''}`,
                        [{ text: t('common.ok') }],
                      );
                      if (result.errors.length > 0) {
                        console.warn('CSV import errors:', result.errors);
                      }
                      setShowCsvImport(false);
                      setCsvInput('');
                      setCsvPreview(null);
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFF',
                        fontWeight: fontWeight.bold,
                        fontSize: fontSize.base,
                      }}
                    >
                      {t('settings.confirmImport')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.edit')}
                    style={{
                      backgroundColor: theme.surfaceLight,
                      borderRadius: radius.md,
                      padding: 12,
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      haptic.light();
                      setCsvPreview(null);
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: fontWeight.semibold }}>
                      {t('settings.edit')}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <TextInput
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: radius.md,
                    padding: 12,
                    color: theme.text,
                    fontFamily: 'monospace',
                    fontSize: fontSize.sm,
                    minHeight: 100,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  value={csvInput}
                  onChangeText={setCsvInput}
                  multiline
                  placeholder={t('settings.csvPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                />
                <View style={{ flexDirection: 'row', gap: spacing.xxs }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Preview CSV data"
                    style={{
                      flex: 1,
                      backgroundColor: theme.primary,
                      borderRadius: radius.md,
                      padding: 12,
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      haptic.medium();
                      const preview = previewCSV(csvInput);
                      if (preview.errors.length > 0) {
                        Alert.alert(t('settingsExtra.csvErrors'), preview.errors.join('\n'));
                      }
                      if (preview.valid.length > 0) {
                        setCsvPreview(preview.valid);
                      } else {
                        Alert.alert(
                          t('settingsExtra.noValidRows'),
                          t('settingsExtra.checkCsvColumns'),
                        );
                      }
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFF',
                        fontWeight: fontWeight.bold,
                        fontSize: fontSize.base,
                      }}
                    >
                      {t('settings.preview')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.cancel')}
                    style={{
                      backgroundColor: theme.surfaceLight,
                      borderRadius: radius.md,
                      padding: 12,
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      haptic.light();
                      setShowCsvImport(false);
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: fontWeight.semibold }}>
                      {t('settings.cancel')}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.backup')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export all data"
          style={styles.row}
          onPress={() => {
            haptic.medium();
            exportBackup().catch((e) => {
              Alert.alert(
                t('settings.exportFailed'),
                e instanceof Error ? e.message : t('settings.unknownError'),
              );
            });
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.exportAllData')}</Text>
          <Text style={styles.actionText}>{t('settings.download')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import data from file"
          style={styles.row}
          onPress={() => {
            haptic.medium();
            if (window.electronAPI?.isElectron) {
              window.electronAPI
                .showOpenDialog({ filters: [{ name: 'JSON', extensions: ['json'] }] })
                .then(async (result) => {
                  if (result.canceled || !result.content) return;
                  try {
                    const r = await importBackup(result.content);
                    if (r.success) {
                      Alert.alert(t('settings.importComplete'), t('settings.restoreSuccess'));
                      loadMiners();
                    } else {
                      Alert.alert(
                        t('settings.importFailed'),
                        (r.errors || []).join('\n') || t('settings.unknownError'),
                      );
                    }
                  } catch (e) {
                    Alert.alert(
                      t('settings.importFailed'),
                      e instanceof Error ? e.message : t('settings.failedToReadFile'),
                    );
                  }
                });
            } else if (Platform.OS === 'web') {
              const input = window.document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const result = await importBackup(text);
                  if (result.success) {
                    Alert.alert(t('settings.importComplete'), t('settings.restoreSuccess'));
                    loadMiners();
                  } else {
                    Alert.alert(
                      t('settings.importFailed'),
                      (result.errors || []).join('\n') || t('settings.unknownError'),
                    );
                  }
                } catch (e) {
                  Alert.alert(
                    t('settings.importFailed'),
                    e instanceof Error ? e.message : t('settings.failedToReadFile'),
                  );
                }
              };
              input.click();
            } else {
              navigation.navigate('ImportData');
            }
          }}
        >
          <Text style={styles.rowLabel}>{t('settings.importData')}</Text>
          <Text style={styles.actionText}>{t('settings.restore')}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('settings.version')}</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
        {electronUpdate && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Update available"
            style={[
              styles.row,
              { backgroundColor: theme.primary + '20', borderColor: theme.primary },
            ]}
            onPress={() => {
              if (window.electronAPI?.isElectron) {
                window.open(electronUpdate.url, '_blank');
              }
            }}
          >
            <Text style={[styles.rowLabel, { color: theme.primary }]}>
              {t('settingsExtra.updateAvailable', { version: electronUpdate.version })}
            </Text>
            <Text style={[styles.actionText, { color: theme.primary }]}>
              {t('settings.download')}
            </Text>
          </Pressable>
        )}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('settings.madeFor')}</Text>
          <Text style={styles.rowValue}>{t('settings.bitaxeMiners')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
