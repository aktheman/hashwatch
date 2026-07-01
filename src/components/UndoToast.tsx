import { useEffect, useRef } from 'react';
import { Animated, Platform, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '../store/toast';
import { useTheme } from '../theme';

import { spacing, radius, fontSize, fontWeight } from '../utils/design';

export function UndoToast() {
  const { t } = useTranslation();
  const theme = useTheme();
  const undo = useToastStore((s) => s.undo);
  const dismissUndo = useToastStore((s) => s.dismissUndo);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: undo ? 1 : 0,
      duration: 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [undo, opacity]);

  if (!undo) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.surfaceLight, opacity, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.message, { color: theme.text }]} numberOfLines={1}>
        {undo.message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.undo')}
        onPress={() => {
          undo.onUndo();
          dismissUndo();
        }}
        style={[styles.undoBtn, { backgroundColor: theme.primary }]}
      >
        <Text style={[styles.undoText, { color: theme.bg }]}>{t('common.undo')}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  message: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  undoBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
  undoText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});
