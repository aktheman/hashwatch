import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useMinerStore } from '../store/miners';
import { WidgetPreview } from '../components/WidgetPreview';
import {
  prepareWidgetData,
  saveWidgetData,
  loadWidgetData,
  WidgetData,
} from '../services/widgetData';
import { getConfig, setConfig } from '../stubs/expo-widget';
import { WidgetSize, WidgetTheme, WIDGET_SIZE_LABELS } from '../types/widget';
import { NavigationProp } from '../types';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import * as haptic from '../utils/haptics';

export function WidgetConfigScreen({ navigation: _navigation }: { navigation: NavigationProp }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const config = getConfig();
  const [size, setSize] = useState<WidgetSize>(config.size);
  const [showHashrate, setShowHashrate] = useState(config.showHashrate);
  const [showOnlineCount, setShowOnlineCount] = useState(config.showOnlineCount);
  const [showAvgTemp, setShowAvgTemp] = useState(config.showAvgTemp);
  const [showFleetHealth, setShowFleetHealth] = useState(config.showFleetHealth);
  const [showAlertCount, setShowAlertCount] = useState(config.showAlertCount);
  const [widgetTheme, setWidgetTheme] = useState<WidgetTheme>(config.theme);
  const [previewData, setPreviewData] = useState<WidgetData | null>(null);

  useEffect(() => {
    loadWidgetData().then(setPreviewData);
  }, []);

  const refreshPreview = useCallback(async () => {
    const data = await prepareWidgetData(miners);
    await saveWidgetData(data);
    setPreviewData(data);
  }, [miners]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  const handleSave = useCallback(() => {
    haptic.success();
    setConfig({
      size,
      showHashrate,
      showOnlineCount,
      showAvgTemp,
      showFleetHealth,
      showAlertCount,
      theme: widgetTheme,
    });
    Alert.alert(
      t('widgetConfig.saved', 'Configuration Saved'),
      t('widgetConfig.savedBody', 'Widget settings saved. Add the widget from your home screen.'),
    );
  }, [
    size,
    showHashrate,
    showOnlineCount,
    showAvgTemp,
    showFleetHealth,
    showAlertCount,
    widgetTheme,
    t,
  ]);

  const handleAddWidget = useCallback(() => {
    haptic.medium();
    Alert.alert(
      t('widgetConfig.addWidget', 'Add Widget'),
      t(
        'widgetConfig.addWidgetBody',
        'To add the widget to your home screen:\n\niOS: Long-press home screen → tap + → search HashWatch\n\nAndroid: Long-press home screen → Widgets → HashWatch',
      ),
    );
  }, [t]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
      padding: spacing.md,
    },
    title: {
      color: theme.text,
      fontSize: fontSize.h3,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.lg,
      marginTop: spacing.xs,
      letterSpacing: -0.5,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      color: theme.textDim,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: spacing.xs,
      marginLeft: spacing.xxs,
    },
    sizeRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    sizeBtn: {
      flex: 1,
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: 'center',
      borderWidth: 1.5,
    },
    sizeLabel: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
    },
    sizeSub: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      marginTop: spacing.xxs,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.surface,
      padding: spacing.md,
      borderRadius: radius.lg,
      marginBottom: 2,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rowLabel: {
      color: theme.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      flex: 1,
    },
    themeRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    themeBtn: {
      flex: 1,
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: 'center',
      borderWidth: 1.5,
    },
    previewSection: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    previewLabel: {
      color: theme.textDim,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
    },
    btn: {
      backgroundColor: theme.primary,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    btnText: {
      color: '#FFF',
      fontWeight: fontWeight.bold,
      fontSize: fontSize.md,
    },
    secondaryBtn: {
      backgroundColor: theme.surfaceLight,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
      marginTop: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryBtnText: {
      color: theme.text,
      fontWeight: fontWeight.semibold,
      fontSize: fontSize.md,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('widgetConfig.title', 'Widget Configuration')}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('widgetConfig.widgetSize', 'Widget Size')}</Text>
        <View style={styles.sizeRow}>
          {(['small', 'medium', 'large'] as WidgetSize[]).map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={`Select ${s} widget size`}
              style={[
                styles.sizeBtn,
                {
                  backgroundColor: size === s ? theme.primary : theme.surfaceLight,
                  borderColor: size === s ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                haptic.selection();
                setSize(s);
              }}
            >
              <Text style={[styles.sizeLabel, { color: size === s ? '#FFF' : theme.text }]}>
                {t(`widgetConfig.size_${s}`, WIDGET_SIZE_LABELS[s])}
              </Text>
              <Text
                style={[
                  styles.sizeSub,
                  { color: size === s ? 'rgba(255,255,255,0.8)' : theme.textDim },
                ]}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('widgetConfig.dataToShow', 'Data to Show')}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('widgetConfig.showHashrate', 'Total Hashrate')}</Text>
          <Switch
            value={showHashrate}
            onValueChange={setShowHashrate}
            trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
            thumbColor={showHashrate ? theme.primary : theme.textMuted}
            accessibilityLabel="Toggle hashrate display"
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('widgetConfig.showOnlineCount', 'Online Count')}</Text>
          <Switch
            value={showOnlineCount}
            onValueChange={setShowOnlineCount}
            trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
            thumbColor={showOnlineCount ? theme.primary : theme.textMuted}
            accessibilityLabel="Toggle online count display"
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>
            {t('widgetConfig.showAvgTemp', 'Average Temperature')}
          </Text>
          <Switch
            value={showAvgTemp}
            onValueChange={setShowAvgTemp}
            trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
            thumbColor={showAvgTemp ? theme.primary : theme.textMuted}
            accessibilityLabel="Toggle average temperature display"
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>
            {t('widgetConfig.showFleetHealth', 'Fleet Health Grade')}
          </Text>
          <Switch
            value={showFleetHealth}
            onValueChange={setShowFleetHealth}
            trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
            thumbColor={showFleetHealth ? theme.primary : theme.textMuted}
            accessibilityLabel="Toggle fleet health grade display"
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('widgetConfig.showAlertCount', 'Alert Count')}</Text>
          <Switch
            value={showAlertCount}
            onValueChange={setShowAlertCount}
            trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
            thumbColor={showAlertCount ? theme.primary : theme.textMuted}
            accessibilityLabel="Toggle alert count display"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('widgetConfig.widgetTheme', 'Widget Theme')}</Text>
        <View style={styles.themeRow}>
          {(['auto', 'light', 'dark'] as WidgetTheme[]).map((th) => (
            <Pressable
              key={th}
              accessibilityRole="button"
              accessibilityLabel={`Select ${th} widget theme`}
              style={[
                styles.themeBtn,
                {
                  backgroundColor: widgetTheme === th ? theme.primary : theme.surfaceLight,
                  borderColor: widgetTheme === th ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                haptic.selection();
                setWidgetTheme(th);
              }}
            >
              <Text style={[styles.sizeLabel, { color: widgetTheme === th ? '#FFF' : theme.text }]}>
                {t(`widgetConfig.theme_${th}`, th.charAt(0).toUpperCase() + th.slice(1))}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.previewLabel}>{t('widgetConfig.preview', 'Preview')}</Text>
        <View style={styles.previewSection}>
          <WidgetPreview size={size} data={previewData} />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('widgetConfig.addWidget', 'Add Widget')}
        style={styles.btn}
        onPress={handleAddWidget}
      >
        <Text style={styles.btnText}>{t('widgetConfig.addWidget', 'Add Widget')}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('widgetConfig.saveConfig', 'Save Configuration')}
        style={styles.secondaryBtn}
        onPress={handleSave}
      >
        <Text style={styles.secondaryBtnText}>
          {t('widgetConfig.saveConfig', 'Save Configuration')}
        </Text>
      </Pressable>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}
