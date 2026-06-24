import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
  StyleSheet,
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
import { setProxyUrl, getProxyUrl } from '../constants';
import { putSetting as putRemoteSetting } from '../api/client';
import { NavigationProp } from '../types';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../services/networkStatus';
import i18n from '../i18n';

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
    <ScrollView style={styles.container}>
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
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('settings.saveProxyUrl')}
            style={[styles.proxyBtn, { backgroundColor: theme.primary }]}
            onPress={saveProxyUrl}
          >
            <Text style={styles.proxyBtnText}>{t('settings.saveProxyUrl')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Wallets"
          style={styles.row}
          onPress={() => navigation.navigate('Wallets')}
        >
          <Text style={styles.rowLabel}>{t('settings.wallets')}</Text>
          <View style={styles.rowRight}>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
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
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setShowDebugPanel(!showDebugPanel);
            if (!showDebugPanel) loadDebugInfo();
          }}
          style={{ marginTop: 8 }}
        >
          <Text style={{ color: theme.textMuted, fontSize: 11, textAlign: 'center' }}>
            {showDebugPanel ? '▲ Hide Debug' : '▼ RevenueCat Debug'}
          </Text>
        </TouchableOpacity>
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
              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary + '20',
                  borderRadius: 8,
                  padding: 10,
                  alignItems: 'center',
                }}
                onPress={() => {
                  const { useSubscriptionStore } = require('../store/subscription');
                  useSubscriptionStore.getState().restore();
                  Alert.alert('Restore', 'Restore purchases triggered');
                }}
              >
                <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>
                  Restore Purchases
                </Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.success + '20',
                    borderRadius: 8,
                    padding: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    const { useSubscriptionStore } = require('../store/subscription');
                    useSubscriptionStore.getState().setPro();
                    Alert.alert('Debug', 'Pro status set');
                  }}
                >
                  <Text style={{ color: theme.success, fontWeight: '600', fontSize: 13 }}>
                    Force Pro
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.danger + '20',
                    borderRadius: 8,
                    padding: 10,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    const { useSubscriptionStore } = require('../store/subscription');
                    useSubscriptionStore.getState().setFree();
                    Alert.alert('Debug', 'Free status set');
                  }}
                >
                  <Text style={{ color: theme.danger, fontWeight: '600', fontSize: 13 }}>
                    Force Free
                  </Text>
                </TouchableOpacity>
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

        <TouchableOpacity
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
        </TouchableOpacity>

        {showAuth && (
          <View style={styles.authBox}>
            {token ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Disconnect"
                  style={styles.logoutBtn}
                  onPress={logout}
                >
                  <Text style={styles.logoutBtnText}>{t('settings.disconnect')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Sync Now"
                  style={[styles.authBtn, { marginTop: 8 }]}
                  onPress={syncNow}
                  disabled={syncing}
                >
                  <Text style={styles.authBtnText}>
                    {syncing ? t('settings.syncing') : t('settings.syncNow')}
                  </Text>
                </TouchableOpacity>
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
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={isRegister ? 'Create Account' : 'Sign In'}
                  style={styles.authBtn}
                  onPress={handleAuth}
                >
                  <Text style={styles.authBtnText}>
                    {isRegister ? t('settings.createAccount') : t('settings.signIn')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={isRegister ? 'Switch to sign in' : 'Switch to create account'}
                  onPress={() => setIsRegister(!isRegister)}
                >
                  <Text style={styles.authToggle}>
                    {isRegister ? t('settings.switchToSignIn') : t('settings.switchToCreate')}
                  </Text>
                </TouchableOpacity>
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
              <TouchableOpacity
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
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ ...styles.row, marginTop: 8 }}>
          <Text style={styles.rowLabel}>Language / 语言 / Sprache</Text>
        </View>
        <View style={{ paddingHorizontal: 4, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['en', 'es', 'zh', 'ja', 'de', 'fr'].map((lang) => (
              <TouchableOpacity
                key={lang}
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
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ ...styles.row, marginTop: 12 }}>
          <Text style={styles.rowLabel}>Dark Mode Schedule</Text>
        </View>
        <View style={{ paddingHorizontal: 4, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity
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
                Off
              </Text>
            </TouchableOpacity>
            {[18, 19, 20, 21, 22, 23].map((hour) => (
              <TouchableOpacity
                key={hour}
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
              </TouchableOpacity>
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
            🔔 Notifications
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
          <Text style={{ color: theme.text, fontSize: 14 }}>Push Alerts</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={(val) => {
              setNotificationsEnabled(val);
              setSetting('notifications_enabled', String(val));
            }}
            trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
            thumbColor={notificationsEnabled ? theme.primary : theme.textMuted}
          />
        </View>
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
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.row}
          onPress={() => loadMiners()}
        >
          <Text style={styles.rowLabel}>{t('settings.refreshAll')}</Text>
          <Text style={styles.actionText}>{t('settings.refresh')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.row}
          onPress={scanNetwork}
          disabled={scanning}
        >
          <Text style={styles.rowLabel}>{t('settings.scanNetwork')}</Text>
          <Text style={styles.actionText}>
            {scanning ? t('settings.scanning') : t('settings.scan')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
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
        </TouchableOpacity>
        <TouchableOpacity
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
        </TouchableOpacity>
        <TouchableOpacity
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
        </TouchableOpacity>
        <TouchableOpacity
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
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Import CSV"
          style={styles.row}
          onPress={() => setShowCsvImport(!showCsvImport)}
        >
          <Text style={styles.rowLabel}>Import CSV</Text>
          <Text style={styles.actionText}>{showCsvImport ? 'Cancel' : 'Import'}</Text>
        </TouchableOpacity>
        {showCsvImport && (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Text style={{ color: theme.textDim, fontSize: 12 }}>
              Paste CSV (columns: name, ip, port):
            </Text>
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
              placeholder="name,ip,port&#10;Miner1,192.168.1.10,80"
              placeholderTextColor={theme.textMuted}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
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
                    'Import Complete',
                    `Imported: ${result.imported} miner${result.imported !== 1 ? 's' : ''}${result.errors.length > 0 ? `\nErrors: ${result.errors.length}` : ''}`,
                    [{ text: 'OK' }],
                  );
                  if (result.errors.length > 0) {
                    console.warn('CSV import errors:', result.errors);
                  }
                  setShowCsvImport(false);
                  setCsvInput('');
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Import</Text>
              </TouchableOpacity>
              <TouchableOpacity
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
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('settings.version')}</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('settings.madeFor')}</Text>
          <Text style={styles.rowValue}>{t('settings.bitaxeMiners')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
