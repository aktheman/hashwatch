import { useState, useMemo, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, Alert, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight, cardStyle } from '../utils/design';
import * as haptics from '../utils/haptics';

interface DashboardWidgetConfig {
  id: string;
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
}

interface DashboardLayoutConfig {
  columns: 1 | 2;
  compact: boolean;
  widgets: DashboardWidgetConfig[];
}

const WIDGET_DEFS = [
  {
    id: 'totalHashrate',
    name: 'Total Hashrate',
    icon: '📊',
    description: 'Combined hashrate across all miners',
  },
  {
    id: 'tempOverview',
    name: 'Temperature Overview',
    icon: '🌡️',
    description: 'Average and max temperature',
  },
  { id: 'powerUsage', name: 'Power Usage', icon: '⚡', description: 'Total power draw and cost' },
  {
    id: 'earnings',
    name: 'Earnings Estimate',
    icon: '💰',
    description: 'Daily and weekly BTC/USD earnings',
  },
  {
    id: 'fleetHealth',
    name: 'Fleet Health',
    icon: '🏥',
    description: 'Overall fleet health score',
  },
  {
    id: 'hashrateTrend',
    name: 'Hashrate Trend',
    icon: '📈',
    description: 'Mini hashrate trend chart',
  },
  { id: 'alertSummary', name: 'Alert Summary', icon: '🔔', description: 'Active alerts count' },
  {
    id: 'poolDistribution',
    name: 'Pool Distribution',
    icon: '💧',
    description: 'Miners per pool breakdown',
  },
  { id: 'mapWidget', name: 'Map Widget', icon: '🗺️', description: 'Mini map of miner locations' },
  { id: 'minerList', name: 'Miner List', icon: '📋', description: 'Compact list of all miners' },
] as const;

const DEFAULT_WIDGETS: DashboardWidgetConfig[] = WIDGET_DEFS.map((def, i) => ({
  id: def.id,
  enabled: i < 7,
  order: i,
  size: i < 3 ? 'medium' : 'small',
}));

const DEFAULT_CONFIG: DashboardLayoutConfig = {
  columns: 2,
  compact: false,
  widgets: DEFAULT_WIDGETS,
};

const MOCK_DATA: Record<string, { lines: string[] }> = {
  totalHashrate: { lines: ['14.2 TH/s', '32 miners online'] },
  tempOverview: { lines: ['Avg: 62°C', 'Max: 78°C'] },
  powerUsage: { lines: ['5.4 kW total', '$4.32/day'] },
  earnings: { lines: ['0.00124 BTC/day', '$82.50 USD/day'] },
  fleetHealth: { lines: ['Score: 87/100', '3 warnings'] },
  hashrateTrend: { lines: ['▲ 2.3% last 24h', '█▀█▃▂▁▂▃█'] },
  alertSummary: { lines: ['2 offline', '1 high temp'] },
  poolDistribution: { lines: ['Solo: 18', 'Pool: 14'] },
  mapWidget: { lines: ['3 locations', '2 countries'] },
  minerList: { lines: ['AX10 #1 — online', 'AX10 #2 — online'] },
};

export function DashboardBuilderScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [config, setConfig] = useState<DashboardLayoutConfig>(DEFAULT_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);

  const enabledWidgets = useMemo(() => {
    return config.widgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order);
  }, [config.widgets]);

  const toggleWidget = useCallback((id: string) => {
    haptics.selectionToggleHaptic();
    setConfig((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)),
    }));
    setHasChanges(true);
  }, []);

  const setColumns = useCallback((cols: 1 | 2) => {
    haptics.selection();
    setConfig((prev) => ({ ...prev, columns: cols }));
    setHasChanges(true);
  }, []);

  const toggleCompact = useCallback(() => {
    haptics.selection();
    setConfig((prev) => ({ ...prev, compact: !prev.compact }));
    setHasChanges(true);
  }, []);

  const removeWidget = useCallback((id: string) => {
    haptics.light();
    setConfig((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === id ? { ...w, enabled: false } : w)),
    }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    haptics.success();
    setHasChanges(false);
    Alert.alert(
      t('dashboardBuilder.saved', 'Dashboard layout saved'),
      t('dashboardBuilder.saved', 'Dashboard layout saved'),
    );
  }, [t]);

  const handleReset = useCallback(() => {
    haptics.warning();
    Alert.alert(
      t('dashboardBuilder.resetConfirm', 'Reset dashboard to default layout?'),
      t('dashboardBuilder.resetConfirm', 'Reset dashboard to default layout?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('dashboardBuilder.reset', 'Reset'),
          style: 'destructive',
          onPress: () => {
            haptics.destructiveActionHaptic();
            setConfig(DEFAULT_CONFIG);
            setHasChanges(false);
          },
        },
      ],
    );
  }, [t]);

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    scroll: {
      flex: 1,
    },
    section: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: theme.text,
      marginBottom: spacing.sm,
    },
    sectionSub: {
      fontSize: fontSize.sm,
      color: theme.textDim,
      marginBottom: spacing.md,
    },
    controlsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    controlCard: {
      ...cardStyle(theme),
      flex: 1,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    controlLabel: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: theme.text,
    },
    controlSub: {
      fontSize: fontSize.xs,
      color: theme.textDim,
      marginTop: 2,
    },
    colBtn: {
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    colBtnActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryDark,
    },
    colBtnText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: theme.textDim,
    },
    colBtnTextActive: {
      color: theme.text,
    },
    widgetRow: {
      ...cardStyle(theme),
      padding: spacing.md,
      marginBottom: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
    },
    widgetIcon: {
      fontSize: 24,
      marginRight: spacing.sm,
    },
    widgetInfo: {
      flex: 1,
    },
    widgetName: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: theme.text,
    },
    widgetDesc: {
      fontSize: fontSize.xs,
      color: theme.textDim,
      marginTop: 2,
    },
    previewGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    previewCard: {
      ...cardStyle(theme),
      padding: spacing.md,
    },
    previewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    previewTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: theme.primary,
    },
    removeBtn: {
      width: 24,
      height: 24,
      borderRadius: radius.full,
      backgroundColor: theme.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeBtnText: {
      color: '#FFF',
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
    },
    previewLine: {
      fontSize: fontSize.sm,
      color: theme.textDim,
      marginTop: 2,
    },
    emptyPreview: {
      padding: spacing.xxl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: fontSize.base,
      color: theme.textMuted,
    },
    btnRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    saveBtn: {
      flex: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    resetBtn: {
      flex: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: theme.danger,
      backgroundColor: 'transparent',
      alignItems: 'center',
    },
    btnText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: '#FFF',
    },
    resetBtnText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: theme.danger,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: spacing.md,
    },
  });

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('dashboardBuilder.layout', 'Layout Controls')}</Text>
          <Text style={s.sectionSub}>
            {t('dashboardBuilder.layoutDesc', 'Choose how your dashboard widgets are arranged')}
          </Text>
          <View style={s.controlsRow}>
            <View style={s.controlCard}>
              <View>
                <Text style={s.controlLabel}>{t('dashboardBuilder.columns', 'Columns')}</Text>
                <Text style={s.controlSub}>
                  {config.columns === 2
                    ? t('dashboardBuilder.twoCol', 'Side by side')
                    : t('dashboardBuilder.oneCol', 'Full width')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <Pressable
                  style={[s.colBtn, config.columns === 1 && s.colBtnActive]}
                  onPress={() => setColumns(1)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: config.columns === 1 }}
                  accessibilityLabel="1 column layout"
                >
                  <Text style={[s.colBtnText, config.columns === 1 && s.colBtnTextActive]}>1</Text>
                </Pressable>
                <Pressable
                  style={[s.colBtn, config.columns === 2 && s.colBtnActive]}
                  onPress={() => setColumns(2)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: config.columns === 2 }}
                  accessibilityLabel="2 column layout"
                >
                  <Text style={[s.colBtnText, config.columns === 2 && s.colBtnTextActive]}>2</Text>
                </Pressable>
              </View>
            </View>
            <View style={s.controlCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.controlLabel}>{t('dashboardBuilder.compact', 'Compact')}</Text>
                <Text style={s.controlSub}>
                  {t('dashboardBuilder.compactDesc', 'Smaller widget padding')}
                </Text>
              </View>
              <Switch
                value={config.compact}
                onValueChange={toggleCompact}
                trackColor={{ false: theme.surfaceLight, true: theme.primaryDark }}
                thumbColor={config.compact ? theme.primary : theme.textDim}
                accessibilityLabel="Toggle compact mode"
              />
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>
            {t('dashboardBuilder.widgetLibrary', 'Widget Library')}
          </Text>
          <Text style={s.sectionSub}>
            {t('dashboardBuilder.widgetLibraryDesc', 'Toggle widgets on or off for your dashboard')}
          </Text>
          {WIDGET_DEFS.map((def) => {
            const cfg = config.widgets.find((w) => w.id === def.id);
            const enabled = cfg?.enabled ?? false;
            return (
              <View key={def.id} style={s.widgetRow}>
                <Text style={s.widgetIcon}>{def.icon}</Text>
                <View style={s.widgetInfo}>
                  <Text style={s.widgetName}>{def.name}</Text>
                  <Text style={s.widgetDesc}>{def.description}</Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={() => toggleWidget(def.id)}
                  trackColor={{ false: theme.surfaceLight, true: theme.primaryDark }}
                  thumbColor={enabled ? theme.primary : theme.textDim}
                  accessibilityLabel={`Toggle ${def.name}`}
                />
              </View>
            );
          })}
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('dashboardBuilder.preview', 'Live Preview')}</Text>
          <Text style={s.sectionSub}>
            {t(
              'dashboardBuilder.previewDesc',
              `${enabledWidgets.length} widgets enabled — ${config.columns} column${config.columns === 2 ? 's' : ''}`,
            )}
          </Text>
          {enabledWidgets.length === 0 ? (
            <View style={s.emptyPreview}>
              <Text style={s.emptyText}>
                {t('dashboardBuilder.empty', 'No widgets enabled. Toggle some on above.')}
              </Text>
            </View>
          ) : (
            <View style={s.previewGrid}>
              {enabledWidgets.map((w) => {
                const def = WIDGET_DEFS.find((d) => d.id === w.id);
                const mock = MOCK_DATA[w.id];
                const cardWidth =
                  config.columns === 1
                    ? '100%'
                    : enabledWidgets.length === 1
                      ? '100%'
                      : `${50 - 1}%`;
                return (
                  <View
                    key={w.id}
                    style={[
                      s.previewCard,
                      {
                        width: cardWidth as unknown as number,
                        minHeight: config.compact ? 70 : 90,
                      },
                    ]}
                  >
                    <View style={s.previewHeader}>
                      <Text style={s.previewTitle}>
                        {def?.icon} {def?.name}
                      </Text>
                      <Pressable
                        style={s.removeBtn}
                        onPress={() => removeWidget(w.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${def?.name}`}
                      >
                        <Text style={s.removeBtnText}>X</Text>
                      </Pressable>
                    </View>
                    {mock?.lines.map((line, i) => (
                      <Text key={i} style={s.previewLine}>
                        {line}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={s.btnRow}>
        <Pressable
          style={s.resetBtn}
          onPress={handleReset}
          accessibilityRole="button"
          accessibilityLabel="Reset to defaults"
        >
          <Text style={s.resetBtnText}>{t('dashboardBuilder.reset', 'Reset')}</Text>
        </Pressable>
        <Pressable
          style={[s.saveBtn, !hasChanges && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!hasChanges}
          accessibilityRole="button"
          accessibilityLabel="Save dashboard layout"
        >
          <Text style={s.btnText}>{t('dashboardBuilder.save', 'Save Layout')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
