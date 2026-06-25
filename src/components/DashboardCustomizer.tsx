import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Switch,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme';

export type SectionKey =
  | 'earnings'
  | 'ticker'
  | 'map'
  | 'legend'
  | 'pools'
  | 'metrics'
  | 'filters'
  | 'sort'
  | 'profitability';

export const SECTION_LABELS: Record<SectionKey, string> = {
  earnings: 'Earnings Card',
  ticker: 'BTC / Network Ticker',
  map: 'World Map',
  legend: 'Map Legend',
  pools: 'Pool Stats',
  metrics: 'Metric Tiles',
  filters: 'Wallet / Group Filters',
  sort: 'Sort Controls',
  profitability: 'Profitability',
};

export const DEFAULT_VISIBLE: Record<SectionKey, boolean> = {
  earnings: true,
  ticker: true,
  map: true,
  legend: true,
  pools: true,
  metrics: true,
  filters: true,
  sort: true,
  profitability: true,
};

interface DashboardPreset {
  name: string;
  sections: Record<SectionKey, boolean>;
}

const PRESETS_KEY = 'hashwatch_dashboard_presets';

function loadPresets(): DashboardPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: DashboardPreset[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch {}
}

interface DashboardCustomizerProps {
  visible: boolean;
  onClose: () => void;
  visibleSections: Record<SectionKey, boolean>;
  onToggle: (key: SectionKey) => void;
  onReset: () => void;
  onApplyPreset: (sections: Record<SectionKey, boolean>) => void;
  kioskMode: boolean;
  onToggleKiosk: (val: boolean) => void;
}

export function DashboardCustomizer({
  visible,
  onClose,
  visibleSections,
  onToggle,
  onReset,
  onApplyPreset,
  kioskMode,
  onToggleKiosk,
}: DashboardCustomizerProps) {
  const theme = useTheme();
  const [presets, setPresets] = useState<DashboardPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    if (visible) {
      setPresets(loadPresets());
      setShowPresets(false);
      setPresetName('');
    }
  }, [visible]);

  if (!visible) return null;

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) {
      Alert.alert('Name required', 'Enter a name for this preset.');
      return;
    }
    const existing = loadPresets();
    const idx = existing.findIndex((p) => p.name === name);
    const preset: DashboardPreset = { name, sections: { ...visibleSections } };
    if (idx >= 0) {
      existing[idx] = preset;
    } else {
      existing.push(preset);
    }
    savePresets(existing);
    setPresets(existing);
    setPresetName('');
    Alert.alert('Saved', `Preset "${name}" saved.`);
  };

  const handleLoadPreset = (preset: DashboardPreset) => {
    onApplyPreset(preset.sections);
    setShowPresets(false);
  };

  const handleDeletePreset = (name: string) => {
    const updated = presets.filter((p) => p.name !== name);
    savePresets(updated);
    setPresets(updated);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 40,
            maxHeight: '80%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
              Customize Dashboard
            </Text>
            <TouchableOpacity accessibilityRole="button" onPress={onClose}>
              <Text style={{ color: theme.primary, fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {Object.entries(SECTION_LABELS).map(([key, label]) => (
              <View
                key={key}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 14 }}>{label}</Text>
                <Switch
                  value={visibleSections[key as SectionKey]}
                  onValueChange={() => onToggle(key as SectionKey)}
                  trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
                  thumbColor={visibleSections[key as SectionKey] ? theme.primary : theme.textMuted}
                />
              </View>
            ))}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 14 }}>📺 Kiosk Mode</Text>
              <Switch
                value={kioskMode}
                onValueChange={(val) => onToggleKiosk(val)}
                trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
                thumbColor={kioskMode ? theme.primary : theme.textMuted}
              />
            </View>

            <View style={{ marginTop: 16, gap: 8 }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Presets</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    color: theme.text,
                    backgroundColor: theme.surfaceLight,
                    fontSize: 14,
                  }}
                  placeholder="Preset name..."
                  placeholderTextColor={theme.textMuted}
                  value={presetName}
                  onChangeText={setPresetName}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  style={{
                    backgroundColor: theme.primary,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    justifyContent: 'center',
                  }}
                  onPress={handleSavePreset}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Save</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                style={{
                  backgroundColor: theme.surfaceLight,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => setShowPresets((p) => !p)}
              >
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>
                  {showPresets ? 'Hide Presets' : `Load Preset (${presets.length})`}
                </Text>
              </TouchableOpacity>
              {showPresets && presets.length === 0 && (
                <Text style={{ color: theme.textMuted, fontSize: 12, textAlign: 'center' }}>
                  No saved presets yet.
                </Text>
              )}
              {showPresets &&
                presets.map((p) => (
                  <View
                    key={p.name}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 6,
                    }}
                  >
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={{
                        flex: 1,
                        backgroundColor: theme.surfaceLight,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onPress={() => handleLoadPreset(p)}
                    >
                      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => handleDeletePreset(p.name)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: theme.danger + '1A',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '700' }}>
                        ✕
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              <TouchableOpacity
                accessibilityRole="button"
                style={{
                  backgroundColor: theme.danger + '1A',
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.danger + '40',
                  marginTop: 4,
                }}
                onPress={() => {
                  Alert.alert(
                    'Reset to Defaults',
                    'This will reset all dashboard sections to their default visibility.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reset',
                        style: 'destructive',
                        onPress: () => onReset(),
                      },
                    ],
                  );
                }}
              >
                <Text style={{ color: theme.danger, fontWeight: '700', fontSize: 13 }}>
                  Reset to Defaults
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
