import { Text, StyleSheet, Animated } from 'react-native';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useNetworkStatus } from '../services/networkStatus';
import { getPendingChanges } from '../services/syncService';
import { spacing, fontSize, fontWeight } from '../utils/design';

type BannerState = 'online' | 'offline' | 'syncing';

export const OfflineIndicator = React.memo(function OfflineIndicator() {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const [bannerState, setBannerState] = useState<BannerState>('online');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isOnline) {
      setBannerState('offline');
    } else if (pendingCount > 0) {
      setBannerState('syncing');
    } else {
      setBannerState('online');
    }
  }, [isOnline, pendingCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      const changes = getPendingChanges();
      setPendingCount(changes.length);
    }, 2000);
    if (typeof interval === 'object' && interval !== null && 'unref' in interval) {
      (interval as { unref: () => void }).unref();
    }
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: bannerState === 'online' ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [bannerState, opacity]);

  const bgColor = useMemo(() => {
    if (bannerState === 'syncing') return theme.warning;
    if (bannerState === 'offline') return theme.danger;
    return theme.warning;
  }, [bannerState, theme]);

  const message = useMemo(() => {
    if (bannerState === 'syncing') return t('offline.syncing');
    if (bannerState === 'offline') return t('offline.banner');
    return '';
  }, [bannerState, t]);

  if (bannerState === 'online') return null;

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: bgColor, opacity }]}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  text: {
    color: '#000',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
