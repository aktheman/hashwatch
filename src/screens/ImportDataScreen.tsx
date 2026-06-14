import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../theme';
import { importFromJSON } from '../utils/export';

interface ImportResult {
  miners: number;
  snapshots: number;
  wallets: number;
}

export function ImportDataScreen() {
  const theme = useTheme();
  const [jsonText, setJsonText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    if (!jsonText.trim()) {
      Alert.alert('No Data', 'Paste exported JSON data first');
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const res = await importFromJSON(jsonText);
      setResult(res);
      Alert.alert(
        'Import Complete',
        `Imported: ${res.miners} miners, ${res.snapshots} snapshots, ${res.wallets} wallets`,
      );
    } catch (e: unknown) {
      Alert.alert('Import Failed', e instanceof Error ? e.message : 'Invalid data');
    } finally {
      setImporting(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg, padding: 16 },
    title: {
      color: theme.text,
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 8,
      marginTop: 8,
      letterSpacing: -0.5,
    },
    subtitle: {
      color: theme.textDim,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 16,
    },
    input: {
      backgroundColor: theme.surfaceLight,
      borderRadius: 12,
      padding: 14,
      color: theme.text,
      fontSize: 13,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      borderWidth: 1,
      borderColor: theme.border,
      minHeight: 200,
      textAlignVertical: 'top',
    },
    importBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      marginTop: 16,
    },
    importBtnDisabled: {
      opacity: 0.5,
    },
    importBtnText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 16,
    },
    resultBox: {
      backgroundColor: theme.success + '15',
      borderRadius: 12,
      padding: 14,
      marginTop: 16,
      borderWidth: 1,
      borderColor: theme.success + '40',
    },
    resultTitle: {
      color: theme.success,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 4,
    },
    resultText: {
      color: theme.text,
      fontSize: 13,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Import Data</Text>
      <Text style={styles.subtitle}>
        Export JSON from another device or backup and paste it below to restore your miners,
        wallets, settings, and historical data.{'\n\n'}
        Existing data with the same IDs will be overwritten.
      </Text>

      <TextInput
        style={styles.input}
        value={jsonText}
        onChangeText={setJsonText}
        placeholder={'Paste JSON backup here...'}
        placeholderTextColor={theme.textMuted}
        multiline
        accessibilityLabel="Paste JSON backup data"
      />

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Import data"
        style={[styles.importBtn, importing && styles.importBtnDisabled]}
        onPress={handleImport}
        disabled={importing}
      >
        <Text style={styles.importBtnText}>{importing ? 'Importing...' : 'Import Data'}</Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>✓ Import Successful</Text>
          <Text style={styles.resultText}>
            {result.miners} miner{result.miners !== 1 ? 's' : ''} imported
          </Text>
          <Text style={styles.resultText}>
            {result.snapshots} snapshot{result.snapshots !== 1 ? 's' : ''} imported
          </Text>
          <Text style={styles.resultText}>
            {result.wallets} wallet{result.wallets !== 1 ? 's' : ''} imported
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
