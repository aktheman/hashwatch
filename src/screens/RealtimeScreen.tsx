import { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useMinerStore } from '../store/miners';
import { MinerRealtimeData, minerWebSocket } from '../services/minerWebSocket';
import { RealtimeChart } from '../components/RealtimeChart';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import * as haptic from '../utils/haptics';

const HISTORY_LENGTH = 60;
const SIM_INTERVAL_MS = 5000;

function useSimulatedData(miners: { id: string; name: string; ip: string; isOnline: boolean }[]) {
  const [realtimeMap, setRealtimeMap] = useState<Map<string, MinerRealtimeData[]>>(new Map());
  const prevValues = useRef<Map<string, { hashRate: number; temp: number; power: number }>>(
    new Map(),
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const onlineMiners = miners.filter((m) => m.isOnline);
    if (onlineMiners.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = setInterval(() => {
      setRealtimeMap((prev) => {
        const next = new Map(prev);
        for (const miner of onlineMiners) {
          const prevVals = prevValues.current.get(miner.id) || {
            hashRate: 400 + Math.random() * 200,
            temp: 55 + Math.random() * 15,
            power: 10 + Math.random() * 5,
          };
          const hashRate = Math.max(0, prevVals.hashRate + (Math.random() - 0.5) * 20);
          const temp = Math.max(30, Math.min(95, prevVals.temp + (Math.random() - 0.5) * 3));
          const power = Math.max(5, Math.min(30, prevVals.power + (Math.random() - 0.5) * 2));
          prevValues.current.set(miner.id, { hashRate, temp, power });

          const newPoint: MinerRealtimeData = {
            minerId: miner.id,
            timestamp: Date.now(),
            hashRate,
            temperature: temp,
            power,
            uptime: Math.floor(Date.now() / 1000) - 1000,
          };
          const existing = next.get(miner.id) || [];
          next.set(miner.id, [...existing.slice(-(HISTORY_LENGTH - 1)), newPoint]);
        }
        return next;
      });
    }, SIM_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [miners]);

  return realtimeMap;
}

function useWsData(
  miners: { id: string; name: string; ip: string; isOnline: boolean }[],
  isConnected: boolean,
) {
  const [realtimeMap, setRealtimeMap] = useState<Map<string, MinerRealtimeData[]>>(new Map());
  const unsubRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    if (!isConnected) return;
    for (const miner of miners) {
      if (unsubRef.current.has(miner.id)) continue;
      const unsub = minerWebSocket.subscribe(miner.id, (data) => {
        setRealtimeMap((prev) => {
          const next = new Map(prev);
          const existing = next.get(data.minerId) || [];
          next.set(data.minerId, [...existing.slice(-(HISTORY_LENGTH - 1)), data]);
          return next;
        });
      });
      unsubRef.current.set(miner.id, unsub);
    }
    return () => {
      unsubRef.current.forEach((unsub) => unsub());
      unsubRef.current.clear();
    };
  }, [isConnected, miners]);

  return realtimeMap;
}

export function RealtimeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const miners = useMinerStore((s) =>
    s.miners.map((m) => ({ id: m.id, name: m.name, ip: m.ip, isOnline: m.isOnline })),
  );

  const [connected, setConnected] = useState(false);
  const [selectedMiner, setSelectedMiner] = useState<string | null>(null);

  useEffect(() => {
    const unsub = minerWebSocket.onStatusChange(setConnected);
    minerWebSocket.connect();
    return () => {
      unsub();
      minerWebSocket.disconnect();
    };
  }, []);

  const wsMap = useWsData(miners, connected);
  const simMap = useSimulatedData(!connected ? miners : []);

  const realtimeMap = connected ? wsMap : simMap;

  const onlineMiners = miners.filter((m) => m.isOnline);
  const displayMiners = selectedMiner
    ? onlineMiners.filter((m) => m.id === selectedMiner)
    : onlineMiners;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('realtime.title', 'Real-Time Monitor')}
        </Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: connected ? theme.success : theme.danger },
            ]}
          />
          <Text style={[styles.statusText, { color: connected ? theme.success : theme.danger }]}>
            {connected
              ? t('realtime.connected', 'Connected')
              : t('realtime.simulated', 'Simulated')}
          </Text>
        </View>
      </View>

      {onlineMiners.length === 0 && (
        <View
          style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            {t('realtime.noMiners', 'No online miners')}
          </Text>
        </View>
      )}

      {onlineMiners.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.minerPicker}>
          <Pressable
            style={[
              styles.pickerChip,
              {
                backgroundColor: selectedMiner === null ? theme.primary : theme.surface,
                borderColor: selectedMiner === null ? theme.primary : theme.border,
              },
            ]}
            onPress={() => {
              haptic.selection();
              setSelectedMiner(null);
            }}
          >
            <Text
              style={{
                color: selectedMiner === null ? '#FFF' : theme.text,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {t('realtime.allMiners', 'All Miners')}
            </Text>
          </Pressable>
          {onlineMiners.map((miner) => (
            <Pressable
              key={miner.id}
              style={[
                styles.pickerChip,
                {
                  backgroundColor: selectedMiner === miner.id ? theme.primary : theme.surface,
                  borderColor: selectedMiner === miner.id ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                haptic.selection();
                setSelectedMiner(miner.id);
              }}
            >
              <Text
                style={{
                  color: selectedMiner === miner.id ? '#FFF' : theme.text,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {miner.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {displayMiners.map((miner) => {
        const dataPoints = realtimeMap.get(miner.id) || [];
        const latest = dataPoints[dataPoints.length - 1];
        return (
          <View
            key={miner.id}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.minerName, { color: theme.text }]}>{miner.name}</Text>
                <Text style={[styles.minerIp, { color: theme.textDim }]}>{miner.ip}</Text>
              </View>
              {latest && (
                <View style={[styles.powerBadge, { backgroundColor: theme.surfaceLight }]}>
                  <Text style={[styles.powerLabel, { color: theme.textDim }]}>
                    {t('realtime.power', 'Power')}
                  </Text>
                  <Text style={[styles.powerValue, { color: theme.text }]}>
                    {latest.power.toFixed(1)} W
                  </Text>
                </View>
              )}
            </View>

            <RealtimeChart
              data={dataPoints.map((d) => d.hashRate)}
              color={theme.success}
              label={t('realtime.hashrate', 'Hash Rate')}
              unit="TH/s"
            />

            <View style={styles.chartSpacer} />

            <RealtimeChart
              data={dataPoints.map((d) => d.temperature)}
              color={theme.warning}
              label={t('realtime.temperature', 'Temperature')}
              unit="°C"
              dangerZone={80}
            />
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  minerPicker: {
    marginBottom: spacing.md,
  },
  pickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginRight: 8,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  minerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  minerIp: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  powerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  powerLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  powerValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  chartSpacer: {
    height: 12,
  },
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
