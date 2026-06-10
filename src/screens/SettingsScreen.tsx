import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useMinerStore } from '../store/miners';
import { useSubscriptionStore } from '../store/subscription';
import { useAuthStore } from '../store/auth';

export function SettingsScreen({ navigation }: any) {
  const miners = useMinerStore((s) => s.miners);
  const loadMiners = useMinerStore((s) => s.loadMiners);
  const scanNetwork = useMinerStore((s) => s.scanNetwork);
  const scanning = useMinerStore((s) => s.scanning);
  const { isPro, tier } = useSubscriptionStore();
  const { token, email, syncing, synced, login, register, logout, restoreSession } = useAuthStore();

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

  const handleLogout = () => {
    logout();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.rowLabel}>Plan</Text>
          <View style={styles.rowRight}>
            <View
              style={[
                styles.badge,
                { backgroundColor: isPro ? '#065F46' : '#374151' },
              ]}
            >
              <Text style={styles.badgeText}>
                {isPro ? 'Pro' : 'Free'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => setShowAuth(!showAuth)}
        >
          <Text style={styles.rowLabel}>Remote Sync</Text>
          <View style={styles.rowRight}>
            <Text style={[styles.rowValue, token ? { color: '#22C55E' } : undefined]}>
              {token ? email || 'Connected' : 'Off'}
            </Text>
            <Text style={styles.chevron}>{showAuth ? 'v' : '›'}</Text>
          </View>
        </TouchableOpacity>

        {showAuth && (
          <View style={styles.authBox}>
            {token ? (
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={styles.authInput}
                  placeholder="Email"
                  placeholderTextColor="#6B7280"
                  value={authEmail}
                  onChangeText={setAuthEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.authInput}
                  placeholder="Password (min 8 chars)"
                  placeholderTextColor="#6B7280"
                  value={authPassword}
                  onChangeText={setAuthPassword}
                  secureTextEntry
                />
                {authError && (
                  <Text style={styles.authError}>{authError}</Text>
                )}
                <TouchableOpacity style={styles.authBtn} onPress={handleAuth}>
                  <Text style={styles.authBtnText}>
                    {isRegister ? 'Create Account' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
                  <Text style={styles.authToggle}>
                    {isRegister
                      ? 'Already have an account? Sign In'
                      : 'No account? Create one'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Miners</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Total Miners</Text>
          <Text style={styles.rowValue}>{miners.length}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Online</Text>
          <Text style={[styles.rowValue, { color: '#22C55E' }]}>
            {miners.filter((m) => m.isOnline).length}
          </Text>
        </View>
        <TouchableOpacity style={styles.row} onPress={() => loadMiners()}>
          <Text style={styles.rowLabel}>Refresh All</Text>
          <Text style={styles.actionText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          onPress={scanNetwork}
          disabled={scanning}
        >
          <Text style={styles.rowLabel}>Scan Network</Text>
          <Text style={styles.actionText}>
            {scanning ? 'Scanning...' : 'Scan'}
          </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 10,
    marginBottom: 2,
  },
  rowLabel: {
    color: '#F9FAFB',
    fontSize: 15,
  },
  rowValue: {
    color: '#6B7280',
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
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: {
    color: '#6B7280',
    fontSize: 20,
  },
  actionText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '500',
  },
  authBox: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 14,
    marginTop: 2,
    gap: 10,
  },
  authInput: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    color: '#F9FAFB',
    fontSize: 15,
  },
  authError: {
    color: '#FCA5A5',
    fontSize: 13,
  },
  authBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  authBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  authToggle: {
    color: '#3B82F6',
    fontSize: 13,
    textAlign: 'center',
  },
  logoutBtn: {
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#FCA5A5',
    fontWeight: '600',
  },
});
