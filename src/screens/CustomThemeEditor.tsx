import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { useTheme, darkTheme, THEME_MAP } from '../theme';
import { useCustomThemesStore, customThemeToTheme } from '../store/customThemes';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { ThemePreviewModal } from '../components/ThemePreviewModal';
import { Theme } from '../theme';
import { NavigationProp } from '../types';

const COLOR_GROUPS = [
  {
    label: 'Background',
    keys: ['bg', 'surface', 'surfaceLight', 'border'] as const,
  },
  {
    label: 'Primary',
    keys: ['primary', 'primaryLight', 'primaryDark', 'accent'] as const,
  },
  {
    label: 'Status',
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
    label: 'Text',
    keys: ['text', 'textDim', 'textMuted'] as const,
  },
  {
    label: 'Glow',
    keys: ['glow', 'glowSuccess', 'glowDanger', 'glowWarning'] as const,
  },
];

const COLOR_LABELS: Record<string, string> = {
  bg: 'Background',
  surface: 'Surface',
  surfaceLight: 'Surface Light',
  border: 'Border',
  primary: 'Primary',
  primaryLight: 'Primary Light',
  primaryDark: 'Primary Dark',
  accent: 'Accent',
  success: 'Success',
  successLight: 'Success Light',
  danger: 'Danger',
  dangerLight: 'Danger Light',
  warning: 'Warning',
  warningLight: 'Warning Light',
  info: 'Info',
  text: 'Text',
  textDim: 'Text Dim',
  textMuted: 'Text Muted',
  glow: 'Glow',
  glowSuccess: 'Glow Success',
  glowDanger: 'Glow Danger',
  glowWarning: 'Glow Warning',
};

interface Props {
  navigation: NavigationProp;
  route?: { params?: { themeId?: number; cloneFrom?: string } };
}

export default function CustomThemeEditor({ navigation, route }: Props) {
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

  const previewTheme = buildThemeFromColors(colors);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Theme name is required');
      return;
    }
    if (existingTheme) {
      await update(existingTheme.id, { name: name.trim(), colors });
    } else {
      await create(name.trim(), colors);
    }
    navigation.goBack();
  }, [name, colors, existingTheme, create, update, navigation]);

  const handleDelete = useCallback(() => {
    if (!existingTheme) return;
    Alert.alert('Delete Theme', `Delete "${existingTheme.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(existingTheme.id);
          navigation.goBack();
        },
      },
    ]);
  }, [existingTheme, remove, navigation]);

  const handleReset = useCallback(() => {
    setColors({ ...baseTheme });
  }, [baseTheme]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {existingTheme ? 'Edit Theme' : 'New Theme'}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            style={[
              styles.headerBtn,
              { backgroundColor: theme.surfaceLight, borderColor: theme.border },
            ]}
            onPress={() => setPreviewVisible(true)}
          >
            <Text style={{ color: theme.text, fontSize: fontSize.sm }}>Preview</Text>
          </Pressable>
          <Pressable
            style={[
              styles.headerBtn,
              { backgroundColor: theme.surfaceLight, borderColor: theme.border },
            ]}
            onPress={handleReset}
          >
            <Text style={{ color: theme.text, fontSize: fontSize.sm }}>Reset</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.textDim }]}>Theme Name</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.surfaceLight, color: theme.text, borderColor: theme.border },
          ]}
          value={name}
          onChangeText={setName}
          placeholder="My Custom Theme"
          placeholderTextColor={theme.textMuted}
        />
      </View>

      <View style={styles.groupTabs}>
        {COLOR_GROUPS.map((group, i) => (
          <Pressable
            key={group.label}
            style={[
              styles.groupTab,
              {
                backgroundColor: activeGroup === i ? theme.primary : theme.surfaceLight,
                borderColor: activeGroup === i ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setActiveGroup(i)}
          >
            <Text
              style={{
                color: activeGroup === i ? '#FFF' : theme.text,
                fontSize: fontSize.xs,
                fontWeight: fontWeight.semibold,
              }}
            >
              {group.label}
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
                {COLOR_LABELS[key] || key}
              </Text>
            </View>
            <TextInput
              style={[
                styles.colorInput,
                {
                  backgroundColor: theme.surfaceLight,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={val}
              onChangeText={(v) => updateColor(key, v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        );
      })}

      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          onPress={handleSave}
        >
          <Text style={{ color: '#FFF', fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
            {existingTheme ? 'Save Changes' : 'Create Theme'}
          </Text>
        </Pressable>

        {existingTheme && (
          <Pressable
            style={[styles.dangerBtn, { borderColor: theme.danger }]}
            onPress={handleDelete}
          >
            <Text
              style={{ color: theme.danger, fontSize: fontSize.base, fontWeight: fontWeight.bold }}
            >
              Delete Theme
            </Text>
          </Pressable>
        )}
      </View>

      <ThemePreviewModal
        visible={previewVisible}
        theme={previewTheme}
        themeName={name || 'Preview'}
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
