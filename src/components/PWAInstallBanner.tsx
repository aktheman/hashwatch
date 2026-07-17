import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import * as haptic from '../utils/haptics';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PWAInstallBanner() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const installedHandler = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    haptic.medium();
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    haptic.light();
    setDismissed(true);
    try {
      sessionStorage.setItem('hashwatch_pwa_dismissed', 'true');
    } catch {}
  }, []);

  if (Platform.OS !== 'web' || installed || dismissed || !deferredPrompt) {
    return null;
  }

  try {
    if (sessionStorage.getItem('hashwatch_pwa_dismissed') === 'true') return null;
  } catch {}

  const styles = StyleSheet.create({
    banner: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      padding: spacing.md,
      paddingBottom: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 999,
      elevation: 999,
    },
    textContainer: {
      flex: 1,
      marginRight: spacing.sm,
    },
    title: {
      color: theme.text,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
    },
    subtitle: {
      color: theme.textDim,
      fontSize: fontSize.xs,
      marginTop: 2,
    },
    installBtn: {
      backgroundColor: theme.primary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    installBtnText: {
      color: '#FFF',
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
    },
    dismissBtn: {
      padding: spacing.xs,
      marginLeft: spacing.xs,
    },
    dismissBtnText: {
      color: theme.textMuted,
      fontSize: fontSize.sm,
    },
  });

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.textContainer}>
        <Text style={styles.title}>{t('pwa.installTitle', 'Install HashWatch')}</Text>
        <Text style={styles.subtitle}>
          {t('pwa.installSubtitle', 'Add to home screen for quick access')}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('pwa.install', 'Install')}
        style={styles.installBtn}
        onPress={handleInstall}
      >
        <Text style={styles.installBtnText}>{t('pwa.install', 'Install')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close', 'Close')}
        style={styles.dismissBtn}
        onPress={handleDismiss}
      >
        <Text style={styles.dismissBtnText}>✕</Text>
      </Pressable>
    </View>
  );
}
