import { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, Switch, TextInput, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { getSetting, setSetting } from '../db/database';

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

const PRESETS_KEY = 'dashboard_presets';

async function loadPresets(): Promise<DashboardPreset[]> {
  try {
    const raw = await getSetting(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function savePresets(presets: DashboardPreset[]): Promise<void> {
  try {
    await setSetting(PRESETS_KEY, JSON.stringify(presets));
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
  const { t } = useTranslation();
  const [presets, setPresets] = useState<DashboardPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPresets().then(setPresets);
      setShowPresets(false);
      setPresetName('');
    }
  }, [visible]);

  if (!visible) return null;

  const handleSavePreset = async () => {
    const name = presetName.trim();
    if (!name) {
      Alert.alert(t('dashboardCustomizer.nameRequired'), t('dashboardCustomizer.nameRequiredBody'));
      return;
    }
    const existing = await loadPresets();
    const idx = existing.findIndex((p) => p.name === name);
    const preset: DashboardPreset = { name, sections: { ...visibleSections } };
    if (idx >= 0) {
      existing[idx] = preset;
    } else {
      existing.push(preset);
    }
    await savePresets(existing);
    setPresets(existing);
    setPresetName('');
    Alert.alert(t('dashboardCustomizer.saved'), t('dashboardCustomizer.savedBody', { name }));
  };

  const handleLoadPreset = (preset: DashboardPreset) => {
    onApplyPreset(preset.sections);
    setShowPresets(false);
  };

  const handleDeletePreset = async (name: string) => {
    const updated = presets.filter((p) => p.name !== name);
    await savePresets(updated);
    setPresets(updated);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            padding: spacing.xl,
            paddingBottom: spacing.xxl,
            maxHeight: '80%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ color: theme.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>
              {t('dashboardCustomizer.title')}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={{ color: theme.primary, fontSize: fontSize.lg }}>
                {t('dashboardCustomizer.done')}
              </Text>
            </Pressable>
          </View>
          <ScrollView>
            {Object.entries(SECTION_LABELS).map(([key, label]) => (
              <View
                key={key}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
              >
                <Text style={{ color: theme.text, fontSize: fontSize.base }}>
                  {t(`dashboardCustomizer.section.${key}` as const, label)}
                </Text>
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
              <Text style={{ color: theme.text, fontSize: 14 }}>
                📺 {t('dashboardCustomizer.kioskMode')}
              </Text>
              <Switch
                value={kioskMode}
                onValueChange={(val) => onToggleKiosk(val)}
                trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
                thumbColor={kioskMode ? theme.primary : theme.textMuted}
              />
            </View>

            <View style={{ marginTop: 16, gap: 8 }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                {t('dashboardCustomizer.presets')}
              </Text>
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
                  placeholder={String(t('dashboardCustomizer.presetPlaceholder'))}
                  placeholderTextColor={theme.textMuted}
                  value={presetName}
                  onChangeText={setPresetName}
                />
                <Pressable
                  accessibilityRole="button"
                  style={{
                    backgroundColor: theme.primary,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    justifyContent: 'center',
                  }}
                  onPress={handleSavePreset}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                    {t('dashboardCustomizer.save')}
                  </Text>
                </Pressable>
              </View>
              <Pressable
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
                  {showPresets
                    ? t('dashboardCustomizer.hidePresets')
                    : t('dashboardCustomizer.loadPreset', { count: presets.length })}
                </Text>
              </Pressable>
              {showPresets && presets.length === 0 && (
                <Text style={{ color: theme.textMuted, fontSize: 12, textAlign: 'center' }}>
                  {t('dashboardCustomizer.noPresets')}
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
                    <Pressable
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
                    </Pressable>
                    <Pressable
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
                    </Pressable>
                  </View>
                ))}
              <Pressable
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
                    t('dashboardCustomizer.resetTitle'),
                    t('dashboardCustomizer.resetBody'),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('dashboardCustomizer.reset'),
                        style: 'destructive',
                        onPress: () => onReset(),
                      },
                    ],
                  );
                }}
              >
                <Text style={{ color: theme.danger, fontWeight: '700', fontSize: 13 }}>
                  {t('dashboardCustomizer.resetToDefaults')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
