import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useMinerStore } from '../store/miners';
import { MinerSnapshot, NavigationProp } from '../types';
import { reportCSV, reportJSON, downloadReport } from '../utils/reportExport';
import { SubscriptionGate } from '../components/SubscriptionGate';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { generateMinerReport } from '../utils/pdfExport';

type DatePreset = '24h' | '7d' | '30d' | 'custom';

function getDateRange(preset: DatePreset): { from: number; to: number } {
  const now = Date.now();
  switch (preset) {
    case '24h':
      return { from: now - 24 * 60 * 60 * 1000, to: now };
    case '7d':
      return { from: now - 7 * 24 * 60 * 60 * 1000, to: now };
    case '30d':
      return { from: now - 30 * 24 * 60 * 60 * 1000, to: now };
    case 'custom':
      return { from: now - 7 * 24 * 60 * 60 * 1000, to: now };
  }
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString();
}

export function ExportReportScreen(_props: { navigation: NavigationProp }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const miners = useMinerStore((s) => s.miners);
  const getSnapshots = useMinerStore((s) => s.getSnapshots);

  const [datePreset, setDatePreset] = useState<DatePreset>('7d');
  const [selectedMinerIds, setSelectedMinerIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [includeSnapshots, setIncludeSnapshots] = useState(true);
  const [includeEarnings, setIncludeEarnings] = useState(false);
  const [includePoolStats, setIncludePoolStats] = useState(true);
  const [includeHealth, setIncludeHealth] = useState(false);
  const [format, setFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [generating, setGenerating] = useState(false);
  const [allSnapshots, setAllSnapshots] = useState<MinerSnapshot[]>([]);
  const [pdfResult, setPdfResult] = useState<{
    uri?: string;
    filePath?: string;
    blob?: Blob;
    html?: string;
  } | null>(null);
  const [previewStats, setPreviewStats] = useState<{
    avgHashrate: number;
    peakHashrate: number;
    avgTemp: number;
    totalUptime: number;
    efficiency: number;
  } | null>(null);

  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

  const previewMiners = useMemo(() => {
    let list = miners;
    if (!selectAll && selectedMinerIds.size > 0) {
      list = miners.filter((m) => selectedMinerIds.has(m.id));
    }
    return list.slice(0, 10);
  }, [miners, selectAll, selectedMinerIds]);

  const toggleMiner = useCallback((id: string) => {
    setSelectedMinerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExport = useCallback(async () => {
    setGenerating(true);
    try {
      let snapshots = allSnapshots;
      if (snapshots.length === 0) {
        const allSnaps: MinerSnapshot[] = [];
        for (const m of miners) {
          const snaps = await getSnapshots(m.id, 10000);
          allSnaps.push(...snaps);
        }
        snapshots = allSnaps;
        setAllSnapshots(allSnaps);
      }

      if (format === 'pdf') {
        const targetMinerIds = selectAll ? miners.map((m) => m.id) : Array.from(selectedMinerIds);
        const targetMiner = miners.find((m) => targetMinerIds.includes(m.id));
        if (!targetMiner) {
          Alert.alert(t('common.error'), t('exportReport.noData'));
          setGenerating(false);
          return;
        }

        const filteredSnaps = snapshots.filter(
          (s) =>
            s.minerId === targetMiner.id &&
            s.timestamp >= dateRange.from &&
            s.timestamp <= dateRange.to,
        );

        const poolBreakdown: Record<string, number> = {};
        const latestSnap = filteredSnaps[filteredSnaps.length - 1];
        if (latestSnap) {
          poolBreakdown[targetMiner.name] = latestSnap.sharesAccepted;
        }

        const result = await generateMinerReport(
          targetMiner,
          filteredSnaps,
          poolBreakdown,
          formatDate(dateRange.from),
          formatDate(dateRange.to),
        );

        setPdfResult(result);

        const hashrates = filteredSnaps.map((s) => s.hashRate).filter((h) => h > 0);
        const temps = filteredSnaps.map((s) => s.temperature).filter((t) => t > 0);
        const powers = filteredSnaps.map((s) => s.power).filter((p) => p > 0);
        const avgHr =
          hashrates.length > 0 ? hashrates.reduce((a, b) => a + b, 0) / hashrates.length : 0;
        const peakHr = hashrates.length > 0 ? Math.max(...hashrates) : 0;
        const avgT = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
        const avgP = powers.length > 0 ? powers.reduce((a, b) => a + b, 0) / powers.length : 0;
        const eff = avgP > 0 && avgHr > 0 ? avgP / (avgHr / 1e9) : 0;
        const totalUp = filteredSnaps.reduce((a, s) => a + s.uptimeSeconds, 0);

        setPreviewStats({
          avgHashrate: avgHr,
          peakHashrate: peakHr,
          avgTemp: avgT,
          totalUptime: totalUp,
          efficiency: eff,
        });

        Alert.alert(t('exportReport.reportGenerated'), '');
        setGenerating(false);
        return;
      }

      const options = {
        format: format as 'csv' | 'json',
        dateRange,
        minerIds: selectAll ? undefined : Array.from(selectedMinerIds),
        includeSnapshots,
        includeEarnings,
        includePoolStats,
        includeHealth,
      };

      if (format === 'csv') {
        const content = reportCSV(miners, snapshots, options);
        downloadReport(content, `hashwatch_report_${Date.now()}.csv`, 'text/csv');
      } else {
        const content = reportJSON(miners, snapshots, options);
        downloadReport(content, `hashwatch_report_${Date.now()}.json`, 'application/json');
      }

      Alert.alert(t('exportReport.exportSuccess'), '');
    } catch {
      Alert.alert(t('exportReport.exportError'), '');
    } finally {
      setGenerating(false);
    }
  }, [
    miners,
    allSnapshots,
    getSnapshots,
    format,
    dateRange,
    selectAll,
    selectedMinerIds,
    includeSnapshots,
    includeEarnings,
    includePoolStats,
    includeHealth,
    t,
  ]);

  const handleDownloadPdf = useCallback(async () => {
    if (!pdfResult) return;
    if (pdfResult.blob) {
      const url = URL.createObjectURL(pdfResult.blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `HashWatch_Report_${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (pdfResult.filePath || pdfResult.uri) {
      const path = pdfResult.filePath || pdfResult.uri;
      if (Platform.OS !== 'web' && typeof Share !== 'undefined') {
        await Share.share({ message: path || 'HashWatch Report', title: 'HashWatch Report' });
      } else {
        Alert.alert(t('exportReport.download'), path || '');
      }
    }
  }, [pdfResult, t]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        },
        section: {
          marginBottom: spacing.lg,
        },
        sectionTitle: {
          color: theme.textDim,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: spacing.xs,
          marginLeft: spacing.xs,
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
        },
        chip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.md,
          borderWidth: 1,
          marginRight: spacing.xxs,
        },
        chipText: {
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
        },
        exportBtn: {
          backgroundColor: theme.primary,
          borderRadius: radius.lg,
          padding: spacing.md,
          alignItems: 'center',
          marginTop: spacing.md,
        },
        exportBtnText: {
          color: '#FFF',
          fontWeight: fontWeight.bold,
          fontSize: fontSize.base,
        },
        previewCard: {
          backgroundColor: theme.surface,
          borderRadius: radius.md,
          padding: spacing.sm,
          borderWidth: 1,
          borderColor: theme.border,
        },
        previewRow: {
          paddingVertical: 2,
        },
        previewText: {
          color: theme.textDim,
          fontSize: fontSize.sm,
        },
        minerToggle: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.surface,
          padding: spacing.sm,
          borderRadius: radius.md,
          marginBottom: 2,
          borderWidth: 1,
          borderColor: theme.border,
        },
        minerToggleText: {
          color: theme.text,
          fontSize: fontSize.sm,
        },
        statRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 6,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        statLabel: {
          color: theme.textDim,
          fontSize: fontSize.sm,
        },
        statValue: {
          color: theme.text,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        downloadBtn: {
          backgroundColor: theme.success,
          borderRadius: radius.lg,
          padding: spacing.md,
          alignItems: 'center',
          marginTop: spacing.sm,
        },
      }),
    [theme],
  );

  const presetOptions: { key: DatePreset; label: string }[] = [
    { key: '24h', label: t('exportReport.last24h') },
    { key: '7d', label: t('exportReport.last7d') },
    { key: '30d', label: t('exportReport.last30d') },
  ];

  return (
    <SubscriptionGate feature={t('exportReport.title')}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>{t('exportReport.title')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('exportReport.dateRange')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {presetOptions.map((p) => (
              <Pressable
                key={p.key}
                accessibilityRole="button"
                accessibilityLabel={p.label}
                style={[
                  styles.chip,
                  {
                    backgroundColor: datePreset === p.key ? theme.primary : theme.surface,
                    borderColor: datePreset === p.key ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setDatePreset(p.key)}
              >
                <Text
                  style={[styles.chipText, { color: datePreset === p.key ? '#FFF' : theme.text }]}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.xs,
            }}
          >
            <Text style={styles.sectionTitle}>{t('exportReport.miners')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('exportReport.allMiners')}</Text>
            <Switch
              value={selectAll}
              onValueChange={(val) => {
                setSelectAll(val);
                if (val) setSelectedMinerIds(new Set());
              }}
              trackColor={{ false: theme.border, true: theme.primary + '60' }}
              thumbColor={selectAll ? theme.primary : theme.textMuted}
              accessibilityLabel="Select all miners"
            />
          </View>
          {!selectAll && (
            <View style={{ marginTop: spacing.xs }}>
              {miners.map((m) => (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.name} ${selectedMinerIds.has(m.id) ? 'selected' : 'not selected'}`}
                  style={styles.minerToggle}
                  onPress={() => toggleMiner(m.id)}
                >
                  <Text style={styles.minerToggleText}>{m.name}</Text>
                  <Switch
                    value={selectedMinerIds.has(m.id)}
                    onValueChange={() => toggleMiner(m.id)}
                    trackColor={{ false: theme.border, true: theme.primary + '60' }}
                    thumbColor={selectedMinerIds.has(m.id) ? theme.primary : theme.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('exportReport.sections')}</Text>
          {[
            {
              key: 'snapshots',
              value: includeSnapshots,
              setter: setIncludeSnapshots,
              label: t('exportReport.snapshots'),
            },
            {
              key: 'earnings',
              value: includeEarnings,
              setter: setIncludeEarnings,
              label: t('exportReport.earnings'),
            },
            {
              key: 'poolStats',
              value: includePoolStats,
              setter: setIncludePoolStats,
              label: t('exportReport.poolStats'),
            },
            {
              key: 'health',
              value: includeHealth,
              setter: setIncludeHealth,
              label: t('exportReport.health'),
            },
          ].map((item) => (
            <View key={item.key} style={styles.row}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Switch
                value={item.value}
                onValueChange={item.setter}
                trackColor={{ false: theme.border, true: theme.primary + '60' }}
                thumbColor={item.value ? theme.primary : theme.textMuted}
                accessibilityLabel={`Toggle ${item.key}`}
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('exportReport.format')}</Text>
          <View style={{ flexDirection: 'row' }}>
            {(['csv', 'json', 'pdf'] as const).map((f) => (
              <Pressable
                key={f}
                accessibilityRole="button"
                accessibilityLabel={f.toUpperCase()}
                style={[
                  styles.chip,
                  {
                    backgroundColor: format === f ? theme.primary : theme.surface,
                    borderColor: format === f ? theme.primary : theme.border,
                    marginRight: spacing.xs,
                  },
                ]}
                onPress={() => setFormat(f)}
              >
                <Text style={[styles.chipText, { color: format === f ? '#FFF' : theme.text }]}>
                  {f.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('exportReport.preview')}</Text>
          <View style={styles.previewCard}>
            {previewMiners.length === 0 ? (
              <Text style={styles.previewText}>{t('exportReport.noData')}</Text>
            ) : (
              previewMiners.map((m) => (
                <View key={m.id} style={styles.previewRow}>
                  <Text style={styles.previewText}>
                    {m.name} · {m.ip} · {m.isOnline ? t('common.online') : t('common.offline')}
                  </Text>
                </View>
              ))
            )}
            {miners.length > 10 && (
              <Text style={[styles.previewText, { color: theme.textMuted, marginTop: 4 }]}>
                ...and {miners.length - 10} more
              </Text>
            )}
          </View>
        </View>

        {format === 'pdf' && previewStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('exportReport.preview')}</Text>
            <View style={styles.previewCard}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('exportReport.avgHashrate')}</Text>
                <Text style={styles.statValue}>
                  {previewStats.avgHashrate >= 1e9
                    ? (previewStats.avgHashrate / 1e9).toFixed(2) + ' GH/s'
                    : previewStats.avgHashrate >= 1e6
                      ? (previewStats.avgHashrate / 1e6).toFixed(2) + ' MH/s'
                      : previewStats.avgHashrate >= 1e3
                        ? (previewStats.avgHashrate / 1e3).toFixed(2) + ' KH/s'
                        : previewStats.avgHashrate.toFixed(1) + ' H/s'}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('exportReport.peakHashrate')}</Text>
                <Text style={styles.statValue}>
                  {previewStats.peakHashrate >= 1e9
                    ? (previewStats.peakHashrate / 1e9).toFixed(2) + ' GH/s'
                    : previewStats.peakHashrate >= 1e6
                      ? (previewStats.peakHashrate / 1e6).toFixed(2) + ' MH/s'
                      : previewStats.peakHashrate >= 1e3
                        ? (previewStats.peakHashrate / 1e3).toFixed(2) + ' KH/s'
                        : previewStats.peakHashrate.toFixed(1) + ' H/s'}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('exportReport.avgTemp')}</Text>
                <Text style={styles.statValue}>{previewStats.avgTemp.toFixed(1)}°C</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('exportReport.totalUptime')}</Text>
                <Text style={styles.statValue}>{Math.round(previewStats.totalUptime / 3600)}h</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('exportReport.efficiency')}</Text>
                <Text style={styles.statValue}>
                  {previewStats.efficiency > 0
                    ? previewStats.efficiency.toFixed(2) + ' J/TH'
                    : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            format === 'pdf' ? t('exportReport.generate') : t('exportReport.exportButton')
          }
          style={[styles.exportBtn, generating && { opacity: 0.6 }]}
          onPress={handleExport}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.exportBtnText}>
              {format === 'pdf' ? t('exportReport.generate') : t('exportReport.exportButton')}
            </Text>
          )}
        </Pressable>

        {format === 'pdf' && pdfResult && !generating && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('exportReport.download')}
            style={styles.downloadBtn}
            onPress={handleDownloadPdf}
          >
            <Text style={styles.exportBtnText}>{t('exportReport.download')}</Text>
          </Pressable>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SubscriptionGate>
  );
}
