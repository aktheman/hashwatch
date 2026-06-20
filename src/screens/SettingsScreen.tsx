import { useState, useEffect, useMemo, useRef } from 'react';
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
import { useAuthStore } from '../store/auth';
import { useTheme, setThemeMode, getThemeMode } from '../theme';
import { getSetting, setSetting } from '../db/database';
import { exportAllData, exportJSON } from '../utils/export';
import { setProxyUrl, getProxyUrl } from '../constants';
import { putSetting as putRemoteSetting } from '../api/client';
import { NavigationProp } from '../types';
import { useTranslation } from 'react-i18next';

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

  const [showAuth, setShowAuth] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState('');
  const [powerCost, setPowerCost] = useState('');
  const [autoScan, setAutoScan] = useState(false);
  const powerCostDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getSetting('power_cost').then((v) => setPowerCost(v || ''));
    getSetting('auto_scan').then((v) => setAutoScan(v === 'true'));
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
                  if (token) putRemoteSetting('theme_mode', val).catch(() => {});
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
                if (token) putRemoteSetting('power_cost', t).catch(() => {});
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
              if (token) putRemoteSetting('auto_scan', val).catch(() => {});
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
