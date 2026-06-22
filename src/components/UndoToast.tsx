import { useEffect, useRef } from 'react';
import { Animated, Platform, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '../store/toast';
import { useTheme } from '../theme';

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
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('common.undo')}
        onPress={() => {
          undo.onUndo();
          dismissUndo();
        }}
        style={[styles.undoBtn, { backgroundColor: theme.primary }]}
      >
        <Text style={[styles.undoText, { color: theme.bg }]}>{t('common.undo')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    elevation: 6,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  undoBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 12,
  },
  undoText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
