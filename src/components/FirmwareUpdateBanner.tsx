import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { checkForFirmwareUpdate, flashFirmware, FirmwareVersion } from '../services/firmwareUpdate';
import { getSetting, setSetting } from '../db/database';
import { LATEST_FIRMWARE } from '../utils/version';

const SKIP_KEY = 'firmware_skip_version';

let _sessionChecked = false;

/** @visibleForTesting */
export function _resetSessionCheck() {
  _sessionChecked = false;
}

interface FirmwareUpdateBannerProps {
  currentVersion?: string;
}

export function FirmwareUpdateBanner({
  currentVersion = LATEST_FIRMWARE,
}: FirmwareUpdateBannerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [firmware, setFirmware] = useState<FirmwareVersion | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (_sessionChecked) return;
    let cancelled = false;

    (async () => {
      const skipVersion = await getSetting(SKIP_KEY);
      _sessionChecked = true;

      const result = await checkForFirmwareUpdate(currentVersion);
      if (cancelled) return;
      if (result && result.version !== skipVersion) {
        setFirmware(result);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentVersion]);

  const handleUpdate = useCallback(async () => {
    if (!firmware) return;
    Alert.alert(
      t('firmwareBanner.confirmFlash', 'Flash firmware?'),
      t('firmwareBanner.confirmFlashBody', {
        version: firmware.version,
        defaultValue: `Update to ${firmware.version}? Miner will reboot.`,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('firmwareBanner.flash', 'Flash'),
          onPress: async () => {
            setDownloading(true);
            setProgress(0);
            setError(null);

            const ok = await flashFirmware('miner', firmware, (p) => setProgress(p));

            setDownloading(false);
            setFlashing(false);

            if (ok) {
              setSuccess(true);
              setTimeout(() => setFirmware(null), 5000);
            } else {
              setError(t('firmwareBanner.flashFailed'));
            }
          },
        },
      ],
    );
  }, [firmware, t]);

  const handleSkip = useCallback(async () => {
    if (firmware) {
      await setSetting(SKIP_KEY, firmware.version);
    }
    setFirmware(null);
  }, [firmware]);

  if (!firmware) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.primary + '20', borderColor: theme.primary },
      ]}
      testID="firmware-update-banner"
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.primary }]} accessibilityRole="header">
          {t('firmwareBanner.updateAvailable')}
        </Text>
        <View style={styles.versionRow}>
          <Text style={[styles.versionLabel, { color: theme.textDim }]}>
            {t('firmwareBanner.currentVersion')}: {currentVersion}
          </Text>
          <Text style={{ color: theme.textDim, marginHorizontal: spacing.xs }}>{'→'}</Text>
          <Text
            style={[styles.versionLabel, { color: theme.primary, fontWeight: fontWeight.bold }]}
          >
            {t('firmwareBanner.newVersion', {
              version: firmware.version,
              defaultValue: firmware.version,
            })}
          </Text>
        </View>

        {firmware.changelog ? (
          <Text style={[styles.changelog, { color: theme.textDim }]} numberOfLines={3}>
            {firmware.changelog}
          </Text>
        ) : null}

        {(downloading || flashing) && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: theme.surfaceLight }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: theme.primary, width: `${progress}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textDim }]}>
              {t('firmwareBanner.flashingHint')}
            </Text>
          </View>
        )}

        {error && (
          <Text style={[styles.errorText, { color: theme.danger }]} testID="firmware-error">
            {error}
          </Text>
        )}

        {success && (
          <Text style={[styles.successText, { color: theme.success }]} testID="firmware-success">
            {t('firmwareBanner.flashSent')}
          </Text>
        )}

        {!downloading && !flashing && !success && (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('firmwareBanner.updateTo', { version: firmware.version })}
              style={[styles.btn, { backgroundColor: theme.primary }]}
              onPress={handleUpdate}
              testID="firmware-update-btn"
            >
              <Text style={[styles.btnText, { color: '#FFF' }]}>
                {t('firmwareBanner.updateTo', {
                  version: firmware.version,
                  defaultValue: `Update to ${firmware.version}`,
                })}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('firmwareBanner.skip', 'Skip')}
              style={[styles.btn, styles.skipBtn, { borderColor: theme.border }]}
              onPress={handleSkip}
              testID="firmware-skip-btn"
            >
              <Text style={[styles.btnText, { color: theme.textMuted }]}>
                {t('firmwareBanner.skip', 'Skip')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.md,
  },
  content: {
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionLabel: {
    fontSize: fontSize.sm,
  },
  changelog: {
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  progressContainer: {
    gap: spacing.xxs,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.sm,
  },
  progressText: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontWeight: fontWeight.semibold,
  },
  successText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontWeight: fontWeight.semibold,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  btn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
});
