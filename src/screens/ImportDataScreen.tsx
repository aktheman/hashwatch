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
import { useTranslation } from 'react-i18next';

interface ImportResult {
  miners: number;
  snapshots: number;
  wallets: number;
}

export function ImportDataScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [jsonText, setJsonText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    if (!jsonText.trim()) {
      Alert.alert(t('import.noData'), t('import.noDataBody'));
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const res = await importFromJSON(jsonText);
      setResult(res);
      Alert.alert(
        t('import.complete'),
        t('import.completeBody', {
          miners: res.miners,
          snapshots: res.snapshots,
          wallets: res.wallets,
        }),
      );
    } catch (e: unknown) {
      Alert.alert(t('import.failed'), e instanceof Error ? e.message : 'Invalid data');
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
      <Text style={styles.title}>{t('import.title')}</Text>
      <Text style={styles.subtitle}>{t('import.description')}</Text>

      <TextInput
        style={styles.input}
        value={jsonText}
        onChangeText={setJsonText}
        placeholder={t('import.placeholder')}
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
        <Text style={styles.importBtnText}>
          {importing ? t('import.importing') : t('import.title')}
        </Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>{t('import.success')}</Text>
          <Text style={styles.resultText}>
            {t('import.minersImported', { count: result.miners })}
          </Text>
          <Text style={styles.resultText}>
            {t('import.snapshotsImported', { count: result.snapshots })}
          </Text>
          <Text style={styles.resultText}>
            {t('import.walletsImported', { count: result.wallets })}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
