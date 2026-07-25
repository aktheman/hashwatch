import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMinerStore } from '../store/miners';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight, headerBar, headerTitle } from '../utils/design';
import { getSnapshots } from '../db/database';
import {
  forecastUptime,
  generateMaintenanceSchedule,
  checkWeatherAlerts,
} from '../utils/predictiveMaintenance';
import type { UptimeForecast, MaintenanceTask, WeatherAlert } from '../utils/predictiveMaintenance';
import * as haptics from '../utils/haptics';

function getRelativeDate(dueDate: number): string {
  const now = Date.now();
  const diffMs = dueDate - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'overdue by 1 day';
  if (diffDays > 0) return `in ${diffDays} days`;
  return `overdue by ${Math.abs(diffDays)} days`;
}

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function PredictiveMaintenanceScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);

  const [refreshing, setRefreshing] = useState(false);
  const [forecasts, setForecasts] = useState<UptimeForecast[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [temperature, setTemperature] = useState(28);
  const [humidity, setHumidity] = useState(65);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);

  const loadData = useCallback(async () => {
    const allTasks: MaintenanceTask[] = [];
    const allForecasts: UptimeForecast[] = [];

    for (const miner of miners) {
      const snapshots = await getSnapshots(miner.id, 100);
      if (snapshots.length > 0) {
        allForecasts.push(forecastUptime(snapshots));
        const tasks = generateMaintenanceSchedule(miner.id, snapshots);
        tasks.forEach((t) =>
          allTasks.push({ ...t, id: `${miner.id}-${t.type}`, createdAt: Date.now() }),
        );
      }
    }

    allTasks.sort((a, b) => {
      const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pDiff !== 0) return pDiff;
      return a.dueDate - b.dueDate;
    });

    setForecasts(allForecasts);
    setMaintenanceTasks(allTasks);
    setWeatherAlerts(checkWeatherAlerts(temperature, humidity));
  }, [miners, temperature, humidity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const pendingTasks = useMemo(
    () => maintenanceTasks.filter((t) => t.status === 'pending'),
    [maintenanceTasks],
  );
  const overdueCount = useMemo(
    () => pendingTasks.filter((t) => t.dueDate < Date.now()).length,
    [pendingTasks],
  );
  const avgUptime = useMemo(() => {
    if (forecasts.length === 0) return 0;
    return forecasts.reduce((s, f) => s + f.predictedUptime30d, 0) / forecasts.length;
  }, [forecasts]);

  const handleCompleteTask = useCallback((taskId: string) => {
    haptics.success();
    setMaintenanceTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: 'completed', completedDate: Date.now() } : t,
      ),
    );
  }, []);

  const handleSkipTask = useCallback((taskId: string) => {
    haptics.selection();
    Alert.alert('Skip Task', 'Are you sure you want to skip this maintenance task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip',
        style: 'destructive',
        onPress: () => {
          setMaintenanceTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: 'skipped' } : t)),
          );
        },
      },
    ]);
  }, []);

  const getSeverityColor = (severity: string) => {
    if (severity === 'info') return theme.info;
    if (severity === 'warning') return theme.warning;
    return theme.danger;
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'critical') return theme.danger;
    if (priority === 'high') return theme.warning;
    if (priority === 'medium') return theme.info;
    return theme.textMuted;
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime > 95) return theme.success;
    if (uptime > 85) return theme.warning;
    return theme.danger;
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { ...headerBar },
    title: { ...headerTitle, color: theme.text },
    content: { padding: spacing.md, paddingBottom: spacing.xxl * 2 },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: theme.text,
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    summaryValue: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
    },
    summaryLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
      color: theme.textDim,
      marginTop: spacing.xxs,
    },
    weatherControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    weatherLabel: {
      fontSize: fontSize.base,
      color: theme.textDim,
      fontWeight: fontWeight.semibold,
      minWidth: 90,
    },
    weatherBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weatherBtnText: {
      fontSize: fontSize.lg,
      color: theme.text,
      fontWeight: fontWeight.bold,
    },
    weatherValue: {
      fontSize: fontSize.md,
      color: theme.text,
      fontWeight: fontWeight.semibold,
      minWidth: 50,
      textAlign: 'center' as const,
    },
    alertCard: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.sm,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    alertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xxs,
    },
    severityBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
      borderRadius: radius.xs,
    },
    severityText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: '#FFF',
      textTransform: 'uppercase' as const,
    },
    alertTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: theme.text,
      flex: 1,
    },
    alertDesc: {
      fontSize: fontSize.base,
      color: theme.textDim,
      lineHeight: 18,
    },
    alertExpiry: {
      fontSize: fontSize.xs,
      color: theme.textMuted,
      marginTop: spacing.xxs,
    },
    forecastCard: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.sm,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    forecastName: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: theme.text,
      marginBottom: spacing.xs,
    },
    uptimeBarBg: {
      height: 8,
      borderRadius: radius.xs,
      backgroundColor: theme.surfaceLight,
      overflow: 'hidden',
      marginBottom: spacing.xs,
    },
    uptimeBarFill: {
      height: 8,
      borderRadius: radius.xs,
    },
    forecastStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    forecastStat: {
      fontSize: fontSize.sm,
      color: theme.textDim,
    },
    forecastStatValue: {
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    confidenceLabel: {
      fontSize: fontSize.xs,
      color: theme.textMuted,
    },
    riskFactors: {
      marginTop: spacing.xxs,
    },
    riskFactor: {
      fontSize: fontSize.sm,
      color: theme.warning,
    },
    taskCard: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.sm,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    taskHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xxs,
    },
    priorityBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
      borderRadius: radius.xs,
    },
    priorityText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: '#FFF',
      textTransform: 'uppercase' as const,
    },
    taskTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: theme.text,
      flex: 1,
    },
    taskDesc: {
      fontSize: fontSize.base,
      color: theme.textDim,
      marginBottom: spacing.xxs,
      lineHeight: 18,
    },
    taskMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    taskMetaText: {
      fontSize: fontSize.sm,
      color: theme.textDim,
    },
    taskDate: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
    },
    taskActions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      alignItems: 'center',
    },
    actionBtnText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
    },
    emptyText: {
      fontSize: fontSize.md,
      color: theme.textMuted,
      textAlign: 'center' as const,
      paddingVertical: spacing.xl,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('maintenance.title', 'Predictive Maintenance')}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: theme.primary }]}>
            <Text style={styles.summaryValue}>{pendingTasks.length}</Text>
            <Text style={styles.summaryLabel}>{t('maintenance.pending', 'Pending')}</Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { borderColor: overdueCount > 0 ? theme.danger : theme.border },
            ]}
          >
            <Text
              style={[styles.summaryValue, { color: overdueCount > 0 ? theme.danger : theme.text }]}
            >
              {overdueCount}
            </Text>
            <Text style={styles.summaryLabel}>{t('maintenance.overdue', 'Overdue')}</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: getUptimeColor(avgUptime) }]}>
            <Text style={[styles.summaryValue, { color: getUptimeColor(avgUptime) }]}>
              {avgUptime > 0 ? `${avgUptime.toFixed(1)}%` : '--'}
            </Text>
            <Text style={styles.summaryLabel}>{t('maintenance.avgUptime', 'Avg Uptime')}</Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { borderColor: weatherAlerts.length > 0 ? theme.warning : theme.border },
            ]}
          >
            <Text
              style={[
                styles.summaryValue,
                { color: weatherAlerts.length > 0 ? theme.warning : theme.text },
              ]}
            >
              {weatherAlerts.length}
            </Text>
            <Text style={styles.summaryLabel}>{t('maintenance.weatherAlerts', 'Alerts')}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {t('maintenance.weatherSection', 'Weather Simulation')}
        </Text>
        <View style={styles.weatherControls}>
          <Text style={styles.weatherLabel}>Temperature</Text>
          <Pressable
            style={styles.weatherBtn}
            onPress={() => {
              haptics.selection();
              setTemperature((p) => p - 1);
            }}
          >
            <Text style={styles.weatherBtnText}>-</Text>
          </Pressable>
          <Text style={styles.weatherValue}>{temperature}°C</Text>
          <Pressable
            style={styles.weatherBtn}
            onPress={() => {
              haptics.selection();
              setTemperature((p) => p + 1);
            }}
          >
            <Text style={styles.weatherBtnText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.weatherControls}>
          <Text style={styles.weatherLabel}>Humidity</Text>
          <Pressable
            style={styles.weatherBtn}
            onPress={() => {
              haptics.selection();
              setHumidity((p) => Math.max(0, p - 5));
            }}
          >
            <Text style={styles.weatherBtnText}>-</Text>
          </Pressable>
          <Text style={styles.weatherValue}>{humidity}%</Text>
          <Pressable
            style={styles.weatherBtn}
            onPress={() => {
              haptics.selection();
              setHumidity((p) => Math.min(100, p + 5));
            }}
          >
            <Text style={styles.weatherBtnText}>+</Text>
          </Pressable>
        </View>

        {weatherAlerts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {t('maintenance.activeAlerts', 'Active Weather Alerts')}
            </Text>
            {weatherAlerts.map((alert) => (
              <View key={alert.id} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(alert.severity) },
                    ]}
                  >
                    <Text style={styles.severityText}>{alert.severity}</Text>
                  </View>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                </View>
                <Text style={styles.alertDesc}>{alert.description}</Text>
                <Text style={styles.alertExpiry}>
                  Expires: {new Date(alert.expiresAt).toLocaleString()}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>
          {t('maintenance.uptimeForecast', 'Uptime Forecast')}
        </Text>
        {forecasts.length === 0 ? (
          <Text style={styles.emptyText}>
            {t('maintenance.noForecastData', 'No miner data available for forecasting')}
          </Text>
        ) : (
          forecasts.map((forecast) => {
            const minerName =
              miners.find((m) => m.id === forecast.minerId)?.name || forecast.minerId;
            return (
              <View key={forecast.minerId} style={styles.forecastCard}>
                <Text style={styles.forecastName}>{minerName}</Text>
                <View style={styles.uptimeBarBg}>
                  <View
                    style={[
                      styles.uptimeBarFill,
                      {
                        width: `${Math.min(100, forecast.predictedUptime30d)}%`,
                        backgroundColor: getUptimeColor(forecast.predictedUptime30d),
                      },
                    ]}
                  />
                </View>
                <View style={styles.forecastStats}>
                  <Text style={styles.forecastStat}>
                    <Text style={styles.forecastStatValue}>{forecast.predictedUptime30d}%</Text>{' '}
                    uptime
                  </Text>
                  <Text style={styles.forecastStat}>
                    <Text style={styles.forecastStatValue}>{forecast.predictedDowntimeHours}h</Text>{' '}
                    downtime
                  </Text>
                  <Text style={styles.confidenceLabel}>
                    Confidence:{' '}
                    <Text style={{ color: theme.text, fontWeight: fontWeight.bold }}>
                      {Math.round(forecast.confidence * 100)}%
                    </Text>
                  </Text>
                </View>
                {forecast.riskFactors.length > 0 && (
                  <View style={styles.riskFactors}>
                    {forecast.riskFactors.map((rf, i) => (
                      <Text key={i} style={styles.riskFactor}>
                        - {rf.factor} ({rf.impact.toFixed(1)}% impact)
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.sectionTitle}>{t('maintenance.schedule', 'Maintenance Schedule')}</Text>
        {pendingTasks.length === 0 ? (
          <Text style={styles.emptyText}>
            {t('maintenance.noTasks', 'No pending maintenance tasks')}
          </Text>
        ) : (
          pendingTasks.map((task) => {
            const minerName = miners.find((m) => m.id === task.minerId)?.name || task.minerId;
            const isOverdue = task.dueDate < Date.now();
            return (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityColor(task.priority) },
                    ]}
                  >
                    <Text style={styles.priorityText}>{task.priority}</Text>
                  </View>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                </View>
                <Text style={styles.taskDesc}>{task.description}</Text>
                <View style={styles.taskMeta}>
                  <Text style={styles.taskMetaText}>{minerName}</Text>
                  <Text
                    style={[styles.taskDate, { color: isOverdue ? theme.danger : theme.textDim }]}
                  >
                    {getRelativeDate(task.dueDate)}
                  </Text>
                </View>
                <View style={styles.taskMeta}>
                  <Text style={styles.taskMetaText}>{task.estimatedDuration} min</Text>
                  <Text style={styles.taskMetaText}>
                    {task.estimatedCost > 0 ? `$${task.estimatedCost.toFixed(2)}` : 'No cost'}
                  </Text>
                </View>
                <View style={styles.taskActions}>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: theme.success }]}
                    onPress={() => handleCompleteTask(task.id)}
                  >
                    <Text style={[styles.actionBtnText, { color: '#FFF' }]}>
                      {t('maintenance.complete', 'Complete')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: theme.surfaceLight,
                        borderWidth: 1,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => handleSkipTask(task.id)}
                  >
                    <Text style={[styles.actionBtnText, { color: theme.textDim }]}>
                      {t('maintenance.skip', 'Skip')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
