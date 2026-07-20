import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, fontSize, fontWeight, radius } from '../utils/design';
import { getPublicDashboard } from '../api/client';
import {
  formatHashrate,
  formatTemperature,
  formatVoltage,
  formatPower,
  formatUptime,
  formatNumber,
} from '../utils/formatters';
import type { MinerSnapshot } from '../types';

interface PublicDashboardScreenProps {
  route: { params: { token: string } };
}

export function PublicDashboardScreen({ route }: PublicDashboardScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { token } = route.params;

  const [minerName, setMinerName] = useState('');
  const [snapshot, setSnapshot] = useState<MinerSnapshot | null>(null);
  const [createdAt, setCreatedAt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const data = await getPublicDashboard(token);
      setMinerName(data.minerName);
      setSnapshot(data.snapshot);
      setCreatedAt(data.createdAt);
      setLoaded(true);
    } catch {
      setError(t('common.error'));
      setLoaded(true);
    }
  }, [token, t]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        content: {
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        },
        header: {
          backgroundColor: theme.surface,
          borderRadius: radius.xxl,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          borderWidth: 1,
          borderColor: theme.border,
          alignItems: 'center',
          boxShadow: `0 4px 20px ${theme.glow}`,
        },
        headerBrand: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.extrabold,
          color: theme.primary,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: spacing.xs,
        },
        headerTitle: {
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
          color: theme.text,
          marginBottom: spacing.xxs,
        },
        headerSubtitle: {
          fontSize: fontSize.base,
          color: theme.textDim,
        },
        card: {
          backgroundColor: theme.surface,
          borderRadius: radius.xl,
          padding: spacing.md,
          marginBottom: spacing.sm,
          borderWidth: 1,
          borderColor: theme.border,
        },
        cardRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing.xs,
        },
        cardDivider: {
          height: 1,
          backgroundColor: theme.border,
        },
        cardLabel: {
          fontSize: fontSize.sm,
          color: theme.textDim,
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        cardValue: {
          fontSize: fontSize.base,
          color: theme.text,
          fontWeight: fontWeight.semibold,
          fontFamily: 'monospace',
        },
        errorContainer: {
          flex: 1,
          backgroundColor: theme.bg,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xxl,
        },
        errorText: {
          fontSize: fontSize.xl,
          color: theme.danger,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.md,
        },
        errorSubtext: {
          fontSize: fontSize.base,
          color: theme.textDim,
          textAlign: 'center',
        },
        lastUpdated: {
          fontSize: fontSize.xs,
          color: theme.textMuted,
          textAlign: 'center',
          marginTop: spacing.md,
        },
        sharedBy: {
          fontSize: fontSize.xs,
          color: theme.textMuted,
          textAlign: 'center',
          marginTop: spacing.xxs,
        },
      }),
    [theme],
  );

  if (error && loaded) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerBrand}>HashWatch</Text>
        <Text style={styles.headerTitle}>{minerName}</Text>
        {snapshot && <Text style={styles.headerSubtitle}>{t('publicDashboard.sharedBy')}</Text>}
      </View>

      {snapshot ? (
        <>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{t('minerDetail.hashrate')}</Text>
              <Text style={styles.cardValue}>
                {formatHashrate(snapshot.hashRate, snapshot.hashRateUnit)}
              </Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{t('minerDetail.boardTemp')}</Text>
              <Text
                style={[
                  styles.cardValue,
                  { color: snapshot.temperature > 70 ? theme.danger : theme.success },
                ]}
              >
                {formatTemperature(snapshot.temperature)}
              </Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{t('minerDetail.voltage')}</Text>
              <Text style={styles.cardValue}>{formatVoltage(snapshot.voltage)}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{t('minerDetail.power')}</Text>
              <Text style={styles.cardValue}>{formatPower(snapshot.power)}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{t('minerDetail.uptime')}</Text>
              <Text style={styles.cardValue}>{formatUptime(snapshot.uptimeSeconds)}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{t('minerDetail.accepted')}</Text>
              <Text style={styles.cardValue}>{formatNumber(snapshot.sharesAccepted)}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>{t('minerDetail.rejected')}</Text>
              <Text style={[styles.cardValue, { color: theme.danger }]}>
                {formatNumber(snapshot.sharesRejected)}
              </Text>
            </View>
          </View>

          <Text style={styles.lastUpdated}>
            {t('publicDashboard.lastUpdated')} {new Date(snapshot.timestamp).toLocaleString()}
          </Text>
          <Text style={styles.sharedBy}>
            {t('publicDashboard.sharedBy')} • {new Date(createdAt).toLocaleDateString()}
          </Text>
        </>
      ) : (
        loaded && (
          <View style={styles.card}>
            <Text style={[styles.cardLabel, { textAlign: 'center' }]}>
              {t('minerDetail.offline')}
            </Text>
          </View>
        )
      )}
    </ScrollView>
  );
}
