import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useMinerStore } from '../store/miners';
import { checkForFirmwareUpdate, FirmwareVersion } from '../services/firmwareUpdate';
import {
  parseVersion,
  needsUpdate,
  LATEST_FIRMWARE,
  getFirmwareChangelogUrl,
} from '../utils/version';
import { BitAxeClient } from '../api/bitaxe';
import { Miner } from '../types';
import { getSetting, setSetting } from '../db/database';
import { spacing, radius, fontSize, fontWeight, buttonText } from '../utils/design';

const SKIP_KEY = 'firmware_skip_version';

type FlashStatus = 'pending' | 'flashing' | 'success' | 'failed';

interface MinerFlashState {
  status: FlashStatus;
  progress: number;
}

export default function FirmwareScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const miners = useMinerStore((s) => s.miners);
  const refreshAll = useMinerStore((s) => s.refreshAll);

  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [latest, setLatest] = useState<FirmwareVersion | null>(null);
  const [skipVersion, setSkipVersion] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchFlashing, setBatchFlashing] = useState(false);
  const [minerStates, setMinerStates] = useState<Record<string, MinerFlashState>>({});

  const loadSkipVersion = useCallback(async () => {
    const sv = await getSetting(SKIP_KEY);
    setSkipVersion(sv);
  }, []);

  useEffect(() => {
    loadSkipVersion();
  }, [loadSkipVersion]);

  const onlineMiners = useMemo(() => miners.filter((m) => m.isOnline), [miners]);

  const minerVersionMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const m of miners) {
      map[m.id] = parseVersion(m.info?.version ?? '') ?? null;
    }
    return map;
  }, [miners]);

  const minersNeedingUpdate = useMemo(() => {
    if (!latest) return [];
    return onlineMiners.filter((m) => {
      const current = minerVersionMap[m.id];
      return current ? needsUpdate(current, latest.version) : false;
    });
  }, [onlineMiners, minerVersionMap, latest]);

  const handleCheckForUpdates = useCallback(async () => {
    setChecking(true);
    try {
      const result = await checkForFirmwareUpdate(LATEST_FIRMWARE);
      if (result) {
        if (result.version === skipVersion) {
          Alert.alert(
            t('firmware.updateSkippedTitle', 'Update Skipped'),
            t('firmware.updateSkippedBody', {
              version: result.version,
              defaultValue: `Version ${result.version} was previously skipped.`,
            }),
          );
        }
        setLatest(result);
      } else {
        setLatest(null);
        Alert.alert(
          t('firmware.upToDateTitle', 'Up to Date'),
          t('firmware.upToDateBody', {
            version: LATEST_FIRMWARE,
            defaultValue: `You are running the latest firmware (${LATEST_FIRMWARE}).`,
          }),
        );
      }
    } catch {
      Alert.alert(
        t('firmware.checkFailedTitle', 'Check Failed'),
        t('firmware.checkFailedBody', 'Could not check for firmware updates.'),
      );
    } finally {
      setChecking(false);
    }
  }, [skipVersion, t]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshAll(), handleCheckForUpdates()]);
    setRefreshing(false);
  }, [refreshAll, handleCheckForUpdates]);

  const handleFlashSingle = useCallback(
    async (miner: Miner) => {
      if (!latest) return;
      const current = minerVersionMap[miner.id];
      if (current && !needsUpdate(current, latest.version)) return;

      Alert.alert(
        t('firmware.confirmFlash', 'Flash Firmware?'),
        t('firmware.confirmFlashBody', {
          version: latest.version,
          name: miner.name,
          defaultValue: `Update ${miner.name} to ${latest.version}? The miner will reboot.`,
        }),
        [
          { text: t('common.cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('firmware.flash', 'Flash'),
            onPress: async () => {
              setMinerStates((prev) => ({
                ...prev,
                [miner.id]: { status: 'flashing', progress: 0 },
              }));

              const client = new BitAxeClient(
                miner.ip,
                miner.port,
                miner.apiPath ?? undefined,
                miner.statusPath ?? undefined,
              );
              const ok = await client.flashFirmware(latest.downloadUrl);

              setMinerStates((prev) => ({
                ...prev,
                [miner.id]: {
                  status: ok ? 'success' : 'failed',
                  progress: ok ? 100 : 0,
                },
              }));
            },
          },
        ],
      );
    },
    [latest, minerVersionMap, t],
  );

  const handleToggleSelect = useCallback((minerId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(minerId)) {
        next.delete(minerId);
      } else {
        next.add(minerId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const ids = minersNeedingUpdate.map((m) => m.id);
    setSelectedIds((prev) => {
      if (prev.size === ids.length) return new Set();
      return new Set(ids);
    });
  }, [minersNeedingUpdate]);

  const handleBatchFlash = useCallback(async () => {
    if (!latest || selectedIds.size === 0) return;

    const targets = onlineMiners.filter(
      (m) =>
        selectedIds.has(m.id) &&
        (!minerVersionMap[m.id] || needsUpdate(minerVersionMap[m.id]!, latest.version)),
    );

    if (targets.length === 0) return;

    Alert.alert(
      t('firmware.batchFlashTitle', 'Batch Flash'),
      t('firmware.batchFlashBody', {
        count: targets.length,
        version: latest.version,
        defaultValue: `Flash ${targets.length} miner(s) to ${latest.version}? All miners will reboot.`,
      }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('firmware.flashAll', 'Flash All'),
          onPress: async () => {
            setBatchFlashing(true);
            setSelectedIds(new Set());

            const initial: Record<string, MinerFlashState> = {};
            for (const m of targets) {
              initial[m.id] = { status: 'pending', progress: 0 };
            }
            setMinerStates(initial);

            for (const m of targets) {
              setMinerStates((prev) => ({
                ...prev,
                [m.id]: { status: 'flashing', progress: 30 },
              }));

              const client = new BitAxeClient(
                m.ip,
                m.port,
                m.apiPath ?? undefined,
                m.statusPath ?? undefined,
              );
              const ok = await client.flashFirmware(latest.downloadUrl);

              setMinerStates((prev) => ({
                ...prev,
                [m.id]: {
                  status: ok ? 'success' : 'failed',
                  progress: ok ? 100 : 0,
                },
              }));
            }

            setBatchFlashing(false);
          },
        },
      ],
    );
  }, [latest, selectedIds, onlineMiners, minerVersionMap, t]);

  const handleSkipVersion = useCallback(async () => {
    if (!latest) return;
    Alert.alert(
      t('firmware.skipTitle', 'Skip Version'),
      t('firmware.skipBody', {
        version: latest.version,
        defaultValue: `Skip version ${latest.version}? You won't be reminded about this update.`,
      }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('firmware.skipConfirm', 'Skip'),
          style: 'destructive',
          onPress: async () => {
            await setSetting(SKIP_KEY, latest.version);
            setSkipVersion(latest.version);
            Alert.alert(
              t('firmware.skippedTitle', 'Skipped'),
              t('firmware.skippedBody', {
                version: latest.version,
                defaultValue: `Version ${latest.version} skipped.`,
              }),
            );
          },
        },
      ],
    );
  }, [latest, t]);

  const handleClearSkip = useCallback(async () => {
    await setSetting(SKIP_KEY, '');
    setSkipVersion(null);
  }, []);

  const hasActiveFlash = useMemo(
    () => Object.values(minerStates).some((s) => s.status === 'flashing'),
    [minerStates],
  );

  const anyFlashed = useMemo(
    () => Object.values(minerStates).some((s) => s.status === 'success' || s.status === 'failed'),
    [minerStates],
  );

  const allSelected = useMemo(
    () => minersNeedingUpdate.length > 0 && selectedIds.size === minersNeedingUpdate.length,
    [minersNeedingUpdate, selectedIds.size],
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textDim }]} accessibilityRole="header">
          {t('firmware.currentVersion', 'Current Version')}
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <Text style={[styles.versionBig, { color: theme.text }]}>{LATEST_FIRMWARE}</Text>
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>
                {t('firmware.builtIn', 'Built-in version')}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('firmware.checkForUpdates', 'Check for updates')}
              style={[
                styles.checkBtn,
                { backgroundColor: theme.primary },
                checking && { opacity: 0.6 },
              ]}
              disabled={checking}
              onPress={handleCheckForUpdates}
            >
              {checking ? (
                <ActivityIndicator size="small" color={buttonText} />
              ) : (
                <Text style={styles.checkBtnText}>
                  {t('firmware.checkForUpdates', 'Check for Updates')}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {latest && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textDim }]} accessibilityRole="header">
            {t('firmware.latestRelease', 'Latest Release')}
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: needsUpdate(LATEST_FIRMWARE, latest.version)
                  ? theme.warning + '40'
                  : theme.success + '40',
              },
            ]}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <Text style={[styles.versionBig, { color: theme.primary }]}>{latest.version}</Text>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>
                  {t('firmware.releasedOn', {
                    date: new Date(latest.releaseDate).toLocaleDateString(),
                    defaultValue: `Released ${new Date(latest.releaseDate).toLocaleDateString()}`,
                  })}
                </Text>
              </View>
              {needsUpdate(LATEST_FIRMWARE, latest.version) && (
                <View style={[styles.updateBadge, { backgroundColor: theme.warning + '20' }]}>
                  <Text style={[styles.updateBadgeText, { color: theme.warning }]}>
                    {t('firmware.updateAvailable', 'Update Available')}
                  </Text>
                </View>
              )}
            </View>

            {latest.changelog ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('firmware.viewChangelog', 'View changelog')}
                style={styles.changelogBtn}
                onPress={() => Linking.openURL(getFirmwareChangelogUrl(latest.version))}
              >
                <Text style={[styles.changelogText, { color: theme.primary }]}>
                  {t('firmware.viewChangelog', 'View Changelog')} ›
                </Text>
              </Pressable>
            ) : null}

            {skipVersion === latest.version && (
              <View
                style={[
                  styles.skipBadge,
                  { backgroundColor: theme.surfaceLight, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.skipBadgeText, { color: theme.textDim }]}>
                  {t('firmware.versionSkipped', 'This version is skipped')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('firmware.undoSkip', 'Undo skip')}
                  onPress={handleClearSkip}
                >
                  <Text style={[styles.undoSkipText, { color: theme.primary }]}>
                    {t('firmware.undoSkip', 'Undo')}
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.cardActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('firmware.skipVersion', 'Skip this version')}
                style={[styles.skipVersionBtn, { borderColor: theme.border }]}
                onPress={handleSkipVersion}
              >
                <Text style={[styles.skipVersionText, { color: theme.textMuted }]}>
                  {t('firmware.skipVersion', 'Skip Version')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textDim }]} accessibilityRole="header">
            {t('firmware.minerVersions', 'Miner Firmware Versions')}
          </Text>
          {minersNeedingUpdate.length > 0 && (
            <Text style={[styles.minerCount, { color: theme.primary }]}>
              {t('firmware.needsUpdate', {
                count: minersNeedingUpdate.length,
                defaultValue: `${minersNeedingUpdate.length} need update`,
              })}
            </Text>
          )}
        </View>

        {onlineMiners.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {t(
                'firmware.noOnlineMiners',
                'No online miners found. Connect miners to manage firmware.',
              )}
            </Text>
          </View>
        ) : (
          <View style={styles.minerList}>
            {onlineMiners.map((miner) => {
              const currentVer = minerVersionMap[miner.id];
              const needsFlash = latest
                ? currentVer
                  ? needsUpdate(currentVer, latest.version)
                  : true
                : false;
              const flashState = minerStates[miner.id];
              const isSelected = selectedIds.has(miner.id);

              return (
                <Pressable
                  key={miner.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${miner.name}, ${currentVer ?? t('firmware.unknown', 'unknown')}`}
                  style={[
                    styles.minerRow,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                    flashState?.status === 'success' && {
                      borderColor: theme.success,
                    },
                    flashState?.status === 'failed' && {
                      borderColor: theme.danger,
                    },
                  ]}
                  onPress={() => needsFlash && latest && handleFlashSingle(miner)}
                >
                  <View style={styles.minerRowTop}>
                    {latest && needsFlash && (
                      <Switch
                        value={isSelected}
                        onValueChange={() => handleToggleSelect(miner.id)}
                        trackColor={{ false: theme.surfaceLight, true: theme.primary + '60' }}
                        thumbColor={isSelected ? theme.primary : theme.surface}
                        disabled={batchFlashing || hasActiveFlash}
                      />
                    )}
                    <View style={styles.minerInfo}>
                      <Text style={[styles.minerName, { color: theme.text }]} numberOfLines={1}>
                        {miner.name}
                      </Text>
                      <Text style={[styles.minerIp, { color: theme.textDim }]}>{miner.ip}</Text>
                    </View>
                    <View style={styles.minerVersionInfo}>
                      <Text
                        style={[
                          styles.minerCurrentVer,
                          { color: currentVer ? theme.text : theme.textDim },
                        ]}
                      >
                        {currentVer ?? t('firmware.unknown', 'unknown')}
                      </Text>
                      {latest && needsFlash && (
                        <View style={styles.versionArrow}>
                          <Text style={{ color: theme.textDim }}>→</Text>
                          <Text style={[styles.minerTargetVer, { color: theme.primary }]}>
                            {latest.version}
                          </Text>
                        </View>
                      )}
                      {latest && !needsFlash && currentVer && (
                        <Text style={[styles.upToDateBadge, { color: theme.success }]}>
                          ✓ {t('firmware.upToDate', 'Up to Date')}
                        </Text>
                      )}
                    </View>
                  </View>

                  {flashState && (
                    <View style={styles.flashStatusContainer}>
                      {flashState.status === 'pending' && (
                        <Text style={[styles.flashStatusText, { color: theme.textDim }]}>
                          {t('firmware.pending', 'Pending...')}
                        </Text>
                      )}
                      {flashState.status === 'flashing' && (
                        <View style={styles.flashProgressWrap}>
                          <View
                            style={[
                              styles.flashProgressTrack,
                              { backgroundColor: theme.surfaceLight },
                            ]}
                          >
                            <View
                              style={[
                                styles.flashProgressFill,
                                {
                                  backgroundColor: theme.primary,
                                  width: `${flashState.progress}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.flashStatusText, { color: theme.textDim }]}>
                            {t('firmware.flashing', 'Flashing...')}
                          </Text>
                        </View>
                      )}
                      {flashState.status === 'success' && (
                        <Text style={[styles.flashStatusText, { color: theme.success }]}>
                          ✓ {t('firmware.flashSuccess', 'Success — Miner rebooting')}
                        </Text>
                      )}
                      {flashState.status === 'failed' && (
                        <Text style={[styles.flashStatusText, { color: theme.danger }]}>
                          ✗ {t('firmware.flashFailed', 'Flash failed')}
                        </Text>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {minersNeedingUpdate.length > 0 && (
        <View style={styles.section}>
          <View style={styles.batchActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                allSelected
                  ? t('firmware.deselectAll', 'Deselect all')
                  : t('firmware.selectAll', 'Select all')
              }
              style={[styles.batchBtn, { borderColor: theme.border }]}
              onPress={handleSelectAll}
            >
              <Text style={[styles.batchBtnText, { color: theme.text }]}>
                {allSelected
                  ? t('firmware.deselectAll', 'Deselect All')
                  : t('firmware.selectAll', 'Select All')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('firmware.flashSelected', 'Flash selected miners')}
              style={[
                styles.batchBtn,
                styles.flashAllBtn,
                {
                  backgroundColor: theme.primary,
                  opacity: selectedIds.size === 0 || batchFlashing || hasActiveFlash ? 0.5 : 1,
                },
              ]}
              disabled={selectedIds.size === 0 || batchFlashing || hasActiveFlash}
              onPress={handleBatchFlash}
            >
              {batchFlashing ? (
                <ActivityIndicator size="small" color={buttonText} />
              ) : (
                <Text style={styles.flashAllBtnText}>
                  {t('firmware.flashSelected', {
                    count: selectedIds.size,
                    defaultValue: `Flash Selected (${selectedIds.size})`,
                  })}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {anyFlashed && (
        <View style={styles.section}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.summaryRow}>
              {Object.values(minerStates).filter((s) => s.status === 'success').length > 0 && (
                <Text style={[styles.summaryItem, { color: theme.success }]}>
                  ✓ {Object.values(minerStates).filter((s) => s.status === 'success').length}{' '}
                  {t('firmware.succeeded', 'succeeded')}
                </Text>
              )}
              {Object.values(minerStates).filter((s) => s.status === 'failed').length > 0 && (
                <Text style={[styles.summaryItem, { color: theme.danger }]}>
                  ✗ {Object.values(minerStates).filter((s) => s.status === 'failed').length}{' '}
                  {t('firmware.failed', 'failed')}
                </Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('firmware.clearResults', 'Clear results')}
              style={[styles.clearBtn, { borderColor: theme.border }]}
              onPress={() => setMinerStates({})}
            >
              <Text style={[styles.clearBtnText, { color: theme.textMuted }]}>
                {t('firmware.clearResults', 'Clear Results')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textDim }]}>
          {t('firmware.footer', 'Firmware is fetched from AXeOS GitHub releases.')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  minerCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
    gap: spacing.xxs,
  },
  versionBig: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.extrabold,
    fontFamily: 'monospace',
  },
  cardLabel: {
    fontSize: fontSize.xs,
  },
  checkBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  checkBtnText: {
    color: buttonText,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  updateBadge: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  updateBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  changelogBtn: {
    alignSelf: 'flex-start',
  },
  changelogText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  skipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  skipBadgeText: {
    fontSize: fontSize.xs,
  },
  undoSkipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skipVersionBtn: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  skipVersionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  minerList: {
    gap: spacing.xs,
  },
  minerRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  minerRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  minerInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  minerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  minerIp: {
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
  },
  minerVersionInfo: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  minerCurrentVer: {
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    fontWeight: fontWeight.semibold,
  },
  versionArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  minerTargetVer: {
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    fontWeight: fontWeight.bold,
  },
  upToDateBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  flashStatusContainer: {
    marginTop: spacing.xxs,
  },
  flashStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  flashProgressWrap: {
    gap: spacing.xxs,
  },
  flashProgressTrack: {
    height: 4,
    borderRadius: radius.xxs,
    overflow: 'hidden',
  },
  flashProgressFill: {
    height: '100%',
    borderRadius: radius.xxs,
  },
  batchActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  batchBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  batchBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  flashAllBtn: {
    borderWidth: 0,
  },
  flashAllBtnText: {
    color: buttonText,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryItem: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  clearBtn: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  clearBtnText: {
    fontSize: fontSize.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  footerText: {
    fontSize: fontSize.xs,
  },
});
