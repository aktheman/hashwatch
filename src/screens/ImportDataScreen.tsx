import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight, buttonText } from '../utils/design';
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
      Alert.alert(t('import.failed'), e instanceof Error ? e.message : t('import.invalidData'));
    } finally {
      setImporting(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg, padding: spacing.md },
    title: {
      color: theme.text,
      fontSize: fontSize.h2,
      fontWeight: fontWeight.extrabold,
      marginBottom: spacing.xs,
      marginTop: spacing.xs,
      letterSpacing: -0.5,
    },
    subtitle: {
      color: theme.textDim,
      fontSize: fontSize.base,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    input: {
      backgroundColor: theme.surfaceLight,
      borderRadius: radius.md,
      padding: spacing.sm,
      color: theme.text,
      fontSize: fontSize.base,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      borderWidth: 1,
      borderColor: theme.border,
      minHeight: 200,
      textAlignVertical: 'top',
    },
    importBtn: {
      backgroundColor: theme.primary,
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    importBtnDisabled: {
      opacity: 0.5,
    },
    importBtnText: {
      color: buttonText,
      fontWeight: fontWeight.bold,
      fontSize: fontSize.lg,
    },
    resultBox: {
      backgroundColor: theme.success + '15',
      borderRadius: radius.md,
      padding: spacing.sm,
      marginTop: spacing.md,
      borderWidth: 1,
      borderColor: theme.success + '40',
    },
    resultTitle: {
      color: theme.success,
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.xxs,
    },
    resultText: {
      color: theme.text,
      fontSize: fontSize.base,
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Import data"
        style={[styles.importBtn, importing && styles.importBtnDisabled]}
        onPress={handleImport}
        disabled={importing}
      >
        <Text style={styles.importBtnText}>
          {importing ? t('import.importing') : t('import.title')}
        </Text>
      </Pressable>

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
