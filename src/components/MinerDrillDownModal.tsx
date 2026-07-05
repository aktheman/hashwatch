import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Miner } from '../types';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight, cardShadow } from '../utils/design';
import { toHashesPerSecond, formatHashrateValue } from '../utils/hashrate';
import { Sparkline } from './ChartWidgets';
import * as DB from '../db/database';

interface MinerDrillDownProps {
  visible: boolean;
  onClose: () => void;
  miners: Miner[];
  metricType: 'hashrate' | 'power' | 'uptime' | 'temp';
  title: string;
}

export function MinerDrillDownModal({
  visible,
  onClose,
  miners,
  metricType,
  title,
}: MinerDrillDownProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [minerData, setMinerData] = useState<
    { id: string; name: string; values: number[]; current: number }[]
  >([]);

  useEffect(() => {
    if (!visible || miners.length === 0) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const results = await Promise.all(
        miners.map(async (m) => {
          const snaps = await DB.getSnapshots(m.id, 50);
          const recent = snaps.slice(-20);
          let values: number[];
          let current: number;
          switch (metricType) {
            case 'hashrate':
              values = recent.map((s) => toHashesPerSecond(s.hashRate, s.hashRateUnit));
              current = toHashesPerSecond(m.status?.hashRate ?? 0, m.status?.hashRateUnit);
              break;
            case 'power':
              values = recent.map((s) => s.power);
              current = m.status?.power ?? 0;
              break;
            case 'uptime':
              values = recent.map((s) => Math.round(s.uptimeSeconds / 3600));
              current = Math.round((m.status?.uptimeSeconds ?? 0) / 3600);
              break;
            case 'temp':
              values = recent.map((s) => s.temperature);
              current = m.status?.temperature ?? 0;
              break;
          }
          return { id: m.id, name: m.name || m.ip, values, current };
        }),
      );
      if (!cancelled) {
        setMinerData(results);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, miners, metricType]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: theme.bg + 'ee',
          justifyContent: 'center',
          padding: spacing.md,
        },
        modal: {
          backgroundColor: theme.surface,
          borderRadius: radius.xxl,
          padding: spacing.md,
          maxHeight: '80%',
          borderWidth: 1,
          borderColor: theme.border,
          ...cardShadow(theme, 'lg'),
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
        },
        title: {
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
        },
        closeBtn: {
          padding: spacing.xs,
          borderRadius: radius.md,
          backgroundColor: theme.surfaceLight,
        },
        closeText: {
          color: theme.textMuted,
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.border + '40',
          gap: spacing.sm,
        },
        name: {
          color: theme.text,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          flex: 1,
        },
        value: {
          color: theme.primary,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.bold,
          minWidth: 60,
          textAlign: 'right',
        },
        chart: { width: 80, height: 28 },
        centerText: {
          color: theme.textMuted,
          fontSize: fontSize.md,
          textAlign: 'center',
          padding: spacing.lg,
        },
      }),
    [theme],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close drill-down">
          <Pressable style={styles.modal} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeBtn}
                onPress={onClose}
              >
                <Text style={styles.closeText}>{t('common.close') || '✕'}</Text>
              </Pressable>
            </View>
            {loading ? (
              <ActivityIndicator color={theme.primary} size="large" />
            ) : minerData.length === 0 ? (
              <Text style={styles.centerText}>{t('dashboard.noData') || 'No data'}</Text>
            ) : (
              <FlatList
                data={minerData}
                keyExtractor={(d) => d.id}
                renderItem={({ item }) => (
                  <View style={styles.row}>
                    <View style={styles.chart}>
                      {item.values.length > 0 && (
                        <Sparkline data={item.values} color={theme.primary} />
                      )}
                    </View>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.value}>{formatValue(item.current, metricType)}</Text>
                  </View>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}

function formatValue(val: number, type: string): string {
  if (type === 'hashrate') return formatHashrateValue(val);
  if (type === 'power') return `${val.toFixed(1)}W`;
  if (type === 'uptime') return `${val}h`;
  if (type === 'temp') return `${Math.round(val)}°C`;
  return String(val);
}
