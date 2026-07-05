import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useMinerStore } from '../store/miners';
import { useSubscriptionStore } from '../store/subscription';
import { scanNetwork, DiscoveredMiner } from '../discovery/localNetwork';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { NavigationProp } from '../types';
import { useTranslation } from 'react-i18next';

interface AddMinerScreenProps {
  navigation: NavigationProp;
}

export function AddMinerScreen({ navigation }: AddMinerScreenProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [ip, setIp] = useState('');
  const [name, setName] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [foundMiners, setFoundMiners] = useState<DiscoveredMiner[]>([]);
  const [error, setError] = useState('');
  const [scanProgress, setScanProgress] = useState({ found: 0, scanned: 0, total: 0 });
  const scanAbortRef = useRef<AbortController | null>(null);

  const addMiner = useMinerStore((s) => s.addMiner);
  const miners = useMinerStore((s) => s.miners);
  const canAddMiner = useSubscriptionStore((s) => s.canAddMiner);

  const handleAddByIP = async () => {
    if (!ip.trim()) return;
    if (!canAddMiner(miners.length)) {
      setError(t('addMiner.upgradePro'));
      return;
    }
    setConnecting(true);
    setError('');
    try {
      await addMiner(ip.trim(), 80, name.trim() || undefined);
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('addMiner.failedToConnect'));
    } finally {
      setConnecting(false);
    }
  };

  const handleScan = async () => {
    const controller = new AbortController();
    scanAbortRef.current = controller;
    setScanning(true);
    setError('');
    setFoundMiners([]);
    setScanProgress({ found: 0, scanned: 0, total: 0 });
    try {
      const found = await scanNetwork(
        (found, scanned, total) => setScanProgress({ found, scanned, total }),
        120000,
        controller.signal,
      );
      setFoundMiners(found);
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : t('addMiner.scanFailed'));
    } finally {
      setScanning(false);
      scanAbortRef.current = null;
    }
  };

  const handleCancelScan = () => {
    scanAbortRef.current?.abort();
  };

  const handleAddDiscovered = async (m: DiscoveredMiner) => {
    if (!canAddMiner(miners.length)) {
      setError(t('addMiner.upgradePro'));
      return;
    }
    setConnecting(true);
    setError('');
    try {
      await addMiner(m.ip, m.port);
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('addMiner.failedToConnect'));
    } finally {
      setConnecting(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
          padding: 16,
        },
        scrollContent: {
          paddingBottom: 40,
        },
        card: {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.border,
        },
        sectionTitle: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.bold,
          marginBottom: 12,
        },
        input: {
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: 14,
          color: theme.text,
          fontSize: fontSize.md,
          fontFamily: 'monospace',
          marginBottom: 10,
          borderWidth: 1,
          borderColor: theme.border,
        },
        primaryBtn: {
          backgroundColor: theme.primary,
          borderRadius: radius.md,
          padding: 14,
          alignItems: 'center',
          marginTop: spacing.xxs,
        },
        primaryBtnText: {
          color: '#FFF',
          fontWeight: fontWeight.bold,
          fontSize: fontSize.md,
        },
        secondaryBtn: {
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.border,
        },
        secondaryBtnText: {
          color: theme.text,
          fontWeight: fontWeight.semibold,
          fontSize: fontSize.md,
        },
        btnDisabled: {
          opacity: 0.5,
        },
        divider: {
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: 20,
        },
        dividerLine: {
          flex: 1,
          height: 1,
          backgroundColor: theme.border,
        },
        dividerText: {
          color: theme.textMuted,
          marginHorizontal: 12,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
        foundSection: {
          marginTop: spacing.xs,
        },
        foundTitle: {
          color: theme.success,
          fontSize: fontSize.base,
          fontWeight: fontWeight.bold,
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        foundItem: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.surface,
          padding: 14,
          borderRadius: radius.md,
          marginBottom: 6,
          borderWidth: 1,
          borderColor: theme.border,
        },
        foundLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        foundIcon: {
          fontSize: fontSize.base,
          color: theme.primary,
        },
        foundIP: {
          color: theme.text,
          fontFamily: 'monospace',
          fontSize: fontSize.md,
          fontWeight: fontWeight.regular,
        },
        foundAddBadge: {
          backgroundColor: theme.primary + '26',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.sm,
        },
        foundAdd: {
          color: theme.primaryLight,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.base,
        },
        errorBox: {
          backgroundColor: theme.danger + '1A',
          borderRadius: radius.md,
          padding: 12,
          marginTop: spacing.md,
          borderWidth: 1,
          borderColor: theme.danger + '33',
        },
        errorText: {
          color: theme.danger,
          fontSize: fontSize.base,
          fontWeight: fontWeight.regular,
        },
      }),
    [theme],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('addMiner.addByIp')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('addMiner.ipPlaceholder')}
          placeholderTextColor={theme.textMuted}
          value={ip}
          onChangeText={setIp}
          keyboardType="numeric"
          autoCapitalize="none"
          accessibilityLabel="IP address input"
        />
        <TextInput
          style={styles.input}
          placeholder={t('addMiner.namePlaceholder')}
          placeholderTextColor={theme.textMuted}
          value={name}
          onChangeText={setName}
          accessibilityLabel="Miner name input"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add Miner"
          style={[styles.primaryBtn, (connecting || !ip.trim()) && styles.btnDisabled]}
          onPress={handleAddByIP}
          disabled={connecting || !ip.trim()}
        >
          {connecting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>{t('addMiner.addMiner')}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t('addMiner.or')}</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('addMiner.scanNetwork')}</Text>
        {scanning && scanProgress.total > 0 && (
          <View style={{ marginBottom: 10 }}>
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.border,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${(scanProgress.scanned / scanProgress.total) * 100}%`,
                  height: '100%',
                  backgroundColor: theme.primary,
                }}
              />
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: spacing.xxs }}>
              {t('addMiner.scanProgress', {
                scanned: scanProgress.scanned,
                total: scanProgress.total,
                found: scanProgress.found,
              })}
            </Text>
          </View>
        )}
        {scanning ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel Scan"
            style={[styles.secondaryBtn, { borderColor: theme.danger }]}
            onPress={handleCancelScan}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.danger }]}>
              {t('addMiner.cancelScan')}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Find Miners"
            style={styles.secondaryBtn}
            onPress={handleScan}
          >
            <Text style={styles.secondaryBtnText}>{t('addMiner.findMiners')}</Text>
          </Pressable>
        )}
      </View>

      {foundMiners.length > 0 && (
        <View style={styles.foundSection}>
          <Text style={styles.foundTitle}>
            {t('addMiner.foundMiners', { count: foundMiners.length })}
          </Text>
          {foundMiners.map((m) => (
            <Pressable
              accessibilityRole="button"
              key={m.ip}
              accessibilityLabel={`Add miner: ${m.ip}`}
              style={styles.foundItem}
              onPress={() => handleAddDiscovered(m)}
            >
              <View style={styles.foundLeft}>
                <Text style={styles.foundIcon}>⬡</Text>
                <Text style={styles.foundIP}>{m.ip}</Text>
              </View>
              <View style={styles.foundAddBadge}>
                <Text style={styles.foundAdd}>{t('common.add')}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠ {error}</Text>
          {Platform.OS === 'web' && (
            <Text
              style={[
                styles.errorText,
                { marginTop: spacing.xs, fontSize: fontSize.sm, lineHeight: 16 },
              ]}
            >
              Web requires a local proxy to reach miners on your network. Go to Settings → add your
              proxy URL (e.g. http://localhost:4567) and run{' '}
              <Text style={{ fontFamily: 'monospace', color: theme.primaryLight }}>
                node local-proxy.js
              </Text>{' '}
              on this machine.
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}
