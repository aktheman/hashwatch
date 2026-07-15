import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { useTranslation } from 'react-i18next';
import { spacing, radius, fontWeight, fontSize } from '../utils/design';

interface UpdateInfo {
  version: string;
  url: string;
}

export function UpdateBanner() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanupAvailable = window.electronAPI.onCheckForUpdate((info) => {
      setUpdateInfo(info);
    });

    const cleanupDownloaded = window.electronAPI.onUpdateDownloaded(() => {
      setDownloaded(true);
    });

    return () => {
      cleanupAvailable();
      cleanupDownloaded();
    };
  }, []);

  const handleInstall = useCallback(() => {
    window.electronAPI?.installUpdate();
  }, []);

  const handleDismiss = useCallback(() => {
    setUpdateInfo(null);
  }, []);

  if (!updateInfo) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.accent || theme.primary }]}>
      <View style={styles.content}>
        {downloaded ? (
          <>
            <Text style={styles.title}>{t('update.downloaded')}</Text>
            <Text style={styles.body}>
              {t('update.downloadedBody', { version: updateInfo.version })}
            </Text>
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleInstall}
                accessibilityRole="button"
                accessibilityLabel="Download update"
              >
                <Text style={styles.btnPrimaryText}>{t('update.restartInstall')}</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnSecondary]}
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="Dismiss update"
              >
                <Text style={[styles.btnSecondaryText, { color: '#fff' }]}>
                  {t('update.later')}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('update.available')}</Text>
            <Text style={styles.body}>
              {t('update.availableBody', { version: updateInfo.version })}
            </Text>
            <Pressable
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleDismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss update"
            >
              <Text style={[styles.btnSecondaryText, { color: '#fff' }]}>
                {t('update.dismiss')}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  body: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#fff',
  },
  btnPrimaryText: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.base,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  btnSecondaryText: {
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
  },
});
