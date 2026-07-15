import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Linking,
  StyleSheet,
  ActivityIndicator,
  Alert as RNAlert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import {
  parseVersion,
  needsUpdate,
  LATEST_FIRMWARE,
  getFirmwareUrl,
  getFirmwareBinaryUrl,
  fetchLatestFirmware,
} from '../utils/version';
import { BitAxeClient } from '../api/bitaxe';
import { spacing, radius, fontWeight, fontSize } from '../utils/design';

interface FirmwareBannerProps {
  rawVersion: string | null | undefined;
  minerIp: string;
  minerPort: number;
  apiPath?: string | null;
  statusPath?: string | null;
}

export const FirmwareBanner = React.memo(function FirmwareBanner({
  rawVersion,
  minerIp,
  minerPort,
  apiPath,
  statusPath,
}: FirmwareBannerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [latest, setLatest] = useState<string | null>(null);
  const [flashing, setFlashing] = useState(false);
  const [flashResult, setFlashResult] = useState<'success' | 'fail' | null>(null);

  useEffect(() => {
    fetchLatestFirmware().then((v) => setLatest(v));
  }, []);

  const parsed = parseVersion(rawVersion ?? '');
  if (!parsed && !rawVersion) return null;
  if (!parsed) return null;

  const target = latest || LATEST_FIRMWARE;
  const hasUpdate = needsUpdate(parsed, target);
  const currentVersion = rawVersion && parseVersion(rawVersion);

  const handleOpenReleases = () => {
    Linking.openURL(getFirmwareUrl()).catch((e: unknown) =>
      console.warn('Failed to open firmware URL:', e),
    );
  };

  const handleFlash = async () => {
    if (flashing) return;
    setFlashing(true);
    setFlashResult(null);
    try {
      const client = new BitAxeClient(
        minerIp,
        minerPort,
        apiPath ?? undefined,
        statusPath ?? undefined,
      );
      const binUrl = getFirmwareBinaryUrl(target);
      const ok = await client.flashFirmware(binUrl);
      setFlashResult(ok ? 'success' : 'fail');
      if (ok) {
        RNAlert.alert(t('firmwareBanner.flashSent'), t('firmwareBanner.flashSentBody'));
      } else {
        RNAlert.alert(t('firmwareBanner.flashFailed'), t('firmwareBanner.flashFailedBody'));
      }
    } catch {
      setFlashResult('fail');
      RNAlert.alert(t('firmwareBanner.flashFailed'), t('firmwareBanner.flashFailedBody'));
    } finally {
      setFlashing(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: hasUpdate ? theme.warning + '12' : theme.surfaceLight,
          borderColor: hasUpdate ? theme.warning + '40' : theme.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t('firmwareBanner.title')}</Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textMuted }]}>
          {t('firmwareBanner.currentVersion')}
        </Text>
        <Text style={[styles.value, { color: theme.text }]}>
          {currentVersion ?? rawVersion ?? '-'}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textMuted }]}>
          {t('firmwareBanner.latestVersion')}
        </Text>
        <Text style={[styles.value, { color: hasUpdate ? theme.warning : theme.success }]}>
          {latest ? target : LATEST_FIRMWARE}
          {!latest && (
            <Text style={[styles.hint, { color: theme.textDim }]}>
              {' '}
              ({t('firmwareBanner.cached')})
            </Text>
          )}
        </Text>
      </View>

      {hasUpdate && (
        <Pressable
          accessibilityRole="button"
          style={styles.releaseLink}
          onPress={handleOpenReleases}
        >
          <Text style={[styles.releaseLinkText, { color: theme.primary }]}>
            {t('firmwareBanner.viewReleaseNotes')} ›
          </Text>
        </Pressable>
      )}

      {hasUpdate && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={String(t('firmwareBanner.updateTo', { version: target }))}
          style={[
            styles.flashBtn,
            {
              backgroundColor: theme.primary,
              opacity: flashing ? 0.6 : 1,
            },
          ]}
          disabled={flashing}
          onPress={handleFlash}
        >
          {flashing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.flashBtnText}>
              {flashResult === 'success' ? '✓ ' : flashResult === 'fail' ? '✗ ' : ''}
              {t('firmwareBanner.updateTo', { version: target })}
            </Text>
          )}
        </Pressable>
      )}

      {!latest && (
        <Pressable
          accessibilityRole="button"
          style={{ marginTop: spacing.xs, alignSelf: 'flex-start' }}
          onPress={() => fetchLatestFirmware().then((v) => setLatest(v))}
        >
          <Text style={[styles.releaseLinkText, { color: theme.primary }]}>
            {t('firmwareBanner.checkForUpdates')}
          </Text>
        </Pressable>
      )}

      {flashing && (
        <Text style={[styles.flashingHint, { color: theme.textDim }]}>
          {t('firmwareBanner.flashingHint')}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  header: {
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: fontSize.base,
  },
  value: {
    fontSize: fontSize.base,
    fontFamily: 'monospace',
    fontWeight: fontWeight.semibold,
  },
  hint: {
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    fontWeight: fontWeight.regular,
  },
  releaseLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  releaseLinkText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  flashBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 40,
  },
  flashBtnText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  flashingHint: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
