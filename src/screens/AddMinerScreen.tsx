import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useMinerStore } from '../store/miners';
import { useSubscriptionStore } from '../store/subscription';
import { scanNetwork, DiscoveredMiner } from '../discovery/localNetwork';
import { useTheme } from '../theme';
import { NavigationProp } from '../types';

interface AddMinerScreenProps {
  navigation: NavigationProp;
}

export function AddMinerScreen({ navigation }: AddMinerScreenProps) {
  const theme = useTheme();
  const [ip, setIp] = useState('');
  const [name, setName] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [foundMiners, setFoundMiners] = useState<DiscoveredMiner[]>([]);
  const [error, setError] = useState('');
  const [scanProgress, setScanProgress] = useState({ found: 0, scanned: 0, total: 0 });
  const scanAbortRef = useRef<AbortController | null>(null);

  const addMiner = useMinerStore((s) => s.addMiner);
  const miners = useMinerStore((s) => s.miners);
  const canAddMiner = useSubscriptionStore((s) => s.canAddMiner);

  const handleAddByIP = async () => {
    if (!ip.trim()) return;
    if (!canAddMiner(miners.length)) {
      setError('Upgrade to Pro to add more miners');
      return;
    }
    setConnecting(true);
    setError('');
    try {
      await addMiner(ip.trim(), 80, name.trim() || undefined);
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleScan = async () => {
    const controller = new AbortController();
    scanAbortRef.current = controller;
    setScanning(true);
    setError('');
    setFoundMiners([]);
    setScanProgress({ found: 0, scanned: 0, total: 0 });
    try {
      const found = await scanNetwork(
        (found, scanned, total) => setScanProgress({ found, scanned, total }),
        120000,
        controller.signal,
      );
      setFoundMiners(found);
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setScanning(false);
      scanAbortRef.current = null;
    }
  };

  const handleCancelScan = () => {
    scanAbortRef.current?.abort();
  };

  const handleAddDiscovered = async (m: DiscoveredMiner) => {
    if (!canAddMiner(miners.length)) {
      setError('Upgrade to Pro to add more miners');
      return;
    }
    setConnecting(true);
    setError('');
    try {
      await addMiner(m.ip, m.port);
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setConnecting(false);
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
        scrollContent: {
          paddingBottom: 40,
        },
        card: {
          backgroundColor: theme.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.border,
        },
        sectionTitle: {
          color: theme.text,
          fontSize: 15,
          fontWeight: '700',
          marginBottom: 12,
        },
        input: {
          backgroundColor: theme.surfaceLight,
          borderRadius: 10,
          padding: 14,
          color: theme.text,
          fontSize: 15,
          fontFamily: 'monospace',
          marginBottom: 10,
          borderWidth: 1,
          borderColor: theme.border,
        },
        primaryBtn: {
          backgroundColor: theme.primary,
          borderRadius: 12,
          padding: 14,
          alignItems: 'center',
          marginTop: 4,
        },
        primaryBtnText: {
          color: '#FFF',
          fontWeight: '700',
          fontSize: 15,
        },
        secondaryBtn: {
          backgroundColor: theme.surfaceLight,
          borderRadius: 12,
          padding: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.border,
        },
        secondaryBtnText: {
          color: theme.text,
          fontWeight: '600',
          fontSize: 15,
        },
        btnDisabled: {
          opacity: 0.5,
        },
        divider: {
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: 20,
        },
        dividerLine: {
          flex: 1,
          height: 1,
          backgroundColor: theme.border,
        },
        dividerText: {
          color: theme.textMuted,
          marginHorizontal: 12,
          fontSize: 12,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
        foundSection: {
          marginTop: 8,
        },
        foundTitle: {
          color: theme.success,
          fontSize: 13,
          fontWeight: '700',
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        foundItem: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.surface,
          padding: 14,
          borderRadius: 12,
          marginBottom: 6,
          borderWidth: 1,
          borderColor: theme.border,
        },
        foundLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        foundIcon: {
          fontSize: 14,
          color: theme.primary,
        },
        foundIP: {
          color: theme.text,
          fontFamily: 'monospace',
          fontSize: 15,
          fontWeight: '500',
        },
        foundAddBadge: {
          backgroundColor: 'rgba(108, 99, 255, 0.15)',
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 8,
        },
        foundAdd: {
          color: theme.primaryLight,
          fontWeight: '700',
          fontSize: 13,
        },
        errorBox: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderRadius: 12,
          padding: 12,
          marginTop: 16,
          borderWidth: 1,
          borderColor: 'rgba(239, 68, 68, 0.2)',
        },
        errorText: {
          color: theme.danger,
          fontSize: 13,
          fontWeight: '500',
        },
      }),
    [theme],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add by IP</Text>
        <TextInput
          style={styles.input}
          placeholder="192.168.1.100"
          placeholderTextColor={theme.textMuted}
          value={ip}
          onChangeText={setIp}
          keyboardType="numeric"
          autoCapitalize="none"
          accessibilityLabel="IP address input"
        />
        <TextInput
          style={styles.input}
          placeholder="Name (optional)"
          placeholderTextColor={theme.textMuted}
          value={name}
          onChangeText={setName}
          accessibilityLabel="Miner name input"
        />
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.primaryBtn, (connecting || !ip.trim()) && styles.btnDisabled]}
          onPress={handleAddByIP}
          disabled={connecting || !ip.trim()}
        >
          {connecting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Add Miner</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Scan Network</Text>
        {scanning && scanProgress.total > 0 && (
          <View style={{ marginBottom: 10 }}>
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.border,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${(scanProgress.scanned / scanProgress.total) * 100}%`,
                  height: '100%',
                  backgroundColor: theme.primary,
                }}
              />
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
              Scanned {scanProgress.scanned}/{scanProgress.total} · {scanProgress.found} found
            </Text>
          </View>
        )}
        {scanning ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.secondaryBtn, { borderColor: theme.danger }]}
            onPress={handleCancelScan}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.danger }]}>Cancel Scan</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.secondaryBtn}
            onPress={handleScan}
          >
            <Text style={styles.secondaryBtnText}>Find Miners</Text>
          </TouchableOpacity>
        )}
      </View>

      {foundMiners.length > 0 && (
        <View style={styles.foundSection}>
          <Text style={styles.foundTitle}>
            Found {foundMiners.length} miner{foundMiners.length > 1 ? 's' : ''}
          </Text>
          {foundMiners.map((m) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={m.ip}
              style={styles.foundItem}
              onPress={() => handleAddDiscovered(m)}
            >
              <View style={styles.foundLeft}>
                <Text style={styles.foundIcon}>⬡</Text>
                <Text style={styles.foundIP}>{m.ip}</Text>
              </View>
              <View style={styles.foundAddBadge}>
                <Text style={styles.foundAdd}>Add</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠ {error}</Text>
          {Platform.OS === 'web' && (
            <Text style={[styles.errorText, { marginTop: 8, fontSize: 12, lineHeight: 16 }]}>
              Web requires a local proxy to reach miners on your network. Go to Settings → add your
              proxy URL (e.g. http://localhost:4567) and run{' '}
              <Text style={{ fontFamily: 'monospace', color: theme.primaryLight }}>
                node local-proxy.js
              </Text>{' '}
              on this machine.
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}
