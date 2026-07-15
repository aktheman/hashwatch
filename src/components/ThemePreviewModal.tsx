import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import type { Theme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';

interface ThemePreviewModalProps {
  visible: boolean;
  theme: Theme | null;
  themeName: string;
  emoji: string;
  isActive: boolean;
  onApply: () => void;
  onClose: () => void;
}

export function ThemePreviewModal({
  visible,
  theme: t,
  themeName,
  emoji,
  isActive,
  onApply,
  onClose,
}: ThemePreviewModalProps) {
  if (!t) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: t.bg, borderColor: t.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: t.text }]}>
            {emoji} {themeName}
          </Text>

          <View style={[styles.preview, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.swatchRow}>
              {[t.primary, t.accent, t.success, t.danger, t.warning, t.info].map((c, i) => (
                <View key={i} style={[styles.swatch, { backgroundColor: c }]} />
              ))}
            </View>
            <View style={[styles.textPreview, { backgroundColor: t.bg }]}>
              <Text style={{ color: t.text, fontSize: fontSize.base }}>Primary text</Text>
              <Text style={{ color: t.textDim, fontSize: fontSize.sm }}>Secondary text</Text>
              <Text style={{ color: t.textMuted, fontSize: fontSize.xs }}>Muted text</Text>
            </View>
            <View style={styles.btnRow}>
              <View style={[styles.previewBtn, { backgroundColor: t.primary }]}>
                <Text
                  style={{ color: '#FFF', fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
                >
                  Primary
                </Text>
              </View>
              <View style={[styles.previewBtn, { backgroundColor: t.success }]}>
                <Text
                  style={{ color: '#FFF', fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
                >
                  Success
                </Text>
              </View>
              <View style={[styles.previewBtn, { backgroundColor: t.danger }]}>
                <Text
                  style={{ color: '#FFF', fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
                >
                  Danger
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.btn, { backgroundColor: t.surfaceLight, borderColor: t.border }]}
              onPress={onClose}
            >
              <Text style={{ color: t.text, fontSize: fontSize.base }}>Close</Text>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                { backgroundColor: isActive ? t.surfaceLight : t.primary, borderColor: t.border },
              ]}
              onPress={onApply}
              disabled={isActive}
            >
              <Text
                style={{
                  color: isActive ? t.textMuted : '#FFF',
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.bold,
                }}
              >
                {isActive ? 'Active' : 'Apply'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  preview: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
  },
  textPreview: {
    borderRadius: radius.xs,
    padding: spacing.xs,
    gap: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  previewBtn: {
    flex: 1,
    borderRadius: radius.xs,
    paddingVertical: spacing.xxs,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
});
