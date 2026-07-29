import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useMinerStore } from '../store/miners';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import {
  getAutomatedActionsSettings,
  saveAutomatedActionsSettings,
  checkAndRestartOfflineMiners,
  checkProfitabilityAndSwitch,
  getLastActionLog,
  AutomatedActionsSettings,
  AutomatedAction,
} from '../services/automatedActions';
import * as haptic from '../utils/haptics';

const ACTION_TYPE_ICONS: Record<AutomatedAction['type'], string> = {
  restart: '🔄',
  pool_switch: '⛏',
  group_assign: '🏷',
};

function formatActionTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AutomatedActionsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const miners = useMinerStore((s) => s.miners);

  const [settings, setSettings] = useState<AutomatedActionsSettings>({
    autoRestartEnabled: false,
    autoRestartDelayMinutes: 10,
    autoPoolSwitchEnabled: false,
    autoPoolSwitchThreshold: 5,
    autoGroupEnabled: false,
    maxRestartsPerHour: 3,
  });
  const [actionLog, setActionLog] = useState<AutomatedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [restartRunning, setRestartRunning] = useState(false);
  const [switchRunning, setSwitchRunning] = useState(false);
  const [lastPoolSwitchTime, setLastPoolSwitchTime] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [loadedSettings, log] = await Promise.all([
          getAutomatedActionsSettings(),
          getLastActionLog(),
        ]);
        if (!mounted) return;
        setSettings(loadedSettings);
        setActionLog(log);
        const lastSwitch = log.find((a) => a.type === 'pool_switch' && a.success);
        if (lastSwitch) setLastPoolSwitchTime(lastSwitch.timestamp);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AutomatedActionsSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await saveAutomatedActionsSettings(next);
    },
    [settings],
  );

  const handleToggleRestart = useCallback(
    (value: boolean) => {
      haptic.selection();
      updateSettings({ autoRestartEnabled: value });
    },
    [updateSettings],
  );

  const handleTogglePoolSwitch = useCallback(
    (value: boolean) => {
      haptic.selection();
      updateSettings({ autoPoolSwitchEnabled: value });
    },
    [updateSettings],
  );

  const handleDelayChange = useCallback(
    (minutes: number) => {
      haptic.selection();
      updateSettings({ autoRestartDelayMinutes: minutes });
    },
    [updateSettings],
  );

  const handleThresholdChange = useCallback(
    (threshold: number) => {
      haptic.selection();
      updateSettings({ autoPoolSwitchThreshold: threshold });
    },
    [updateSettings],
  );

  const handleRestartNow = useCallback(async () => {
    Alert.alert(
      t('automatedActions.restartNow', 'Restart Now'),
      t('automatedActions.restartNowConfirm', 'Send restart commands to offline miners?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('automatedActions.restart', 'Restart'),
          style: 'destructive',
          onPress: async () => {
            haptic.warning();
            setRestartRunning(true);
            try {
              const results = await checkAndRestartOfflineMiners(miners);
              const successCount = results.filter((r) => r.success).length;
              const failCount = results.length - successCount;
              if (results.length === 0) {
                Alert.alert(
                  t('automatedActions.noMiners', 'No Miners'),
                  t('automatedActions.noOfflineMiners', 'No offline miners found to restart.'),
                );
              } else {
                Alert.alert(
                  t('automatedActions.restartComplete', 'Restart Complete'),
                  t('automatedActions.restartSummary', {
                    success: successCount,
                    fail: failCount,
                    defaultValue: `Restarted: ${successCount}, Failed: ${failCount}`,
                  }),
                );
              }
              const log = await getLastActionLog();
              setActionLog(log);
            } catch {
              Alert.alert(
                t('common.error', 'Error'),
                t('automatedActions.restartError', 'Failed to restart miners.'),
              );
            } finally {
              setRestartRunning(false);
            }
          },
        },
      ],
    );
  }, [miners, t]);

  const handleManualSwitchCheck = useCallback(async () => {
    haptic.warning();
    setSwitchRunning(true);
    try {
      const results = await checkProfitabilityAndSwitch(miners);
      if (results.length === 0) {
        Alert.alert(
          t('automatedActions.noSwitchNeeded', 'No Switch Needed'),
          t(
            'automatedActions.noSwitchReason',
            'No miners need a pool switch based on current profitability.',
          ),
        );
      } else {
        const successCount = results.filter((r) => r.success).length;
        setLastPoolSwitchTime(Date.now());
        Alert.alert(
          t('automatedActions.switchComplete', 'Switch Complete'),
          t('automatedActions.switchSummary', {
            count: successCount,
            defaultValue: `Switched ${successCount} miner(s) to a more profitable pool.`,
          }),
        );
      }
      const log = await getLastActionLog();
      setActionLog(log);
    } catch {
      Alert.alert(
        t('common.error', 'Error'),
        t('automatedActions.switchError', 'Failed to check profitability.'),
      );
    } finally {
      setSwitchRunning(false);
    }
  }, [miners, t]);

  const restartDelays = [5, 10, 15, 20, 30, 45, 60];
  const thresholds = [1, 3, 5, 10, 15, 20, 30];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        scrollContent: {
          padding: spacing.md,
          paddingBottom: spacing.xxl,
        },
        title: {
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.lg,
        },
        sectionCard: {
          backgroundColor: theme.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        sectionHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
        },
        sectionTitle: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.bold,
        },
        sectionSubtitle: {
          color: theme.textDim,
          fontSize: fontSize.sm,
          marginBottom: spacing.sm,
        },
        toggleRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing.xs,
        },
        toggleLabel: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
        },
        toggleDescription: {
          color: theme.textMuted,
          fontSize: fontSize.xs,
          marginTop: 2,
        },
        sliderLabel: {
          color: theme.textDim,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          marginBottom: spacing.xs,
          marginTop: spacing.sm,
        },
        chipRow: {
          flexDirection: 'row',
          gap: spacing.xs,
          flexWrap: 'wrap',
        },
        chip: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
          borderWidth: 1,
          minWidth: 44,
          alignItems: 'center',
        },
        chipActive: {
          backgroundColor: theme.primary,
          borderColor: theme.primary,
        },
        chipInactive: {
          backgroundColor: theme.surfaceLight,
          borderColor: theme.border,
        },
        chipTextActive: {
          color: '#FFF',
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        chipTextInactive: {
          color: theme.text,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        actionButton: {
          backgroundColor: theme.primary,
          borderRadius: radius.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          alignItems: 'center',
          marginTop: spacing.sm,
        },
        actionButtonText: {
          color: '#FFF',
          fontSize: fontSize.base,
          fontWeight: fontWeight.bold,
        },
        actionButtonDisabled: {
          opacity: 0.5,
        },
        secondaryButton: {
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          alignItems: 'center',
          marginTop: spacing.sm,
          borderWidth: 1,
          borderColor: theme.border,
        },
        secondaryButtonText: {
          color: theme.primary,
          fontSize: fontSize.base,
          fontWeight: fontWeight.bold,
        },
        timestampRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: spacing.sm,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        },
        timestampLabel: {
          color: theme.textMuted,
          fontSize: fontSize.xs,
        },
        timestampValue: {
          color: theme.textDim,
          fontSize: fontSize.xs,
          marginLeft: spacing.xs,
        },
        logHeader: {
          color: theme.textDim,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: spacing.xs,
        },
        logEntry: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: theme.surface,
          borderRadius: radius.sm,
          padding: spacing.sm,
          marginBottom: spacing.xxs,
          borderWidth: 1,
          borderColor: theme.border,
        },
        logIcon: {
          width: spacing.xxl,
          alignItems: 'center',
          paddingTop: 2,
        },
        logContent: {
          flex: 1,
          marginLeft: spacing.xs,
        },
        logDetail: {
          color: theme.text,
          fontSize: fontSize.sm,
        },
        logMeta: {
          color: theme.textMuted,
          fontSize: fontSize.xs,
          marginTop: 2,
        },
        logStatusDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          marginTop: 4,
          marginLeft: spacing.xs,
        },
        logStatusSuccess: {
          backgroundColor: theme.success,
        },
        logStatusFailure: {
          backgroundColor: theme.danger,
        },
        emptyLogText: {
          color: theme.textMuted,
          fontSize: fontSize.sm,
          textAlign: 'center',
          paddingVertical: spacing.lg,
        },
        countBadge: {
          backgroundColor: theme.primary + '20',
          borderRadius: radius.sm,
          paddingHorizontal: spacing.xs,
          paddingVertical: 2,
        },
        countBadgeText: {
          color: theme.primary,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
        },
      }),
    [theme],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.scrollContent}>
          <Text style={styles.title}>{t('automatedActions.title', 'Automated Actions')}</Text>
          <Text style={styles.emptyLogText}>{t('common.loading', 'Loading...')}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      accessibilityLabel={t('automatedActions.screenLabel', 'Automated Actions screen')}
    >
      <Text style={styles.title}>{t('automatedActions.title', 'Automated Actions')}</Text>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t('automatedActions.autoRestart', 'Auto-Restart')}
          </Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          {t(
            'automatedActions.autoRestartDesc',
            'Automatically restart miners that go offline after a delay.',
          )}
        </Text>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>
              {t('automatedActions.enableAutoRestart', 'Enable Auto-Restart')}
            </Text>
            <Text style={styles.toggleDescription}>
              {t('automatedActions.autoRestartToggleDesc', 'Restart offline miners automatically')}
            </Text>
          </View>
          <Switch
            value={settings.autoRestartEnabled}
            onValueChange={handleToggleRestart}
            trackColor={{ false: theme.border, true: theme.primary + '60' }}
            thumbColor={settings.autoRestartEnabled ? theme.primary : theme.textMuted}
            accessibilityLabel={t('automatedActions.toggleAutoRestart', 'Toggle auto-restart')}
          />
        </View>

        <Text style={styles.sliderLabel}>
          {t('automatedActions.restartDelay', 'Restart Delay')}: {settings.autoRestartDelayMinutes}{' '}
          min
        </Text>
        <View style={styles.chipRow}>
          {restartDelays.map((delay) => (
            <Pressable
              key={delay}
              style={[
                styles.chip,
                settings.autoRestartDelayMinutes === delay
                  ? styles.chipActive
                  : styles.chipInactive,
              ]}
              onPress={() => handleDelayChange(delay)}
              accessibilityRole="button"
              accessibilityLabel={t('automatedActions.delayMinutes', {
                minutes: delay,
                defaultValue: `${delay} minutes`,
              })}
              accessibilityState={{ selected: settings.autoRestartDelayMinutes === delay }}
            >
              <Text
                style={
                  settings.autoRestartDelayMinutes === delay
                    ? styles.chipTextActive
                    : styles.chipTextInactive
                }
              >
                {delay}m
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.actionButton, restartRunning && styles.actionButtonDisabled]}
          onPress={handleRestartNow}
          disabled={restartRunning}
          accessibilityRole="button"
          accessibilityLabel={t('automatedActions.restartNowLabel', 'Restart offline miners now')}
        >
          <Text style={styles.actionButtonText}>
            {restartRunning
              ? t('automatedActions.restarting', 'Restarting...')
              : t('automatedActions.restartNow', 'Restart Now')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t('automatedActions.autoPoolSwitch', 'Auto-Pool-Switch')}
          </Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          {t(
            'automatedActions.autoPoolSwitchDesc',
            'Automatically switch miners to more profitable pools when the threshold is met.',
          )}
        </Text>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>
              {t('automatedActions.enablePoolSwitch', 'Enable Auto-Pool-Switch')}
            </Text>
            <Text style={styles.toggleDescription}>
              {t('automatedActions.poolSwitchToggleDesc', 'Switch pools based on profitability')}
            </Text>
          </View>
          <Switch
            value={settings.autoPoolSwitchEnabled}
            onValueChange={handleTogglePoolSwitch}
            trackColor={{ false: theme.border, true: theme.primary + '60' }}
            thumbColor={settings.autoPoolSwitchEnabled ? theme.primary : theme.textMuted}
            accessibilityLabel={t('automatedActions.togglePoolSwitch', 'Toggle auto-pool-switch')}
          />
        </View>

        <Text style={styles.sliderLabel}>
          {t('automatedActions.profitThreshold', 'Profitability Threshold')}:{' '}
          {settings.autoPoolSwitchThreshold}%
        </Text>
        <View style={styles.chipRow}>
          {thresholds.map((thresh) => (
            <Pressable
              key={thresh}
              style={[
                styles.chip,
                settings.autoPoolSwitchThreshold === thresh
                  ? styles.chipActive
                  : styles.chipInactive,
              ]}
              onPress={() => handleThresholdChange(thresh)}
              accessibilityRole="button"
              accessibilityLabel={t('automatedActions.thresholdPercent', {
                percent: thresh,
                defaultValue: `${thresh} percent threshold`,
              })}
              accessibilityState={{ selected: settings.autoPoolSwitchThreshold === thresh }}
            >
              <Text
                style={
                  settings.autoPoolSwitchThreshold === thresh
                    ? styles.chipTextActive
                    : styles.chipTextInactive
                }
              >
                {thresh}%
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.secondaryButton, switchRunning && styles.actionButtonDisabled]}
          onPress={handleManualSwitchCheck}
          disabled={switchRunning}
          accessibilityRole="button"
          accessibilityLabel={t(
            'automatedActions.checkNowLabel',
            'Check profitability and switch now',
          )}
        >
          <Text style={styles.secondaryButtonText}>
            {switchRunning
              ? t('automatedActions.checking', 'Checking...')
              : t('automatedActions.checkAndSwitch', 'Check & Switch Now')}
          </Text>
        </Pressable>

        <View style={styles.timestampRow}>
          <Text style={styles.timestampLabel}>
            {t('automatedActions.lastSwitch', 'Last Switch')}:
          </Text>
          <Text style={styles.timestampValue}>
            {lastPoolSwitchTime
              ? formatActionTimestamp(lastPoolSwitchTime)
              : t('automatedActions.never', 'Never')}
          </Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('automatedActions.actionLog', 'Action Log')}</Text>
          {actionLog.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{actionLog.length}</Text>
            </View>
          )}
        </View>

        {actionLog.length === 0 ? (
          <Text style={styles.emptyLogText}>
            {t('automatedActions.noActions', 'No automated actions recorded yet.')}
          </Text>
        ) : (
          actionLog.map((action) => (
            <View
              key={action.id}
              style={styles.logEntry}
              accessibilityLabel={t('automatedActions.logEntryLabel', {
                type: action.type,
                miner: action.minerName,
                success: action.success,
                defaultValue: `${action.type} action on ${action.minerName}: ${action.success ? 'success' : 'failure'}`,
              })}
            >
              <View style={styles.logIcon}>
                <Text style={{ fontSize: fontSize.lg }}>
                  {ACTION_TYPE_ICONS[action.type] ?? '📋'}
                </Text>
              </View>
              <View style={styles.logContent}>
                <Text style={styles.logDetail}>{action.details}</Text>
                <Text style={styles.logMeta}>
                  {formatActionTimestamp(action.timestamp)}
                  {' · '}
                  {action.minerName || action.minerId || t('automatedActions.system', 'System')}
                </Text>
              </View>
              <View
                style={[
                  styles.logStatusDot,
                  action.success ? styles.logStatusSuccess : styles.logStatusFailure,
                ]}
              />
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
