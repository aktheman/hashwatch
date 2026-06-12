import { useState, useEffect, useMemo } from 'react';
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
import { exportAllData } from '../utils/export';
import { setProxyUrl, getProxyUrl } from '../constants';
import { NavigationProp } from '../types';

export function SettingsScreen({ navigation }: { navigation: NavigationProp }) {
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const [proxyUrl, setProxyUrlState] = useState(getProxyUrl());

  const saveProxyUrl = async () => {
    await setProxyUrl(proxyUrl);
    Alert.alert('Proxy URL Updated', `Proxy URL set to ${proxyUrl}`);
  };
  const loadMiners = useMinerStore((s) => s.loadMiners);
  const scanNetwork = useMinerStore((s) => s.scanNetwork);
  const scanning = useMinerStore((s) => s.scanning);
  const { isPro } = useSubscriptionStore();
  const { token, email, login, register, logout, restoreSession } = useAuthStore();

  const [showAuth, setShowAuth] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState('');
  const [powerCost, setPowerCost] = useState('');
  const [autoScan, setAutoScan] = useState(false);

  useEffect(() => {
    getSetting('power_cost').then((v) => setPowerCost(v || ''));
    getSetting('auto_scan').then((v) => setAutoScan(v === 'true'));
    restoreSession();
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
      setAuthError(isRegister ? 'Registration failed' : 'Login failed');
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
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderRadius: 10,
          padding: 12,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(239, 68, 68, 0.3)',
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
      <Text style={styles.title}>Settings</Text>

      {Platform.OS === 'web' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <Text style={[styles.sectionSub, { marginBottom: 10 }]}>
            On web, a local proxy is needed to reach miners on your network. Run{' '}
            <Text style={{ fontFamily: 'monospace', color: theme.primary }}>
              node local-proxy.js
            </Text>{' '}
            on this machine and enter the URL below.
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
            style={[styles.proxyBtn, { backgroundColor: theme.primary }]}
            onPress={saveProxyUrl}
          >
            <Text style={styles.proxyBtnText}>Save Proxy URL</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.row}
          onPress={() => navigation.navigate('Wallets')}
        >
          <Text style={styles.rowLabel}>Wallets</Text>
          <View style={styles.rowRight}>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.row}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.rowLabel}>Plan</Text>
          <View style={styles.rowRight}>
            <View
              style={[
                styles.badge,
                { backgroundColor: isPro ? 'rgba(16,185,129,0.15)' : theme.surfaceLight },
              ]}
            >
              <Text style={[styles.badgeText, { color: isPro ? theme.success : theme.textDim }]}>
                {isPro ? 'Pro' : 'Free'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.row}
          onPress={() => setShowAuth(!showAuth)}
        >
          <Text style={styles.rowLabel}>Remote Sync</Text>
          <View style={styles.rowRight}>
            <Text style={[styles.rowValue, token && { color: theme.success }]}>
              {token ? email || 'Connected' : 'Off'}
            </Text>
            <Text style={styles.chevron}>{showAuth ? 'v' : '›'}</Text>
          </View>
        </TouchableOpacity>

        {showAuth && (
          <View style={styles.authBox}>
            {token ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.logoutBtn}
                onPress={logout}
              >
                <Text style={styles.logoutBtnText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={styles.authInput}
                  placeholder="Email"
                  placeholderTextColor={theme.textMuted}
                  value={authEmail}
                  onChangeText={setAuthEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  accessibilityLabel="Email input"
                />
                <TextInput
                  style={styles.authInput}
                  placeholder="Password (min 8 chars)"
                  placeholderTextColor={theme.textMuted}
                  value={authPassword}
                  onChangeText={setAuthPassword}
                  secureTextEntry
                  accessibilityLabel="Password input"
                />
                {authError && <Text style={styles.authError}>{authError}</Text>}
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.authBtn}
                  onPress={handleAuth}
                >
                  <Text style={styles.authBtnText}>
                    {isRegister ? 'Create Account' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setIsRegister(!isRegister)}
                >
                  <Text style={styles.authToggle}>
                    {isRegister ? 'Already have an account? Sign In' : 'No account? Create one'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Theme</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['system', 'dark', 'light', 'neon', 'matrix'] as const).map((mode) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={mode}
                style={[
                  styles.themeBtn,
                  {
                    backgroundColor: getThemeMode() === mode ? theme.primary : theme.surfaceLight,
                    borderColor: getThemeMode() === mode ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  setThemeMode(mode);
                  setSetting('theme_mode', mode === 'system' ? 'system' : mode);
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
                          : '🔄'}{' '}
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Power</Text>
        <Text style={[styles.sectionSub, { marginBottom: 10 }]}>
          Enter your electricity rate to see power cost and net profit.
        </Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>$/kWh</Text>
          <TextInput
            style={[styles.input, { flex: 1, marginLeft: 12, maxWidth: 120, textAlign: 'right' }]}
            value={powerCost}
            onChangeText={(t) => {
              setPowerCost(t);
              setSetting('power_cost', t);
            }}
            placeholder="0.12"
            placeholderTextColor={theme.textMuted}
            keyboardType="decimal-pad"
            accessibilityLabel="Power cost input"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Miners</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Total Miners</Text>
          <Text style={styles.rowValue}>{miners.length}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Online</Text>
          <Text style={[styles.rowValue, { color: theme.success }]}>
            {miners.filter((m) => m.isOnline).length}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Auto-Scan Network</Text>
          <Switch
            value={autoScan}
            onValueChange={(v) => {
              setAutoScan(v);
              setSetting('auto_scan', String(v));
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
          <Text style={styles.rowLabel}>Refresh All</Text>
          <Text style={styles.actionText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.row}
          onPress={scanNetwork}
          disabled={scanning}
        >
          <Text style={styles.rowLabel}>Scan Network</Text>
          <Text style={styles.actionText}>{scanning ? 'Scanning...' : 'Scan'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.row}
          onPress={() => {
            exportAllData().catch(() => {
              Alert.alert('Export Failed', 'Could not export miner data');
            });
          }}
        >
          <Text style={styles.rowLabel}>Export Data</Text>
          <Text style={styles.actionText}>CSV</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Made for</Text>
          <Text style={styles.rowValue}>BitAxe Miners</Text>
        </View>
      </View>
    </ScrollView>
  );
}
