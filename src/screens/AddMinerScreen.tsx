import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useMinerStore } from '../store/miners';
import { useSubscriptionStore } from '../store/subscription';
import { scanNetwork, DiscoveredMiner } from '../discovery/localNetwork';

interface AddMinerScreenProps {
  navigation: any;
}

export function AddMinerScreen({ navigation }: AddMinerScreenProps) {
  const [ip, setIp] = useState('');
  const [name, setName] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [foundMiners, setFoundMiners] = useState<DiscoveredMiner[]>([]);
  const [error, setError] = useState('');

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
    } catch (e: any) {
      setError(e.message || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setError('');
    try {
      const found = await scanNetwork();
      setFoundMiners(found);
    } catch (e: any) {
      setError(e.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
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
    } catch (e: any) {
      setError(e.message || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Add by IP Address</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="192.168.1.100"
          placeholderTextColor="#6B7280"
          value={ip}
          onChangeText={setIp}
          keyboardType="numeric"
          autoCapitalize="none"
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Name (optional)"
        placeholderTextColor="#6B7280"
        value={name}
        onChangeText={setName}
      />
      <TouchableOpacity
        style={[styles.addBtn, connecting && styles.btnDisabled]}
        onPress={handleAddByIP}
        disabled={connecting || !ip.trim()}
      >
        {connecting ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.addBtnText}>Add Miner</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <Text style={styles.sectionTitle}>Scan Local Network</Text>
      <TouchableOpacity
        style={[styles.scanBtn, scanning && styles.btnDisabled]}
        onPress={handleScan}
        disabled={scanning}
      >
        {scanning ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.scanBtnText}>Scan Network</Text>
        )}
      </TouchableOpacity>

      {foundMiners.length > 0 && (
        <View style={styles.foundSection}>
          <Text style={styles.foundTitle}>
            Found {foundMiners.length} miner{foundMiners.length > 1 ? 's' : ''}
          </Text>
          {foundMiners.map((m) => (
            <TouchableOpacity
              key={m.ip}
              style={styles.foundItem}
              onPress={() => handleAddDiscovered(m)}
            >
              <Text style={styles.foundIP}>{m.ip}</Text>
              <Text style={styles.foundAdd}>Add +</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  sectionTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 14,
    color: '#F9FAFB',
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  addBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#374151',
  },
  dividerText: {
    color: '#6B7280',
    marginHorizontal: 12,
    fontSize: 13,
  },
  scanBtn: {
    backgroundColor: '#374151',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  scanBtnText: {
    color: '#F9FAFB',
    fontWeight: '600',
    fontSize: 16,
  },
  foundSection: {
    marginTop: 20,
  },
  foundTitle: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  foundItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 14,
    borderRadius: 10,
    marginBottom: 6,
  },
  foundIP: {
    color: '#F9FAFB',
    fontFamily: 'monospace',
    fontSize: 15,
  },
  foundAdd: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#7F1D1D',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
  },
});
