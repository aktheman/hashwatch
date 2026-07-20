import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/auth';
import { NavigationProp } from '../types';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import * as haptic from '../utils/haptics';

interface AlertChannel {
  id: string;
  type: 'sms' | 'telegram';
  config: Record<string, string>;
  createdAt: number;
}

async function apiCall(path: string, options: RequestInit = {}): Promise<unknown> {
  const { getBaseUrl } = await import('../api/client');
  const { useAuthStore: getAuth } = await import('../store/auth');
  const token = getAuth.getState().token;
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function AlertChannelsScreen(_props: { navigation: NavigationProp }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { token } = useAuthStore();

  const [channelList, setChannelList] = useState<AlertChannel[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState<'sms' | 'telegram'>('sms');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newChatId, setNewChatId] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    if (!token) return;
    try {
      const data = (await apiCall('/api/alert-channels')) as { channels: AlertChannel[] };
      setChannelList(data.channels);
    } catch (err) {
      console.warn('Failed to fetch alert channels:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChannels();
    setRefreshing(false);
  }, [fetchChannels]);

  const addChannel = useCallback(async () => {
    try {
      const config = newType === 'sms' ? { phoneNumber: newPhoneNumber } : { chatId: newChatId };
      await apiCall('/api/alert-channels', {
        method: 'POST',
        body: JSON.stringify({ type: newType, config }),
      });
      setNewPhoneNumber('');
      setNewChatId('');
      setShowAddModal(false);
      haptic.success();
      await fetchChannels();
    } catch (err: unknown) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
    }
  }, [newType, newPhoneNumber, newChatId, fetchChannels, t]);

  const deleteChannel = useCallback(
    async (id: string) => {
      try {
        await apiCall(`/api/alert-channels/${id}`, { method: 'DELETE' });
        haptic.success();
        await fetchChannels();
      } catch (err: unknown) {
        Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
      }
    },
    [fetchChannels, t],
  );

  const testChannel = useCallback(
    async (id: string) => {
      setTestingId(id);
      try {
        await apiCall(`/api/alert-channels/${id}/test`, { method: 'POST' });
        haptic.success();
        Alert.alert(t('alertChannels.testSent'), '');
      } catch (err: unknown) {
        Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
      } finally {
        setTestingId(null);
      }
    },
    [t],
  );

  const styles = StyleSheet.create({
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
    card: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: {
      color: theme.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
    },
    cardSub: {
      color: theme.textDim,
      fontSize: fontSize.sm,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: radius.sm,
    },
    typeText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
    },
    input: {
      backgroundColor: theme.surfaceLight,
      borderRadius: radius.md,
      padding: spacing.sm,
      color: theme.text,
      fontSize: fontSize.md,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: spacing.sm,
    },
    btn: {
      backgroundColor: theme.primary,
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: 'center',
    },
    btnText: {
      color: '#FFF',
      fontWeight: fontWeight.bold,
      fontSize: fontSize.md,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    testBtn: {
      flex: 1,
      backgroundColor: theme.primary + '20',
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: 'center',
    },
    deleteBtn: {
      flex: 1,
      backgroundColor: theme.danger + '20',
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: 'center',
    },
    emptyText: {
      color: theme.textDim,
      fontSize: fontSize.md,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
    typePicker: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    typeBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      alignItems: 'center',
      borderWidth: 1,
    },
  });

  const channelIcon = (type: string) => (type === 'sms' ? '📱' : '✈️');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <Text style={styles.title}>{t('alertChannels.title')}</Text>

      <View style={styles.section}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.xs,
          }}
        >
          <Text style={styles.sectionTitle}>{t('alertChannels.title')}</Text>
          <Pressable
            onPress={() => setShowAddModal(true)}
            accessibilityRole="button"
            accessibilityLabel={t('alertChannels.addChannel')}
          >
            <Text
              style={{
                color: theme.primary,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
              }}
            >
              + {t('alertChannels.addChannel')}
            </Text>
          </Pressable>
        </View>

        {channelList.length === 0 ? (
          <Text style={styles.emptyText}>{t('alertChannels.noChannels')}</Text>
        ) : (
          channelList.map((ch) => (
            <View key={ch.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={{ fontSize: 20 }}>{channelIcon(ch.type)}</Text>
                  <View>
                    <Text style={styles.cardTitle}>{t(`alertChannels.${ch.type}`)}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {ch.type === 'sms' ? ch.config.phoneNumber : ch.config.chatId}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        ch.type === 'sms' ? theme.success + '20' : theme.primary + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: ch.type === 'sms' ? theme.success : theme.primary },
                    ]}
                  >
                    {t(`alertChannels.${ch.type}`)}
                  </Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <Pressable
                  style={styles.testBtn}
                  onPress={() => testChannel(ch.id)}
                  disabled={testingId === ch.id}
                  accessibilityRole="button"
                  accessibilityLabel={t('alertChannels.test')}
                >
                  {testingId === ch.id ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text
                      style={{
                        color: theme.primary,
                        fontSize: fontSize.sm,
                        fontWeight: fontWeight.semibold,
                      }}
                    >
                      {t('alertChannels.test')}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => {
                    Alert.alert(
                      t('alertChannels.delete'),
                      t('alertChannels.deleteConfirm', 'Remove this alert channel?'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.delete'),
                          style: 'destructive',
                          onPress: () => deleteChannel(ch.id),
                        },
                      ],
                    );
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('alertChannels.delete')}
                >
                  <Text
                    style={{
                      color: theme.danger,
                      fontSize: fontSize.sm,
                      fontWeight: fontWeight.semibold,
                    }}
                  >
                    {t('alertChannels.delete')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <Modal visible={showAddModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
        >
          <View style={{ backgroundColor: theme.bg, borderRadius: radius.lg, padding: spacing.lg }}>
            <Text style={[styles.cardTitle, { marginBottom: spacing.md }]}>
              {t('alertChannels.addChannel')}
            </Text>

            <Text style={[styles.sectionTitle, { marginLeft: 0, marginBottom: spacing.xs }]}>
              {t('alertChannels.type')}
            </Text>
            <View style={styles.typePicker}>
              {(['sms', 'telegram'] as const).map((tp) => (
                <Pressable
                  key={tp}
                  style={[
                    styles.typeBtn,
                    {
                      borderColor: newType === tp ? theme.primary : theme.border,
                      backgroundColor: newType === tp ? theme.primary + '20' : theme.surface,
                    },
                  ]}
                  onPress={() => setNewType(tp)}
                  accessibilityRole="button"
                  accessibilityLabel={t(`alertChannels.${tp}`)}
                >
                  <Text
                    style={{
                      color: newType === tp ? theme.primary : theme.text,
                      fontWeight: fontWeight.semibold,
                      fontSize: fontSize.sm,
                    }}
                  >
                    {channelIcon(tp)} {t(`alertChannels.${tp}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {newType === 'sms' ? (
              <TextInput
                style={styles.input}
                value={newPhoneNumber}
                onChangeText={setNewPhoneNumber}
                placeholder={t('alertChannels.phoneNumber')}
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
                accessibilityLabel={t('alertChannels.phoneNumber')}
              />
            ) : (
              <TextInput
                style={styles.input}
                value={newChatId}
                onChangeText={setNewChatId}
                placeholder={t('alertChannels.chatId')}
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                accessibilityLabel={t('alertChannels.chatId')}
              />
            )}

            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Pressable
                style={[styles.btn, { flex: 1, backgroundColor: theme.surfaceLight }]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewPhoneNumber('');
                  setNewChatId('');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Text style={[styles.btnText, { color: theme.text }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, { flex: 1 }]}
                onPress={addChannel}
                accessibilityRole="button"
                accessibilityLabel={t('alertChannels.addChannel')}
              >
                <Text style={styles.btnText}>{t('alertChannels.addChannel')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
