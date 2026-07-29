import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, darkTheme, THEME_MAP, buildThemeFromColors } from '../theme';
import { useCustomThemesStore, customThemeToTheme } from '../store/customThemes';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { ThemePreviewModal } from '../components/ThemePreviewModal';
import { Theme } from '../theme';
import { NavigationProp } from '../types';

const COLOR_GROUPS = [
  {
    labelKey: 'customThemeEditor.background',
    keys: ['bg', 'surface', 'surfaceLight', 'border'] as const,
  },
  {
    labelKey: 'customThemeEditor.primary',
    keys: ['primary', 'primaryLight', 'primaryDark', 'accent'] as const,
  },
  {
    labelKey: 'customThemeEditor.status',
    keys: [
      'success',
      'successLight',
      'danger',
      'dangerLight',
      'warning',
      'warningLight',
      'info',
    ] as const,
  },
  {
    labelKey: 'customThemeEditor.text',
    keys: ['text', 'textDim', 'textMuted'] as const,
  },
  {
    labelKey: 'customThemeEditor.glow',
    keys: ['glow', 'glowSuccess', 'glowDanger', 'glowWarning'] as const,
  },
];

const COLOR_I18N_KEYS: Record<string, string> = {
  bg: 'customThemeEditor.colors.bg',
  surface: 'customThemeEditor.colors.surface',
  surfaceLight: 'customThemeEditor.colors.surfaceLight',
  border: 'customThemeEditor.colors.border',
  primary: 'customThemeEditor.colors.primary',
  primaryLight: 'customThemeEditor.colors.primaryLight',
  primaryDark: 'customThemeEditor.colors.primaryDark',
  accent: 'customThemeEditor.colors.accent',
  success: 'customThemeEditor.colors.success',
  successLight: 'customThemeEditor.colors.successLight',
  danger: 'customThemeEditor.colors.danger',
  dangerLight: 'customThemeEditor.colors.dangerLight',
  warning: 'customThemeEditor.colors.warning',
  warningLight: 'customThemeEditor.colors.warningLight',
  info: 'customThemeEditor.colors.info',
  text: 'customThemeEditor.colors.text',
  textDim: 'customThemeEditor.colors.textDim',
  textMuted: 'customThemeEditor.colors.textMuted',
  glow: 'customThemeEditor.colors.glow',
  glowSuccess: 'customThemeEditor.colors.glowSuccess',
  glowDanger: 'customThemeEditor.colors.glowDanger',
  glowWarning: 'customThemeEditor.colors.glowWarning',
};

interface Props {
  navigation: NavigationProp;
  route?: { params?: { themeId?: number; cloneFrom?: string } };
}

export default function CustomThemeEditor({ navigation, route }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { create, update, remove, themes } = useCustomThemesStore();

  const existingTheme = route?.params?.themeId
    ? themes.find((ct) => ct.id === route.params!.themeId)
    : undefined;

  const cloneFrom = route?.params?.cloneFrom;
  const baseTheme = existingTheme
    ? customThemeToTheme(existingTheme)
    : cloneFrom && THEME_MAP[cloneFrom]
      ? THEME_MAP[cloneFrom]
      : darkTheme;

  const [name, setName] = useState(existingTheme?.name ?? '');
  const [colors, setColors] = useState<Partial<Theme>>(() => {
    if (existingTheme) return existingTheme.colors;
    return { ...baseTheme };
  });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);

  const updateColor = useCallback((key: keyof Theme, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isValidHex = (v: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);

  const previewTheme = useMemo(() => buildThemeFromColors(colors), [colors]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('customThemeEditor.nameRequired'));
      return;
    }
    const invalidKeys = Object.entries(colors)
      .filter(([, v]) => typeof v === 'string' && !isValidHex(v))
      .map(([key]) => t(COLOR_I18N_KEYS[key] || key));
    if (invalidKeys.length > 0) {
      Alert.alert(
        t('customThemeEditor.invalidColors'),
        t('themes.invalidColors', { keys: invalidKeys.join(', ') }),
      );
      return;
    }
    if (existingTheme) {
      await update(existingTheme.id, { name: name.trim(), colors });
    } else {
      await create(name.trim(), colors);
    }
    navigation.goBack();
  }, [name, colors, existingTheme, create, update, navigation, t]);

  const handleDelete = useCallback(() => {
    if (!existingTheme) return;
    Alert.alert(t('themes.deleteTheme'), t('themes.deleteConfirm', { name: existingTheme.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await remove(existingTheme.id);
          navigation.goBack();
        },
      },
    ]);
  }, [existingTheme, remove, navigation, t]);

  const handleReset = useCallback(() => {
    setColors({ ...baseTheme });
  }, [baseTheme]);

  const handleExport = useCallback(async () => {
    const json = JSON.stringify({ name: name || 'Custom Theme', version: 1, colors }, null, 2);
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(json);
        Alert.alert(t('common.success'), t('customThemeEditor.copied'));
      } catch {
        Alert.alert(t('customThemeEditor.export'), json);
      }
    } else {
      Alert.alert(t('customThemeEditor.exportTitle'), json);
    }
  }, [name, colors, t]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {existingTheme ? t('themes.editTheme') : t('themes.newTheme')}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            style={[
              styles.headerBtn,
              { backgroundColor: theme.surfaceLight, borderColor: theme.border },
            ]}
            onPress={handleExport}
            accessibilityRole="button"
            accessibilityLabel={t('themes.export')}
          >
            <Text style={{ color: theme.text, fontSize: fontSize.sm }}>{t('themes.export')}</Text>
          </Pressable>
          <Pressable
            style={[
              styles.headerBtn,
              { backgroundColor: theme.surfaceLight, borderColor: theme.border },
            ]}
            onPress={() => setPreviewVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('themes.preview')}
          >
            <Text style={{ color: theme.text, fontSize: fontSize.sm }}>{t('themes.preview')}</Text>
          </Pressable>
          <Pressable
            style={[
              styles.headerBtn,
              { backgroundColor: theme.surfaceLight, borderColor: theme.border },
            ]}
            onPress={handleReset}
            accessibilityRole="button"
            accessibilityLabel={t('themes.resetColors')}
          >
            <Text style={{ color: theme.text, fontSize: fontSize.sm }}>{t('themes.reset')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.textDim }]}>{t('themes.themeName')}</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.surfaceLight, color: theme.text, borderColor: theme.border },
          ]}
          value={name}
          onChangeText={setName}
          placeholder={t('themes.themeNamePlaceholder')}
          placeholderTextColor={theme.textMuted}
          accessibilityLabel={t('themes.themeName')}
        />
      </View>

      <View style={styles.groupTabs}>
        {COLOR_GROUPS.map((group, i) => (
          <Pressable
            key={group.labelKey}
            style={[
              styles.groupTab,
              {
                backgroundColor: activeGroup === i ? theme.primary : theme.surfaceLight,
                borderColor: activeGroup === i ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setActiveGroup(i)}
            accessibilityRole="button"
            accessibilityLabel={t(group.labelKey)}
          >
            <Text
              style={{
                color: activeGroup === i ? '#FFF' : theme.text,
                fontSize: fontSize.xs,
                fontWeight: fontWeight.semibold,
              }}
            >
              {t(group.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {COLOR_GROUPS[activeGroup].keys.map((key) => {
        const val = colors[key] ?? (baseTheme[key] as string);
        const isGlow = key.startsWith('glow');
        return (
          <View
            key={key}
            style={[styles.colorRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.colorLabel}>
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: isGlow ? theme.surfaceLight : val, borderColor: theme.border },
                ]}
              />
              <Text style={{ color: theme.text, fontSize: fontSize.base }}>
                {t(COLOR_I18N_KEYS[key] || key)}
              </Text>
            </View>
            <TextInput
              style={[
                styles.colorInput,
                {
                  backgroundColor: theme.surfaceLight,
                  color: theme.text,
                  borderColor: isValidHex(val) ? theme.border : theme.danger,
                },
              ]}
              value={val}
              onChangeText={(v) => updateColor(key, v)}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={`${t(COLOR_I18N_KEYS[key] || key)} color hex value`}
            />
          </View>
        );
      })}

      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel={existingTheme ? t('themes.saveChanges') : t('themes.createTheme')}
        >
          <Text style={{ color: '#FFF', fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
            {existingTheme ? t('themes.saveChanges') : t('themes.createTheme')}
          </Text>
        </Pressable>

        {existingTheme && (
          <Pressable
            style={[styles.dangerBtn, { borderColor: theme.danger }]}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel={t('themes.deleteTheme')}
          >
            <Text
              style={{ color: theme.danger, fontSize: fontSize.base, fontWeight: fontWeight.bold }}
            >
              {t('themes.deleteTheme')}
            </Text>
          </Pressable>
        )}
      </View>

      <ThemePreviewModal
        visible={previewVisible}
        theme={previewTheme}
        themeName={name || t('themes.preview')}
        emoji="🎨"
        isActive={false}
        onApply={() => {
          setPreviewVisible(false);
          handleSave();
        }}
        onClose={() => setPreviewVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: fontSize.h2, fontWeight: fontWeight.bold },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  headerBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  section: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  input: {
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: fontSize.base,
    borderWidth: 1,
  },
  groupTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  groupTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  colorLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: radius.xxs,
    borderWidth: 1,
  },
  colorInput: {
    width: 100,
    borderRadius: radius.xs,
    padding: spacing.xs,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    borderWidth: 1,
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  primaryBtn: {
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  dangerBtn: {
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
});
