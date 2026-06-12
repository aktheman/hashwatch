import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useMinerStore } from '../store/miners';
import { useSubscriptionStore } from '../store/subscription';
import { useAuthStore } from '../store/auth';
import { darkTheme, lightTheme, useTheme, setTheme } from '../theme';
import { setSetting } from '../db/database';

export function SettingsScreen({ navigation }: any) {
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
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

  useEffect(() => {
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
        toggle: {
          width: 44,
          height: 24,
          borderRadius: 12,
          backgroundColor: theme.textMuted,
          justifyContent: 'center',
          paddingHorizontal: 2,
        },
        toggleActive: {
          backgroundColor: theme.primary,
        },
        toggleKnob: {
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#FFF',
        },
        toggleKnobActive: {
          alignSelf: 'flex-end',
        },
      }),
    [theme],
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Subscription')}>
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

        <TouchableOpacity style={styles.row} onPress={() => setShowAuth(!showAuth)}>
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
              <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
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
                />
                <TextInput
                  style={styles.authInput}
                  placeholder="Password (min 8 chars)"
                  placeholderTextColor={theme.textMuted}
                  value={authPassword}
                  onChangeText={setAuthPassword}
                  secureTextEntry
                />
                {authError && <Text style={styles.authError}>{authError}</Text>}
                <TouchableOpacity style={styles.authBtn} onPress={handleAuth}>
                  <Text style={styles.authBtnText}>
                    {isRegister ? 'Create Account' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
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
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            const next = theme.bg === darkTheme.bg ? 'light' : 'dark';
            setTheme(next === 'dark' ? darkTheme : lightTheme);
            setSetting('theme_mode', next);
          }}
        >
          <Text style={styles.rowLabel}>Dark Mode</Text>
          <View style={[styles.toggle, theme.bg === darkTheme.bg && styles.toggleActive]}>
            <View
              style={[styles.toggleKnob, theme.bg === darkTheme.bg && styles.toggleKnobActive]}
            />
          </View>
        </TouchableOpacity>
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
        <TouchableOpacity style={styles.row} onPress={() => loadMiners()}>
          <Text style={styles.rowLabel}>Refresh All</Text>
          <Text style={styles.actionText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={scanNetwork} disabled={scanning}>
          <Text style={styles.rowLabel}>Scan Network</Text>
          <Text style={styles.actionText}>{scanning ? 'Scanning...' : 'Scan'}</Text>
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
