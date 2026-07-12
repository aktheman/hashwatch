/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Switch,
  TextInput,
  Alert,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
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
  onReorder: (orderedKeys: SectionKey[]) => void;
  kioskMode: boolean;
  onToggleKiosk: (val: boolean) => void;
  sectionOrder: SectionKey[];
}

export const ALL_SECTIONS = Object.keys(SECTION_LABELS) as SectionKey[];

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

export function DashboardCustomizer({
  visible,
  onClose,
  visibleSections,
  onToggle,
  onReset,
  onApplyPreset,
  onReorder,
  kioskMode,
  onToggleKiosk,
  sectionOrder: initialSectionOrder,
}: DashboardCustomizerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [presets, setPresets] = useState<DashboardPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>(initialSectionOrder);
  const sectionOrderRef = useRef(sectionOrder);
  sectionOrderRef.current = sectionOrder;
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragIdxRef = useRef(dragIdx);
  dragIdxRef.current = dragIdx;
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const dragY = useRef(new Animated.Value(0)).current;
  const dragAnimating = useRef(false);
  const itemHeights = useRef<number[]>([]);
  const ITEM_HEIGHT = 52;

  const sectionListRef = useRef<ScrollView>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => dragAnimating.current,
      onPanResponderMove: (_, gs) => {
        if (!dragAnimating.current || dragIdxRef.current === null) return;
        const newY = gs.dy;
        dragY.setValue(newY);
        const itemH = itemHeights.current[dragIdxRef.current] || ITEM_HEIGHT;
        const offset = Math.round(newY / itemH);
        if (offset !== 0) {
          const currentOrder = sectionOrderRef.current;
          const currentIdx = dragIdxRef.current;
          const targetIdx = Math.max(0, Math.min(currentOrder.length - 1, currentIdx + offset));
          if (targetIdx !== currentIdx) {
            const newOrder = moveItem(currentOrder, currentIdx, targetIdx);
            setSectionOrder(newOrder);
            sectionOrderRef.current = newOrder;
            onReorder(newOrder);
            setDragIdx(targetIdx);
            dragIdxRef.current = targetIdx;
            itemHeights.current[targetIdx] = itemH;
            dragY.setValue(0);
          }
        }
      },
      onPanResponderRelease: () => {
        if (!dragAnimating.current) return;
        dragAnimating.current = false;
        setDragIdx(null);
        setScrollEnabled(true);
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        dragAnimating.current = false;
        setDragIdx(null);
        setScrollEnabled(true);
        dragY.setValue(0);
      },
    }),
  ).current;

  const startDrag = (idx: number) => {
    if (dragIdx !== null) return;
    setDragIdx(idx);
    dragAnimating.current = true;
    setScrollEnabled(false);
  };

  useEffect(() => {
    if (visible) {
      loadPresets().then(setPresets);
      setShowPresets(false);
      setPresetName('');
      setSectionOrder(initialSectionOrder);
      dragAnimating.current = false;
      setDragIdx(null);
      dragY.setValue(0);
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
          <ScrollView
            ref={sectionListRef}
            scrollEnabled={scrollEnabled}
            {...panResponder.panHandlers}
          >
            {sectionOrder.map((key, idx) => {
              const label = SECTION_LABELS[key];
              const canMoveUp = idx > 0;
              const canMoveDown = idx < sectionOrder.length - 1;
              const isDragging = dragIdx === idx;
              return (
                <Animated.View
                  key={key}
                  style={[
                    {
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: spacing.sm,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                      zIndex: isDragging ? 10 : 1,
                      elevation: isDragging ? 10 : 1,
                      opacity: dragIdx !== null && !isDragging ? 0.5 : 1,
                    },
                    isDragging && { transform: [{ translateY: dragY }] },
                  ]}
                  onLayout={(e) => {
                    itemHeights.current[idx] = e.nativeEvent.layout.height;
                  }}
                >
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Drag ${label} to reorder`}
                      onLongPress={() => startDrag(idx)}
                      onPressIn={() => {
                        itemHeights.current[idx] = ITEM_HEIGHT;
                      }}
                      style={{ padding: spacing.xxs, cursor: 'grab' } as any}
                    >
                      <Text style={{ color: theme.textMuted, fontSize: fontSize.lg }}>≡</Text>
                    </Pressable>
                    <Text style={{ color: theme.text, fontSize: fontSize.base, flex: 1 }}>
                      {t(`dashboardCustomizer.section.${key}` as const, label)}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${label} up`}
                      disabled={!canMoveUp}
                      onPress={() => {
                        const next = moveItem(sectionOrder, idx, idx - 1);
                        setSectionOrder(next);
                        onReorder(next);
                      }}
                      style={{ opacity: canMoveUp ? 1 : 0.2, padding: spacing.xxs }}
                    >
                      <Text style={{ color: theme.textMuted, fontSize: fontSize.lg }}>▲</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${label} down`}
                      disabled={!canMoveDown}
                      onPress={() => {
                        const next = moveItem(sectionOrder, idx, idx + 1);
                        setSectionOrder(next);
                        onReorder(next);
                      }}
                      style={{ opacity: canMoveDown ? 1 : 0.2, padding: spacing.xxs }}
                    >
                      <Text style={{ color: theme.textMuted, fontSize: fontSize.lg }}>▼</Text>
                    </Pressable>
                  </View>
                  <Switch
                    value={visibleSections[key]}
                    onValueChange={() => onToggle(key)}
                    trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
                    thumbColor={visibleSections[key] ? theme.primary : theme.textMuted}
                  />
                </Animated.View>
              );
            })}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: fontSize.base }}>
                📺 {t('dashboardCustomizer.kioskMode')}
              </Text>
              <Switch
                value={kioskMode}
                onValueChange={(val) => onToggleKiosk(val)}
                trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
                thumbColor={kioskMode ? theme.primary : theme.textMuted}
              />
            </View>

            <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
              <Text
                style={{ color: theme.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}
              >
                {t('dashboardCustomizer.presets')}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: radius.sm,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    color: theme.text,
                    backgroundColor: theme.surfaceLight,
                    fontSize: fontSize.base,
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
                    paddingHorizontal: spacing.lg,
                    borderRadius: radius.sm,
                    justifyContent: 'center',
                  }}
                  onPress={handleSavePreset}
                >
                  <Text
                    style={{ color: '#FFF', fontWeight: fontWeight.bold, fontSize: fontSize.base }}
                  >
                    {t('dashboardCustomizer.save')}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                style={{
                  backgroundColor: theme.surfaceLight,
                  paddingVertical: spacing.md,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={() => setShowPresets((p) => !p)}
              >
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: fontSize.base }}>
                  {showPresets
                    ? t('dashboardCustomizer.hidePresets')
                    : t('dashboardCustomizer.loadPreset', { count: presets.length })}
                </Text>
              </Pressable>
              {showPresets && presets.length === 0 && (
                <Text
                  style={{ color: theme.textMuted, fontSize: fontSize.sm, textAlign: 'center' }}
                >
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
                      gap: spacing.xs,
                      paddingVertical: spacing.xs,
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      style={{
                        flex: 1,
                        backgroundColor: theme.surfaceLight,
                        paddingVertical: spacing.xs,
                        paddingHorizontal: spacing.md,
                        borderRadius: radius.sm,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onPress={() => handleLoadPreset(p)}
                    >
                      <Text
                        style={{ color: theme.text, fontWeight: '600', fontSize: fontSize.base }}
                      >
                        {p.name}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleDeletePreset(p.name)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: radius.sm,
                        backgroundColor: theme.danger + '1A',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: theme.danger,
                          fontSize: fontSize.base,
                          fontWeight: fontWeight.bold,
                        }}
                      >
                        ✕
                      </Text>
                    </Pressable>
                  </View>
                ))}
              <Pressable
                accessibilityRole="button"
                style={{
                  backgroundColor: theme.danger + '1A',
                  paddingVertical: spacing.md,
                  borderRadius: radius.sm,
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
                <Text
                  style={{
                    color: theme.danger,
                    fontWeight: fontWeight.bold,
                    fontSize: fontSize.base,
                  }}
                >
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
