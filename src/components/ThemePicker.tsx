import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  useTheme,
  setThemeMode,
  getThemeMode,
  THEME_MAP,
  THEME_ORDER,
  THEME_EMOJIS,
} from '../theme';
import { switchThemeWithTransition } from './ThemeTransitionOverlay';
import type { Theme } from '../theme';
import { useTranslation } from 'react-i18next';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { ThemePreviewModal } from './ThemePreviewModal';

interface ThemePickerProps {
  onThemeChange?: (mode: string) => void;
}

export function ThemePicker({ onThemeChange }: ThemePickerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [previewMode, setPreviewMode] = useState<string | null>(null);
  const currentMode = getThemeMode();

  const handlePress = useCallback(
    (mode: string) => {
      switchThemeWithTransition(() => setThemeMode(mode as Parameters<typeof setThemeMode>[0]));
      onThemeChange?.(mode);
    },
    [onThemeChange],
  );

  const handleLongPress = useCallback((mode: string) => {
    setPreviewMode(mode);
  }, []);

  const previewTheme: Theme | null = previewMode ? (THEME_MAP[previewMode] ?? null) : null;
  const previewEmoji = previewMode ? (THEME_EMOJIS[previewMode] ?? '🎨') : '🎨';
  const previewLabel = previewMode ? (t(`themes.${previewMode}` as const) ?? previewMode) : '';

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {THEME_ORDER.map((mode) => {
          const tObj = THEME_MAP[mode];
          const isActive = currentMode === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={`${mode} theme`}
              style={[
                styles.cell,
                {
                  backgroundColor: isActive ? theme.primary + '22' : theme.surface,
                  borderColor: isActive ? theme.primary : theme.border,
                },
              ]}
              onPress={() => handlePress(mode)}
              onLongPress={() => handleLongPress(mode)}
            >
              <View style={styles.swatchRow}>
                <View style={[styles.swatch, { backgroundColor: tObj?.bg ?? '#000' }]} />
                <View style={[styles.swatch, { backgroundColor: tObj?.primary ?? '#888' }]} />
                <View style={[styles.swatch, { backgroundColor: tObj?.accent ?? '#666' }]} />
              </View>
              <Text
                style={[styles.label, { color: isActive ? theme.primary : theme.text }]}
                numberOfLines={1}
              >
                {THEME_EMOJIS[mode]} {t(`themes.${mode}` as const) ?? mode}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.hint, { color: theme.textMuted }]}>
        Tap to apply · Long-press to preview
      </Text>

      <ThemePreviewModal
        visible={previewMode !== null}
        theme={previewTheme}
        themeName={previewLabel}
        emoji={previewEmoji}
        isActive={previewMode === currentMode}
        onApply={() => {
          if (previewMode) {
            handlePress(previewMode);
            setPreviewMode(null);
          }
        }}
        onClose={() => setPreviewMode(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  cell: {
    width: '47%',
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: radius.xxs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  hint: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
});
