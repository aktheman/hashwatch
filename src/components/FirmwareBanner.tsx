import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import {
  parseVersion,
  needsUpdate,
  LATEST_FIRMWARE,
  getFirmwareUrl,
  fetchLatestFirmware,
} from '../utils/version';

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
    Linking.openURL(url).catch(() => {});
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[styles.banner, { backgroundColor: theme.warning + '1A', borderColor: theme.warning }]}
      onPress={handlePress}
      activeOpacity={0.7}
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  icon: {
    fontSize: 20,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  detail: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  arrow: {
    fontSize: 22,
    fontWeight: '300',
  },
});
