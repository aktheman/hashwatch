import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../theme';
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
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 20,
            padding: 24,
            maxHeight: '70%',
            width: '100%',
            maxWidth: 400,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800', marginBottom: 4 }}>
            What's New
          </Text>
          <Text style={{ color: theme.textDim, fontSize: 12, marginBottom: 16 }}>
            Version {APP_VERSION}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {CHANGELOG.map((entry) => (
              <View key={entry.version} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '700' }}>
                    v{entry.version}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginLeft: 8 }}>
                    {entry.date}
                  </Text>
                </View>
                {entry.changes.map((change, i) => (
                  <View key={i} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 8 }}>
                    <Text style={{ color: theme.success, fontSize: 12, marginRight: 6 }}>✓</Text>
                    <Text style={{ color: theme.textDim, fontSize: 12, flex: 1, lineHeight: 18 }}>
                      {change}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <Pressable
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              padding: 14,
              alignItems: 'center',
              marginTop: 8,
            }}
            onPress={() => setVisible(false)}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Got it!</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
