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
  setThemeMode,
  getThemeMode,
  scheduleThemeSwitch,
  clearThemeSchedule,
} from '../theme';
import { getSetting, setSetting } from '../db/database';
import { exportAllData, exportJSON, importFromCSV } from '../utils/export';
import { exportBackup, importBackup } from '../services/backup';
import { setProxyUrl, getProxyUrl } from '../constants';
import { putSetting as putRemoteSetting } from '../api/client';
import { NavigationProp } from '../types';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../services/networkStatus';
import { useNotificationHistoryStore } from '../store/notificationHistory';
import i18n from '../i18n';

function NotificationHistorySection() {
  const theme = useTheme();
  const { t } = useTranslation();
  const history = useNotificationHistoryStore((s) => s.history);
  const sent = history.filter((e) => e.status === 'sent').length;
  const failed = history.filter((e) => e.status === 'failed').length;
  const recent = history.slice(0, 50);
  const styles = StyleSheet.create({
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      color: theme.textDim,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 4,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.surface,
      padding: 14,
      borderRadius: 12,
      marginBottom: 2,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rowLabel: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '500',
    },
    rowValue: {
      color: theme.textDim,
      fontSize: 15,
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
  const [language, setLanguage] = useState(i18n.language);
  const [autoDarkHour, setAutoDarkHour] = useState<number | null>(null);
  const powerCostDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [csvInput, setCsvInput] = useState('');
  const [showCsvImport, setShowCsvImport] = useState(false);
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
          : 'No active entitlements',
      );
    } catch (e) {
      setCustomerInfo('Error loading: ' + String(e));
    }
  }, []);

  useEffect(() => {
    getSetting('power_cost').then((v) => setPowerCost(v || ''));
    getSetting('auto_scan').then((v) => setAutoScan(v === 'true'));
    getSetting('language').then((saved) => {
      if (saved) i18n.changeLanguage(saved);
    });
    getSetting('auto_dark_hour').then((v) => setAutoDarkHour(v ? parseInt(v) : null));
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
          padding: 16,
        },
        title: {
          color: theme.text,
          fontSize: 24,
          fontWeight: '800',
          marginBottom: 20,
          marginTop: 8,
          letterSpacing: -0.5,
        },
        section: {
          marginBottom: 24,
        },
        sectionTitle: {
          color: theme.textDim,
          fontSize: 11,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 8,
          marginLeft: 4,
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.surface,
          padding: 14,
          borderRadius: 12,
          marginBottom: 2,
          borderWidth: 1,
          borderColor: theme.border,
        },
        rowLabel: {
          color: theme.text,
          fontSize: 15,
          fontWeight: '500',
        },
        rowValue: {
          color: theme.textDim,
          fontSize: 15,
        },
        rowRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        badge: {
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 8,
        },
        badgeText: {
          fontSize: 12,
          fontWeight: '700',
        },
        chevron: {
          color: theme.textMuted,
          fontSize: 20,
          fontWeight: '300',
        },
        actionText: {
          color: theme.primary,
          fontSize: 15,
          fontWeight: '600',
        },
        authBox: {
          backgroundColor: theme.surfaceLight,
          borderRadius: 12,
          padding: 14,
          marginTop: 2,
          gap: 10,
          borderWidth: 1,
          borderColor: theme.border,
        },
        authInput: {
          backgroundColor: theme.surface,
          borderRadius: 10,
          padding: 12,
          color: theme.text,
          fontSize: 15,
          borderWidth: 1,
          borderColor: theme.border,
        },
        authError: {
          color: theme.danger,
          fontSize: 13,
        },
        authBtn: {
          backgroundColor: theme.primary,
          borderRadius: 10,
          padding: 12,
          alignItems: 'center',
        },
        authBtnText: {
          color: '#FFF',
          fontWeight: '700',
          fontSize: 15,
        },
        authToggle: {
          color: theme.primary,
          fontSize: 13,
          textAlign: 'center',
          fontWeight: '500',
        },
        logoutBtn: {
          backgroundColor: theme.danger + '1A',
          borderRadius: 10,
          padding: 12,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.danger + '4D',
        },
        logoutBtnText: {
          color: theme.danger,
          fontWeight: '700',
        },
        themeBtn: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          borderWidth: 1,
        },
        themeBtnText: {
          fontSize: 12,
          fontWeight: '600',
        },
        sectionSub: {
          color: theme.textDim,
          fontSize: 12,
          lineHeight: 18,
        },
        input: {
          backgroundColor: theme.surfaceLight,
          borderRadius: 10,
          padding: 12,
          color: theme.text,
          fontSize: 14,
          fontFamily: 'monospace',
          borderWidth: 1,
          borderColor: theme.border,
        },
        proxyBtn: {
          borderRadius: 10,
          padding: 10,
          alignItems: 'center',
          marginTop: 8,
        },
        proxyBtnText: {
          color: '#FFF',
          fontWeight: '700',
          fontSize: 13,
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
            onPress={saveProxyUrl}
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
          onPress={() => navigation.navigate('Wallets')}
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
          onPress={() => navigation.navigate('Subscription')}
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
          onPress={() => {
            setShowDebugPanel(!showDebugPanel);
            if (!showDebugPanel) loadDebugInfo();
          }}
          style={{ marginTop: 8 }}
        >
          <Text style={{ color: theme.textMuted, fontSize: 11, textAlign: 'center' }}>
            {showDebugPanel ? `▲ ${t('settings.hideDebug')}` : `▼ ${t('settings.debugMenu')}`}
          </Text>
        </Pressable>
        {showDebugPanel && (
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              padding: 12,
              marginTop: 8,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View style={{ gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
                style={{
                  backgroundColor: theme.primary + '20',
                  borderRadius: 8,
                  padding: 10,
                  alignItems: 'center',
                }}
                onPress={() => {
                  useSubscriptionStore.getState().restore();
                  Alert.alert('Restore', 'Restore purchases triggered');
                }}
              >
                <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>
                  {t('settings.restorePurchases')}
                </Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
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
                    useSubscriptionStore.getState().setPro();
                    Alert.alert('Debug', 'Pro status set');
                  }}
                >
                  <Text style={{ color: theme.success, fontWeight: '600', fontSize: 13 }}>
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
                    useSubscriptionStore.getState().setFree();
                    Alert.alert('Debug', 'Free status set');
                  }}
                >
                  <Text style={{ color: theme.danger, fontWeight: '600', fontSize: 13 }}>
                    {t('settings.forceFree')}
                  </Text>
                </Pressable>
              </View>
              {customerInfo && (
                <View style={{ backgroundColor: '#000' + '40', borderRadius: 8, padding: 8 }}>
                  <Text style={{ color: theme.textDim, fontSize: 10, fontFamily: 'monospace' }}>
                    {customerInfo}
                  </Text>
                </View>
              )}
              {entitlements && (
                <View style={{ backgroundColor: '#000' + '40', borderRadius: 8, padding: 8 }}>
                  <Text style={{ color: theme.textDim, fontSize: 10, fontFamily: 'monospace' }}>
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
          onPress={() => setShowAuth(!showAuth)}
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
                  onPress={logout}
                >
                  <Text style={styles.logoutBtnText}>{t('settings.disconnect')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sync Now"
                  style={[styles.authBtn, { marginTop: 8 }]}
                  onPress={syncNow}
                  disabled={syncing}
                >
                  <Text style={styles.authBtnText}>
                    {syncing ? t('settings.syncing') : t('settings.syncNow')}
                  </Text>
                </Pressable>
                {lastSyncTimestamp && (
                  <Text style={[styles.sectionSub, { textAlign: 'center', marginTop: 6 }]}>
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
                  onPress={handleAuth}
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
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['system', 'dark', 'light', 'neon', 'matrix', '5tratum'] as const).map((mode) => (
              <Pressable
                accessibilityRole="button"
                key={mode}
                accessibilityLabel={`${mode} theme`}
                style={[
                  styles.themeBtn,
                  {
                    backgroundColor: getThemeMode() === mode ? theme.primary : theme.surfaceLight,
                    borderColor: getThemeMode() === mode ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  setThemeMode(mode);
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
              >
                <Text
                  style={[
                    styles.themeBtnText,
                    { color: getThemeMode() === mode ? '#FFF' : theme.text },
                  ]}
                >
                  {mode === 'dark'
                    ? '🌙'
                    : mode === 'light'
                      ? '☀'
                      : mode === 'neon'
                        ? '💜'
                        : mode === 'matrix'
                          ? '💚'
                          : mode === '5tratum'
                            ? '🔶'
                            : '🔄'}{' '}
                  {t(`themes.${mode}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ ...styles.row, marginTop: 8 }}>
          <Text style={styles.rowLabel}>{t('settings.language')}</Text>
        </View>
        <View style={{ paddingHorizontal: 4, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['en', 'es', 'zh', 'ja', 'de', 'fr'].map((lang) => (
              <Pressable
                key={lang}
                accessibilityRole="button"
                accessibilityLabel={`Switch language to ${lang}`}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: language === lang ? theme.primary : theme.surfaceLight,
                  borderWidth: 1,
                  borderColor: language === lang ? theme.primary : theme.border,
                }}
                onPress={() => {
                  i18n.changeLanguage(lang);
                  setLanguage(lang);
                  setSetting('language', lang);
                }}
              >
                <Text
                  style={{
                    color: language === lang ? '#FFF' : theme.text,
                    fontSize: 13,
                    fontWeight: '600',
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
        <View style={{ ...styles.row, marginTop: 12 }}>
          <Text style={styles.rowLabel}>{t('settings.darkModeSchedule')}</Text>
        </View>
        <View style={{ paddingHorizontal: 4, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Disable dark mode schedule"
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: autoDarkHour === null ? theme.primary : theme.surfaceLight,
                borderWidth: 1,
                borderColor: autoDarkHour === null ? theme.primary : theme.border,
              }}
              onPress={() => {
                setAutoDarkHour(null);
                clearThemeSchedule();
                setSetting('auto_dark_hour', '');
              }}
            >
              <Text
                style={{
                  color: autoDarkHour === null ? '#FFF' : theme.text,
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {t('settings.off')}
              </Text>
            </Pressable>
            {[18, 19, 20, 21, 22, 23].map((hour) => (
              <Pressable
                key={hour}
                accessibilityRole="button"
                accessibilityLabel={`Schedule dark mode at ${hour}:00`}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: autoDarkHour === hour ? theme.primary : theme.surfaceLight,
                  borderWidth: 1,
                  borderColor: autoDarkHour === hour ? theme.primary : theme.border,
                }}
                onPress={() => {
                  setAutoDarkHour(hour);
                  scheduleThemeSwitch(hour, 'dark');
                  scheduleThemeSwitch((hour + (hour >= 23 ? -17 : 1)) % 24, 'light');
                  setSetting('auto_dark_hour', String(hour));
                }}
              >
                <Text
                  style={{
                    color: autoDarkHour === hour ? '#FFF' : theme.text,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  {hour}:00
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.power')}</Text>
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
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
            {t('settings.notifications')}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>{t('settings.pushAlerts')}</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={(val) => {
              setNotificationsEnabled(val);
              setSetting('notifications_enabled', String(val));
            }}
            trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
            thumbColor={notificationsEnabled ? theme.primary : theme.textMuted}
            accessibilityLabel="Toggle push notifications"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          style={[styles.row, { marginTop: 8 }]}
          onPress={() => navigation.navigate('AlertHistory')}
        >
          <Text style={styles.rowLabel}>{t('settings.alertHistory')}</Text>
          <View style={styles.rowRight}>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Pressable>
      </View>

      <NotificationHistorySection />

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
        <Pressable accessibilityRole="button" style={styles.row} onPress={() => loadMiners()}>
          <Text style={styles.rowLabel}>{t('settings.refreshAll')}</Text>
          <Text style={styles.actionText}>{t('settings.refresh')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.row}
          onPress={scanNetwork}
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
          onPress={() => navigation.navigate('Groups')}
        >
          <Text style={styles.rowLabel}>{t('settings.groups')}</Text>
          <View style={styles.rowRight}>
            <Text style={styles.actionText}>{t('settings.manage')}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export CSV"
          style={styles.row}
          onPress={() => {
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
          accessibilityLabel="Export JSON backup"
          style={styles.row}
          onPress={() => {
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
          onPress={() => navigation.navigate('ImportData')}
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
          onPress={() => setShowCsvImport(!showCsvImport)}
        >
          <Text style={styles.rowLabel}>{t('settings.importCsv')}</Text>
          <Text style={styles.actionText}>
            {showCsvImport ? t('settings.cancel') : t('settings.import')}
          </Text>
        </Pressable>
        {showCsvImport && (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Text style={{ color: theme.textDim, fontSize: 12 }}>{t('settings.csvHelp')}</Text>
            <TextInput
              style={{
                backgroundColor: theme.surface,
                borderRadius: 10,
                padding: 12,
                color: theme.text,
                fontFamily: 'monospace',
                fontSize: 12,
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
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Import CSV data"
                style={{
                  flex: 1,
                  backgroundColor: theme.primary,
                  borderRadius: 10,
                  padding: 12,
                  alignItems: 'center',
                }}
                onPress={async () => {
                  const result = await importFromCSV(csvInput);
                  Alert.alert(
                    t('settings.importComplete'),
                    `${t('settings.import')}: ${result.imported} miner${result.imported !== 1 ? 's' : ''}${result.errors.length > 0 ? `\nErrors: ${result.errors.length}` : ''}`,
                    [{ text: 'OK' }],
                  );
                  if (result.errors.length > 0) {
                    console.warn('CSV import errors:', result.errors);
                  }
                  setShowCsvImport(false);
                  setCsvInput('');
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                  {t('settings.import')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel CSV import"
                style={{
                  backgroundColor: theme.surfaceLight,
                  borderRadius: 10,
                  padding: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => {
                  setShowCsvImport(false);
                  setCsvInput('');
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>
                  {t('settings.cancel')}
                </Text>
              </Pressable>
            </View>
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
            exportBackup().catch((e) => {
              Alert.alert(
                t('settings.exportFailed'),
                e instanceof Error ? e.message : 'Unknown error',
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
                        (r.errors || []).join('\n') || 'Unknown error',
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
                      (result.errors || []).join('\n') || 'Unknown error',
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
              Update v{electronUpdate.version} Available
            </Text>
            <Text style={[styles.actionText, { color: theme.primary }]}>Download</Text>
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
