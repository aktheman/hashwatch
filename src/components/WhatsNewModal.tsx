import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import * as DB from '../db/database';

const APP_VERSION = '1.1.0';

const CHANGELOG = [
  {
    version: '1.1.0',
    date: '2026-06-24',
    changes: [
      'Real-time fast polling (5s foreground / 30s background)',
      'Dashboard layout customization (show/hide sections)',
      'Cross-miner overlay charts on Analytics',
      'Enhanced PWA with API caching',
      'Miner groups 2.0 with collapsible sections + group stats',
      'Multi-language support (中文, 日本語, Deutsch, Français)',
      'Custom miner emoji icons',
      'Miner cloning (duplicate)',
      'Dark mode schedule (timer-based auto-switch)',
      'Bulk CSV import/export',
      'Performance improvements',
      'Push notification settings',
      'Keyboard accessibility (Escape to exit selection mode)',
      'Shareable miner snapshot card',
      "What's New / changelog modal",
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-01',
    changes: [
      'Initial release',
      'Miner dashboard with world map',
      'Real-time hashrate/temp monitoring',
      'Historical charts on Analytics',
      'Wallet management',
      'Miner groups',
      'Theme system (5 themes)',
      'PWA support',
      'CSV export',
      'Miner alerts (offline/hot/hashrate drop)',
      'Pool statistics',
    ],
  },
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
    >
      <View style={styles.backdrop}>
        <View style={[styles.modal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text
            style={[
              styles.title,
              { color: theme.text, fontSize: fontSize.h3, fontWeight: fontWeight.extrabold },
            ]}
          >
            What's New
          </Text>
          <Text style={[styles.version, { color: theme.textDim, fontSize: fontSize.sm }]}>
            Version {APP_VERSION}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {CHANGELOG.map((entry) => (
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
                {entry.changes.map((change, i) => (
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
            ))}
          </ScrollView>
          <Pressable
            style={[styles.closeButton, { backgroundColor: theme.primary }]}
            onPress={() => setVisible(false)}
          >
            <Text style={{ color: '#FFF', fontWeight: fontWeight.bold, fontSize: fontSize.md }}>
              Got it!
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
