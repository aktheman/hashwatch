import { useEffect, useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useNotificationSettingsStore } from '../store/notificationSettings';
import { requestNotificationPermission } from '../services/notifications';
import { getProfitAlertSettings, setProfitAlertSettings } from '../services/profitAlerts';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import * as haptic from '../utils/haptics';

const THRESHOLD_PRESETS = {
  tempWarning: { min: 50, max: 90, step: 1, unit: '°C' },
  tempCritical: { min: 70, max: 100, step: 1, unit: '°C' },
  hashrateDropPercent: { min: 10, max: 90, step: 5, unit: '%' },
  offlineTimeoutMin: { min: 1, max: 30, step: 1, unit: 'min' },
} as const;

const PROFIT_DROP_PRESETS = [3, 5, 10, 15];

function ThresholdControl({
  label,
  value,
  presets,
  theme,
  onChange,
}: {
  label: string;
  value: number;
  presets: { min: number; max: number; step: number; unit: string };
  theme: ReturnType<typeof useTheme>;
  onChange: (v: number) => void;
}) {
  const steps: number[] = [];
  for (let v = presets.min; v <= presets.max; v += presets.step) {
    steps.push(v);
  }

  return (
    <View style={[styles.thresholdRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.thresholdLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.thresholdValue, { color: theme.primary }]}>
        {value}
        {presets.unit}
      </Text>
      <View style={styles.presetRow}>
        {steps.map((stepVal) => (
          <Pressable
            key={stepVal}
            accessibilityRole="button"
            accessibilityLabel={`Set ${label} to ${stepVal}${presets.unit}`}
            style={[
              styles.presetChip,
              {
                backgroundColor: value === stepVal ? theme.primary : theme.surfaceLight,
                borderColor: value === stepVal ? theme.primary : theme.border,
              },
            ]}
            onPress={() => {
              haptic.selection();
              onChange(stepVal);
            }}
          >
            <Text
              style={{
                color: value === stepVal ? '#FFF' : theme.text,
                fontSize: fontSize.xs,
                fontWeight: fontWeight.semibold,
              }}
            >
              {stepVal}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    thresholds,
    channels,
    quietHoursStart,
    quietHoursEnd,
    loaded,
    loadSettings,
    updateThresholds,
    toggleChannel,
    setQuietHours,
  } = useNotificationSettingsStore();

  const [profitEnabled, setProfitEnabled] = useState(false);
  const [profitDrop, setProfitDrop] = useState(5);
  const [profitLoaded, setProfitLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
    getProfitAlertSettings().then((s) => {
      setProfitEnabled(s.enabled);
      setProfitDrop(s.dropPercent);
      setProfitLoaded(true);
    });
  }, []);

  const handleProfitToggle = useCallback(
    (enabled: boolean) => {
      haptic.selection();
      setProfitEnabled(enabled);
      void setProfitAlertSettings({ enabled, dropPercent: profitDrop });
    },
    [profitDrop],
  );

  const handleProfitDropChange = useCallback(
    (v: number) => {
      haptic.selection();
      setProfitDrop(v);
      void setProfitAlertSettings({ enabled: profitEnabled, dropPercent: v });
    },
    [profitEnabled],
  );

  const handleTestNotification = useCallback(async () => {
    haptic.medium();
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
        t('notificationSettings.permissionDenied'),
        t('notificationSettings.permissionDeniedBody'),
      );
      return;
    }
    const { sendMinerAlert } = await import('../services/notifications');
    await sendMinerAlert(
      { id: 'test', name: 'Test Miner', ip: '192.168.1.1', port: 80, isOnline: true },
      'offline',
      thresholds,
    );
    Alert.alert(t('notificationSettings.testSent'), t('notificationSettings.testSentBody'));
  }, [thresholds, t]);

  if (!loaded || !profitLoaded) return null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.text }]}>{t('notificationSettings.title')}</Text>

      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textDim }]}>
          {t('notificationSettings.thresholds')}
        </Text>

        <ThresholdControl
          label={t('notificationSettings.tempWarning')}
          value={thresholds.tempWarning}
          presets={THRESHOLD_PRESETS.tempWarning}
          theme={theme}
          onChange={(v) => updateThresholds({ tempWarning: v })}
        />
        <ThresholdControl
          label={t('notificationSettings.tempCritical')}
          value={thresholds.tempCritical}
          presets={THRESHOLD_PRESETS.tempCritical}
          theme={theme}
          onChange={(v) => updateThresholds({ tempCritical: v })}
        />
        <ThresholdControl
          label={t('notificationSettings.hashrateDrop')}
          value={thresholds.hashrateDropPercent}
          presets={THRESHOLD_PRESETS.hashrateDropPercent}
          theme={theme}
          onChange={(v) => updateThresholds({ hashrateDropPercent: v })}
        />
        <ThresholdControl
          label={t('notificationSettings.offlineTimeout')}
          value={thresholds.offlineTimeoutMin}
          presets={THRESHOLD_PRESETS.offlineTimeoutMin}
          theme={theme}
          onChange={(v) => updateThresholds({ offlineTimeoutMin: v })}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textDim }]}>
          {t('notificationSettings.profitTitle')}
        </Text>
        <Text style={[styles.quietDesc, { color: theme.textMuted }]}>
          {t('notificationSettings.profitDesc')}
        </Text>
        <View style={[styles.channelRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.channelLabel, { color: theme.text }]}>
            {t('notificationSettings.profitToggle')}
          </Text>
          <Switch
            value={profitEnabled}
            onValueChange={handleProfitToggle}
            trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
            thumbColor={profitEnabled ? theme.primary : theme.textMuted}
            accessibilityLabel="profitability price alert toggle"
          />
        </View>
        <ThresholdControl
          label={t('notificationSettings.profitDrop')}
          value={profitDrop}
          presets={{
            min: PROFIT_DROP_PRESETS[0],
            max: PROFIT_DROP_PRESETS[PROFIT_DROP_PRESETS.length - 1],
            step: 1,
            unit: '%',
          }}
          theme={theme}
          onChange={handleProfitDropChange}
        />
        <View style={styles.presetRow}>
          {PROFIT_DROP_PRESETS.map((stepVal) => (
            <Pressable
              key={stepVal}
              accessibilityRole="button"
              accessibilityLabel={`Set price drop threshold to ${stepVal}%`}
              style={[
                styles.presetChip,
                {
                  backgroundColor: profitDrop === stepVal ? theme.primary : theme.surfaceLight,
                  borderColor: profitDrop === stepVal ? theme.primary : theme.border,
                },
              ]}
              onPress={() => handleProfitDropChange(stepVal)}
            >
              <Text
                style={{
                  color: profitDrop === stepVal ? '#FFF' : theme.text,
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {stepVal}%
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textDim }]}>
          {t('notificationSettings.channels')}
        </Text>
        {(['push', 'email', 'webhook'] as const).map((ch) => (
          <View key={ch} style={[styles.channelRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.channelLabel, { color: theme.text }]}>
              {t(`notificationSettings.channel_${ch}`)}
            </Text>
            <Switch
              value={channels[ch]}
              onValueChange={() => {
                haptic.selection();
                toggleChannel(ch);
              }}
              trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
              thumbColor={channels[ch] ? theme.primary : theme.textMuted}
              accessibilityLabel={`${ch} notifications toggle`}
            />
          </View>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textDim }]}>
          {t('notificationSettings.quietHours')}
        </Text>
        <Text style={[styles.quietDesc, { color: theme.textMuted }]}>
          {t('notificationSettings.quietHoursDesc')}
        </Text>

        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.timeLabel, { color: theme.textDim }]}>
              {t('notificationSettings.startTime')}
            </Text>
            <View style={styles.timeChips}>
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <Pressable
                  key={`s-${h}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Set quiet hours start to ${h}:00`}
                  style={[
                    styles.timeChip,
                    {
                      backgroundColor: quietHoursStart === h ? theme.primary : theme.surfaceLight,
                      borderColor: quietHoursStart === h ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => {
                    haptic.selection();
                    setQuietHours(h, quietHoursEnd);
                  }}
                >
                  <Text
                    style={{
                      color: quietHoursStart === h ? '#FFF' : theme.text,
                      fontSize: fontSize.xs,
                      fontWeight: fontWeight.semibold,
                    }}
                  >
                    {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.timeLabel, { color: theme.textDim }]}>
              {t('notificationSettings.endTime')}
            </Text>
            <View style={styles.timeChips}>
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <Pressable
                  key={`e-${h}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Set quiet hours end to ${h}:00`}
                  style={[
                    styles.timeChip,
                    {
                      backgroundColor: quietHoursEnd === h ? theme.primary : theme.surfaceLight,
                      borderColor: quietHoursEnd === h ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => {
                    haptic.selection();
                    setQuietHours(quietHoursStart, h);
                  }}
                >
                  <Text
                    style={{
                      color: quietHoursEnd === h ? '#FFF' : theme.text,
                      fontSize: fontSize.xs,
                      fontWeight: fontWeight.semibold,
                    }}
                  >
                    {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('notificationSettings.testNotification')}
        style={[styles.testBtn, { backgroundColor: theme.primary }]}
        onPress={handleTestNotification}
      >
        <Text style={styles.testBtnText}>{t('notificationSettings.testNotification')}</Text>
      </Pressable>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  title: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
    letterSpacing: -0.5,
  },
  section: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  thresholdRow: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  thresholdLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xxs,
  },
  thresholdValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
  },
  presetChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    borderWidth: 1,
    minWidth: 36,
    alignItems: 'center',
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  channelLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
  },
  quietDesc: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  timeRow: {
    marginBottom: spacing.md,
  },
  timeLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  timeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
  },
  timeChip: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    borderWidth: 1,
    minWidth: 32,
    alignItems: 'center',
  },
  testBtn: {
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  testBtnText: {
    color: '#FFF',
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
});
