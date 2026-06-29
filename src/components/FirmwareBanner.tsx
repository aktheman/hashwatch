import { useState, useEffect } from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import {
  parseVersion,
  needsUpdate,
  LATEST_FIRMWARE,
  getFirmwareUrl,
  fetchLatestFirmware,
} from '../utils/version';
import { spacing, radius, fontWeight } from '../utils/design';

interface FirmwareBannerProps {
  rawVersion: string | null | undefined;
}

export function FirmwareBanner({ rawVersion }: FirmwareBannerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestFirmware().then((v) => setLatest(v));
  }, []);

  if (!rawVersion) return null;

  const parsed = parseVersion(rawVersion);
  if (!parsed) return null;

  const target = latest || LATEST_FIRMWARE;
  if (!needsUpdate(parsed, target)) return null;

  const handlePress = () => {
    const url = getFirmwareUrl();
    Linking.openURL(url).catch((e: unknown) => console.warn('Failed to open firmware URL:', e));
  };

  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.banner, { backgroundColor: theme.warning + '1A', borderColor: theme.warning }]}
      onPress={handlePress}
    >
      <Text style={styles.icon}>⬆</Text>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: theme.warning }]}>
          {t('firmwareBanner.updateAvailable')}
        </Text>
        <Text style={[styles.detail, { color: theme.textDim }]}>
          {parsed} → {target}
        </Text>
      </View>
      <Text style={[styles.arrow, { color: theme.textMuted }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 14,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  detail: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  arrow: {
    fontSize: 22,
    fontWeight: fontWeight.regular,
  },
});
