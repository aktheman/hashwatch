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

interface BotChannel {
  id: string;
  type: 'discord' | 'telegram';
  webhookUrl: string;
  name: string;
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

export function BotChannelsScreen(_props: { navigation: NavigationProp }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { token } = useAuthStore();

  const [channelList, setChannelList] = useState<BotChannel[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState<'discord' | 'telegram'>('discord');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchChannels = useCallback(async () => {
    if (!token) return;
    try {
      const data = (await apiCall('/api/bot-channels')) as { channels: BotChannel[] };
      setChannelList(data.channels);
    } catch (err) {
      console.warn('Failed to fetch bot channels:', err);
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

  const handleAdd = async () => {
    if (!newWebhookUrl || !newName) return;
    setSaving(true);
    try {
      await apiCall('/api/bot-channels', {
        method: 'POST',
        body: JSON.stringify({ type: newType, webhookUrl: newWebhookUrl, name: newName }),
      });
      setShowAddModal(false);
      setNewWebhookUrl('');
      setNewName('');
      haptic.success();
      await fetchChannels();
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (ch: BotChannel) => {
    Alert.alert(t('botChannels.delete'), `Remove "${ch.name}"?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await apiCall(`/api/bot-channels/${ch.id}`, { method: 'DELETE' });
            haptic.light();
            await fetchChannels();
          } catch (err) {
            Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Failed');
          }
        },
      },
    ]);
  };

  const handleTest = async (ch: BotChannel) => {
    setTestingId(ch.id);
    try {
      await apiCall(`/api/bot-channels/${ch.id}/test`, { method: 'POST' });
      haptic.success();
      Alert.alert(t('botChannels.testSent'), `${ch.name}`);
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Failed');
    } finally {
      setTestingId(null);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg, padding: spacing.md },
    title: {
      color: theme.text,
      fontSize: fontSize.h3,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.lg,
      marginTop: spacing.xs,
      letterSpacing: -0.5,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.surface,
      padding: spacing.md,
      borderRadius: radius.lg,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rowInfo: { flex: 1, gap: 2 },
    rowName: { color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    rowSub: { color: theme.textDim, fontSize: fontSize.sm },
    rowActions: { flexDirection: 'row', gap: spacing.xs },
    btnSmall: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
    },
    btnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    emptyContainer: {
      alignItems: 'center',
      padding: spacing.xl,
      gap: spacing.sm,
    },
    emptyText: { color: theme.textDim, fontSize: fontSize.md },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalTitle: { color: theme.text, fontSize: fontSize.h3, fontWeight: fontWeight.bold },
    input: {
      backgroundColor: theme.surfaceLight,
      borderRadius: radius.md,
      padding: spacing.sm,
      color: theme.text,
      fontSize: fontSize.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    typeRow: { flexDirection: 'row', gap: spacing.xs },
    typeBtn: {
      flex: 1,
      padding: spacing.sm,
      borderRadius: radius.md,
      alignItems: 'center',
      borderWidth: 1,
    },
    addBtn: {
      backgroundColor: theme.primary,
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: 'center',
    },
    addBtnText: { color: '#FFF', fontWeight: fontWeight.bold, fontSize: fontSize.md },
    cancelBtn: {
      backgroundColor: theme.surfaceLight,
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: 'center',
    },
    cancelBtnText: { color: theme.text, fontWeight: fontWeight.semibold },
    fab: {
      position: 'absolute',
      right: spacing.lg,
      bottom: spacing.lg,
      backgroundColor: theme.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    fabText: { color: '#FFF', fontSize: 24, fontWeight: fontWeight.bold },
    discordIcon: { fontSize: 18 },
    telegramIcon: { fontSize: 18 },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('botChannels.title')}</Text>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        contentContainerStyle={channelList.length === 0 ? styles.emptyContainer : undefined}
      >
        {channelList.length === 0 ? (
          <Text style={styles.emptyText}>{t('botChannels.noChannels')}</Text>
        ) : (
          channelList.map((ch) => (
            <View key={ch.id} style={styles.row}>
              <View style={{ marginRight: spacing.sm }}>
                <Text style={ch.type === 'discord' ? styles.discordIcon : styles.telegramIcon}>
                  {ch.type === 'discord' ? '💬' : '📨'}
                </Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{ch.name}</Text>
                <Text style={styles.rowSub}>
                  {ch.type === 'discord' ? t('botChannels.discord') : t('botChannels.telegram')}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  style={[styles.btnSmall, { backgroundColor: theme.primary + '20' }]}
                  onPress={() => handleTest(ch)}
                  disabled={testingId === ch.id}
                  accessibilityRole="button"
                  accessibilityLabel={t('botChannels.test')}
                >
                  {testingId === ch.id ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text style={[styles.btnText, { color: theme.primary }]}>
                      {t('botChannels.test')}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.btnSmall, { backgroundColor: theme.danger + '20' }]}
                  onPress={() => handleDelete(ch)}
                  accessibilityRole="button"
                  accessibilityLabel={t('botChannels.delete')}
                >
                  <Text style={[styles.btnText, { color: theme.danger }]}>
                    {t('botChannels.delete')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => {
          haptic.medium();
          setShowAddModal(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={t('botChannels.addBot')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('botChannels.addBot')}</Text>

            <Text style={{ color: theme.textDim, fontSize: fontSize.sm }}>
              {t('botChannels.discord')} / {t('botChannels.telegram')}
            </Text>
            <View style={styles.typeRow}>
              <Pressable
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor:
                      newType === 'discord' ? theme.primary + '20' : theme.surfaceLight,
                    borderColor: newType === 'discord' ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setNewType('discord')}
              >
                <Text
                  style={{
                    color: newType === 'discord' ? theme.primary : theme.text,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  💬 {t('botChannels.discord')}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor:
                      newType === 'telegram' ? theme.primary + '20' : theme.surfaceLight,
                    borderColor: newType === 'telegram' ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setNewType('telegram')}
              >
                <Text
                  style={{
                    color: newType === 'telegram' ? theme.primary : theme.text,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  📨 {t('botChannels.telegram')}
                </Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('botChannels.botName')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={newWebhookUrl}
              onChangeText={setNewWebhookUrl}
              placeholder={t('botChannels.webhookUrl')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Pressable
                style={[styles.addBtn, { flex: 1 }]}
                onPress={handleAdd}
                disabled={saving || !newWebhookUrl || !newName}
                accessibilityRole="button"
                accessibilityLabel={t('common.add')}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.addBtnText}>{t('common.add')}</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.cancelBtn, { flex: 1 }]}
                onPress={() => {
                  haptic.light();
                  setShowAddModal(false);
                  setNewWebhookUrl('');
                  setNewName('');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
