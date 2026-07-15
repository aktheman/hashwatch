import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../theme';
import { useTranslation } from 'react-i18next';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import * as DB from '../db/database';

const APP_VERSION = '1.1.0';

const CHANGELOG = [
  { version: '1.1.0', date: '2026-06-24', key: 'changelog' },
  { version: '1.0.0', date: '2026-06-01', key: 'changelogV1' },
];

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: spacing.xl,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
  },
  title: {
    marginBottom: spacing.xxs,
  },
  version: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  changeRow: {
    flexDirection: 'row',
    marginBottom: spacing.xxs,
    paddingLeft: spacing.xs,
  },
  changeText: {
    flex: 1,
    lineHeight: 18,
  },
  closeButton: {
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});

export function WhatsNewModal() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    DB.getSetting('last_seen_version').then((v) => {
      if (v !== APP_VERSION) {
        setVisible(true);
        DB.setSetting('last_seen_version', APP_VERSION);
      }
    });
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
      accessibilityLabel="What's new"
    >
      <View style={styles.backdrop}>
        <View style={[styles.modal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text
            style={[
              styles.title,
              { color: theme.text, fontSize: fontSize.h3, fontWeight: fontWeight.extrabold },
            ]}
          >
            {t('whatsNew.title')}
          </Text>
          <Text style={[styles.version, { color: theme.textDim, fontSize: fontSize.sm }]}>
            {t('whatsNew.version', { version: APP_VERSION })}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {CHANGELOG.map((entry) => {
              const changes = t(`whatsNew.${entry.key}`, { returnObjects: true }) as string[];
              return (
                <View key={entry.version} style={styles.section}>
                  <View style={styles.headerRow}>
                    <Text
                      style={[
                        styles.version,
                        {
                          color: theme.primary,
                          fontSize: fontSize.base,
                          fontWeight: fontWeight.bold,
                          marginBottom: 0,
                        },
                      ]}
                    >
                      v{entry.version}
                    </Text>
                    <Text
                      style={{
                        color: theme.textMuted,
                        fontSize: fontSize.xs,
                        marginLeft: spacing.xs,
                      }}
                    >
                      {entry.date}
                    </Text>
                  </View>
                  {changes.map((change: string, i: number) => (
                    <View key={i} style={styles.changeRow}>
                      <Text
                        style={{
                          color: theme.success,
                          fontSize: fontSize.xs,
                          marginRight: spacing.xxs,
                        }}
                      >
                        ✓
                      </Text>
                      <Text
                        style={[styles.changeText, { color: theme.textDim, fontSize: fontSize.xs }]}
                      >
                        {change}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
          <Pressable
            style={[styles.closeButton, { backgroundColor: theme.primary }]}
            onPress={() => setVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={{ color: '#FFF', fontWeight: fontWeight.bold, fontSize: fontSize.md }}>
              {t('whatsNew.gotIt')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
