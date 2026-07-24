import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { useTranslation } from 'react-i18next';
import * as haptic from '../utils/haptics';
import { importThemeFromJSON, ThemeExport } from '../utils/themeShare';
import { useCustomThemesStore } from '../store/customThemes';

interface CommunityTheme {
  id: string;
  name: string;
  colors: Record<string, string>;
  author: string;
  downloads: number;
  rating: number;
  createdAt: string;
}

const SAMPLE_COMMUNITY_THEMES: CommunityTheme[] = [
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      bg: '#1A0A00',
      surface: '#2D1600',
      primary: '#FF6B35',
      accent: '#FFB347',
      text: '#FFE0CC',
    },
    author: 'community',
    downloads: 342,
    rating: 4.5,
    createdAt: '2025-01-15',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    colors: {
      bg: '#0D0221',
      surface: '#1A0533',
      primary: '#FF2A6D',
      accent: '#05D9E8',
      text: '#E0E0FF',
    },
    author: 'community',
    downloads: 567,
    rating: 4.8,
    createdAt: '2025-02-20',
  },
  {
    id: 'forest',
    name: 'Deep Forest',
    colors: {
      bg: '#0A1A0F',
      surface: '#152B1A',
      primary: '#4CAF50',
      accent: '#81C784',
      text: '#C8E6C9',
    },
    author: 'community',
    downloads: 201,
    rating: 4.2,
    createdAt: '2025-03-10',
  },
  {
    id: 'solar',
    name: 'Solarized',
    colors: {
      bg: '#002B36',
      surface: '#073642',
      primary: '#268BD2',
      accent: '#2AA198',
      text: '#93A1A1',
    },
    author: 'community',
    downloads: 890,
    rating: 4.9,
    createdAt: '2024-12-01',
  },
];

export function ThemeMarketplaceScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { create } = useCustomThemesStore();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<Record<string, string> | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [activeTab, setActiveTab] = useState<'browse' | 'url'>('browse');

  const handleImportFromUrl = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    haptic.medium();
    try {
      const response = await fetch(url.trim());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const imported = importThemeFromJSON(text);
      if (!imported) {
        Alert.alert(
          t('marketplace.importFailed', 'Import Failed'),
          t('marketplace.invalidTheme', 'Could not parse theme data'),
        );
        return;
      }
      setPreviewName(imported.name);
      setPreviewTheme(imported.colors as Record<string, string>);
    } catch (e) {
      Alert.alert(
        t('marketplace.importFailed', 'Import Failed'),
        e instanceof Error ? e.message : t('marketplace.networkError', 'Network error'),
      );
    } finally {
      setLoading(false);
    }
  }, [url, t]);

  const handleImportFromJSON = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    haptic.medium();
    try {
      const text = await navigator.clipboard.readText();
      const imported = importThemeFromJSON(text);
      if (imported) {
        setPreviewName(imported.name);
        setPreviewTheme(imported.colors as Record<string, string>);
      } else {
        Alert.alert(
          t('marketplace.importFailed', 'Import Failed'),
          t('marketplace.noValidTheme', 'No valid theme in clipboard'),
        );
      }
    } catch {
      Alert.alert(
        t('marketplace.importFailed', 'Import Failed'),
        t('marketplace.clipboardError', 'Could not read clipboard'),
      );
    }
  }, [t]);

  const handleShareTheme = useCallback(
    async (ct: { name: string; colors: Record<string, string> }) => {
      haptic.light();
      const exported: ThemeExport = { name: ct.name, version: 1, colors: ct.colors };
      const json = JSON.stringify(exported, null, 2);
      if (Platform.OS === 'web') {
        try {
          await navigator.clipboard.writeText(json);
          Alert.alert(
            t('marketplace.copied', 'Copied!'),
            t('marketplace.themeCopied', 'Theme JSON copied to clipboard'),
          );
        } catch {
          Alert.alert(t('marketplace.share', 'Share'), json.slice(0, 200) + '...');
        }
      } else {
        await Share.share({ message: json, title: `Theme: ${ct.name}` });
      }
    },
    [t],
  );

  const handleInstallCommunity = useCallback(
    async (ct: CommunityTheme) => {
      haptic.success();
      await create(ct.name, ct.colors);
      Alert.alert(
        t('marketplace.installed', 'Installed!'),
        `${ct.name} ${t('marketplace.addedToThemes', 'added to your themes')}`,
      );
    },
    [create, t],
  );

  const handleConfirmImport = useCallback(async () => {
    if (!previewTheme || !previewName) return;
    haptic.success();
    await create(previewName, previewTheme);
    Alert.alert(
      t('marketplace.installed', 'Installed!'),
      `${previewName} ${t('marketplace.addedToThemes', 'added to your themes')}`,
    );
    setPreviewTheme(null);
    setPreviewName('');
    setUrl('');
  }, [previewTheme, previewName, create, t]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg, padding: spacing.md },
    title: {
      color: theme.text,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.sm,
    },
    tabs: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      alignItems: 'center',
      borderWidth: 1,
    },
    tabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    tabInactive: { backgroundColor: theme.surface, borderColor: theme.border },
    tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    urlRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
    urlInput: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: radius.md,
      padding: spacing.sm,
      color: theme.text,
      fontSize: fontSize.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    importBtn: {
      backgroundColor: theme.primary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    importBtnText: { color: '#FFF', fontWeight: fontWeight.bold },
    themeCard: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    themeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    themeName: { color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.bold },
    themeAuthor: { color: theme.textMuted, fontSize: fontSize.xs },
    themeStats: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
    themeStat: { color: theme.textDim, fontSize: fontSize.xs },
    swatchRow: { flexDirection: 'row', gap: spacing.xxs, marginBottom: spacing.sm },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actions: { flexDirection: 'row', gap: spacing.xs },
    actionBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      alignItems: 'center',
      borderWidth: 1,
    },
    actionBtnPrimary: { backgroundColor: theme.primary, borderColor: theme.primary },
    actionBtnSecondary: { backgroundColor: theme.surfaceLight, borderColor: theme.border },
    actionBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    sectionTitle: {
      color: theme.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    divider: { height: 1, backgroundColor: theme.border, marginVertical: spacing.md },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      accessibilityRole="list"
      accessibilityLabel={t('marketplace.themeTitle', 'Theme Marketplace')}
    >
      <Text style={styles.title}>{t('marketplace.themeTitle', 'Theme Marketplace')}</Text>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'browse' ? styles.tabActive : styles.tabInactive]}
          onPress={() => {
            haptic.selection();
            setActiveTab('browse');
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'browse' ? '#FFF' : theme.text }]}>
            {t('marketplace.browse', 'Browse')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'url' ? styles.tabActive : styles.tabInactive]}
          onPress={() => {
            haptic.selection();
            setActiveTab('url');
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'url' ? '#FFF' : theme.text }]}>
            {t('marketplace.fromUrl', 'From URL')}
          </Text>
        </Pressable>
      </View>

      {activeTab === 'browse' ? (
        <View>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnSecondary, { marginBottom: spacing.md }]}
            onPress={handleImportFromJSON}
          >
            <Text style={[styles.actionBtnText, { color: theme.text }]}>
              {t('marketplace.importFromClipboard', 'Import from Clipboard')}
            </Text>
          </Pressable>

          {SAMPLE_COMMUNITY_THEMES.map((ct) => (
            <View key={ct.id} style={styles.themeCard}>
              <View style={styles.themeHeader}>
                <View>
                  <Text style={styles.themeName}>{ct.name}</Text>
                  <Text style={styles.themeAuthor}>by {ct.author}</Text>
                </View>
              </View>
              <View style={styles.swatchRow}>
                {['bg', 'surface', 'primary', 'accent', 'text'].map((key) => (
                  <View
                    key={key}
                    style={[styles.swatch, { backgroundColor: ct.colors[key] || '#333' }]}
                  />
                ))}
              </View>
              <View style={styles.themeStats}>
                <Text style={styles.themeStat}>↓ {ct.downloads}</Text>
                <Text style={styles.themeStat}>★ {ct.rating}</Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  onPress={() => {
                    haptic.light();
                    setPreviewName(ct.name);
                    setPreviewTheme(ct.colors);
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: theme.text }]}>
                    {t('marketplace.preview', 'Preview')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  onPress={() => handleInstallCommunity(ct)}
                >
                  <Text style={[styles.actionBtnText, { color: '#FFF' }]}>
                    {t('marketplace.install', 'Install')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  onPress={() => handleShareTheme(ct)}
                >
                  <Text style={[styles.actionBtnText, { color: theme.text }]}>
                    {t('marketplace.share', 'Share')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
            {t('marketplace.importFromUrl', 'Import from URL')}
          </Text>
          <Text style={{ color: theme.textDim, fontSize: fontSize.sm, marginBottom: spacing.sm }}>
            {t('marketplace.urlHelp', 'Paste a URL to a theme JSON file to import it')}
          </Text>
          <View style={styles.urlRow}>
            <TextInput
              style={styles.urlInput}
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com/theme.json"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Pressable style={styles.importBtn} onPress={handleImportFromUrl} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.importBtnText}>{t('marketplace.import', 'Import')}</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            {t('marketplace.importFromFile', 'Import from File')}
          </Text>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => {
              if (Platform.OS !== 'web') return;
              haptic.medium();
              const input = window.document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const imported = importThemeFromJSON(text);
                  if (imported) {
                    setPreviewName(imported.name);
                    setPreviewTheme(imported.colors as Record<string, string>);
                  } else {
                    Alert.alert(
                      t('marketplace.importFailed', 'Import Failed'),
                      t('marketplace.invalidTheme', 'Could not parse theme data'),
                    );
                  }
                } catch {
                  Alert.alert(
                    t('marketplace.importFailed', 'Import Failed'),
                    t('marketplace.fileError', 'Error reading file'),
                  );
                }
              };
              input.click();
            }}
          >
            <Text style={[styles.actionBtnText, { color: theme.text }]}>
              {t('marketplace.chooseFile', 'Choose JSON File')}
            </Text>
          </Pressable>
        </View>
      )}

      {previewTheme && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: previewTheme.bg || theme.bg,
            borderTopWidth: 2,
            borderTopColor: previewTheme.primary || theme.primary,
            padding: spacing.lg,
            zIndex: 999,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                color: previewTheme.text || '#FFF',
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold,
              }}
            >
              {previewName}
            </Text>
            <Pressable
              onPress={() => {
                setPreviewTheme(null);
                setPreviewName('');
              }}
            >
              <Text style={{ color: previewTheme.text || '#FFF', fontSize: fontSize.lg }}>✕</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.xxs, marginBottom: spacing.md }}>
            {[
              'bg',
              'surface',
              'surfaceLight',
              'primary',
              'primaryLight',
              'accent',
              'success',
              'danger',
              'warning',
              'text',
              'textDim',
              'textMuted',
            ].map((key) => (
              <View
                key={key}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  backgroundColor: previewTheme[key] || '#333',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <Pressable
              style={{
                flex: 1,
                backgroundColor: previewTheme.surface || '#222',
                borderRadius: radius.md,
                padding: spacing.sm,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: previewTheme.border || '#444',
              }}
              onPress={() => {
                setPreviewTheme(null);
                setPreviewName('');
              }}
            >
              <Text style={{ color: previewTheme.text || '#FFF', fontWeight: fontWeight.semibold }}>
                {t('common.cancel', 'Cancel')}
              </Text>
            </Pressable>
            <Pressable
              style={{
                flex: 1,
                backgroundColor: previewTheme.primary || theme.primary,
                borderRadius: radius.md,
                padding: spacing.sm,
                alignItems: 'center',
              }}
              onPress={handleConfirmImport}
            >
              <Text style={{ color: '#FFF', fontWeight: fontWeight.bold }}>
                {t('marketplace.install', 'Install')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
