import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import {
  getChannels,
  saveChannel,
  deleteChannel,
  testChannel,
  type NotificationChannel,
} from '../services/notificationChannels';
import * as haptic from '../utils/haptics';

type ChannelType = NotificationChannel['type'];

const CHANNEL_TYPES: ChannelType[] = ['push', 'email', 'sms', 'telegram', 'slack', 'discord'];

const CHANNEL_ICONS: Record<ChannelType, string> = {
  push: '\u{1F4F1}',
  email: '\u{1F4E7}',
  sms: '\u{1F4AC}',
  telegram: '\u2708\uFE0F',
  slack: '\u{1F4AC}',
  discord: '\u{1F3AE}',
};

const TYPE_COLORS: Record<ChannelType, string> = {
  push: '#4CAF50',
  email: '#2196F3',
  sms: '#FF9800',
  telegram: '#0088CC',
  slack: '#E01E5A',
  discord: '#5865F2',
};

interface ConfigField {
  key: string;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url' | 'number-pad';
}

function getConfigFields(type: ChannelType): ConfigField[] {
  switch (type) {
    case 'email':
      return [
        {
          key: 'to',
          label: 'Email Address',
          placeholder: 'you@example.com',
          keyboardType: 'email-address',
        },
        { key: 'apiKey', label: 'API Key', placeholder: 'EmailJS API key' },
        { key: 'serviceId', label: 'Service ID', placeholder: 'EmailJS service ID' },
        { key: 'templateId', label: 'Template ID', placeholder: 'EmailJS template ID' },
      ];
    case 'sms':
      return [
        { key: 'to', label: 'Phone Number', placeholder: '+1234567890', keyboardType: 'phone-pad' },
        { key: 'accountSid', label: 'Twilio Account SID', placeholder: 'ACxxxx...' },
        { key: 'authToken', label: 'Twilio Auth Token', placeholder: 'Your auth token' },
        {
          key: 'from',
          label: 'Twilio From Number',
          placeholder: '+1234567890',
          keyboardType: 'phone-pad',
        },
      ];
    case 'telegram':
      return [
        { key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-DEF...' },
        {
          key: 'chatId',
          label: 'Chat ID',
          placeholder: '-100123456789',
          keyboardType: 'number-pad',
        },
      ];
    case 'slack':
      return [
        {
          key: 'webhookUrl',
          label: 'Webhook URL',
          placeholder: 'https://hooks.slack.com/...',
          keyboardType: 'url',
        },
      ];
    case 'discord':
      return [
        {
          key: 'webhookUrl',
          label: 'Webhook URL',
          placeholder: 'https://discord.com/api/webhooks/...',
          keyboardType: 'url',
        },
      ];
    case 'push':
      return [];
  }
}

export function NotificationChannelsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState<ChannelType>('push');
  const [newName, setNewName] = useState('');
  const [newConfig, setNewConfig] = useState<Record<string, string>>({});

  const fetchChannels = useCallback(async () => {
    try {
      const list = await getChannels();
      setChannels(list);
    } catch {
      // storage unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleToggle = useCallback(
    async (channel: NotificationChannel) => {
      setTogglingId(channel.id);
      try {
        await saveChannel({ ...channel, enabled: !channel.enabled });
        haptic.light();
        await fetchChannels();
      } catch {
        // silent
      } finally {
        setTogglingId(null);
      }
    },
    [fetchChannels],
  );

  const handleTest = useCallback(
    async (channel: NotificationChannel) => {
      setTestingId(channel.id);
      try {
        const success = await testChannel(channel);
        haptic[success ? 'success' : 'error']();
        Alert.alert(
          success
            ? t('notificationChannels.testSuccess', 'Test Sent')
            : t('notificationChannels.testFailed', 'Test Failed'),
          '',
        );
      } catch {
        haptic.error();
        Alert.alert(t('notificationChannels.testFailed', 'Test Failed'), '');
      } finally {
        setTestingId(null);
      }
    },
    [t],
  );

  const handleDelete = useCallback(
    (channel: NotificationChannel) => {
      Alert.alert(
        t('notificationChannels.deleteTitle', 'Delete Channel'),
        t('notificationChannels.deleteConfirm', 'Remove this notification channel?'),
        [
          { text: t('common.cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('common.delete', 'Delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteChannel(channel.id);
                haptic.success();
                await fetchChannels();
              } catch {
                // silent
              }
            },
          },
        ],
      );
    },
    [fetchChannels, t],
  );

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) {
      Alert.alert(
        t('common.error', 'Error'),
        t('notificationChannels.nameRequired', 'Name is required'),
      );
      return;
    }
    const configFields = getConfigFields(newType);
    for (const field of configFields) {
      if (!newConfig[field.key]?.trim()) {
        Alert.alert(
          t('common.error', 'Error'),
          t('notificationChannels.configRequired', '{{field}} is required', { field: field.label }),
        );
        return;
      }
    }
    try {
      await saveChannel({
        name: newName.trim(),
        type: newType,
        enabled: true,
        config: newConfig,
        events: [],
      });
      haptic.success();
      setNewName('');
      setNewConfig({});
      setShowAddForm(false);
      await fetchChannels();
    } catch {
      // silent
    }
  }, [newType, newName, newConfig, fetchChannels, t]);

  const resetAddForm = useCallback(() => {
    setShowAddForm(false);
    setNewName('');
    setNewConfig({});
    setNewType('push');
  }, []);

  const configFields = useMemo(() => getConfigFields(newType), [newType]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        scrollContent: {
          padding: spacing.md,
        },
        header: {
          marginTop: spacing.xs,
          marginBottom: spacing.lg,
        },
        title: {
          color: theme.text,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.bold,
        },
        subtitle: {
          color: theme.textMuted,
          fontSize: fontSize.sm,
          marginTop: spacing.xxs,
        },
        sectionTitle: {
          color: theme.textMuted,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: spacing.xs,
          marginLeft: spacing.xxs,
        },
        card: {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.sm,
          borderWidth: 1,
          borderColor: theme.border,
        },
        cardHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        cardLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          flex: 1,
        },
        channelIcon: {
          fontSize: 22,
        },
        cardInfo: {
          flex: 1,
        },
        cardName: {
          color: theme.text,
          fontSize: fontSize.md,
          fontWeight: fontWeight.bold,
        },
        cardDetail: {
          color: theme.textMuted,
          fontSize: fontSize.xs,
          marginTop: spacing.xxs,
        },
        typeBadge: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xxs,
          borderRadius: radius.sm,
          marginLeft: spacing.sm,
        },
        typeBadgeText: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
        },
        toggleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.sm,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        },
        toggleLabel: {
          color: theme.textMuted,
          fontSize: fontSize.sm,
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
        testBtnText: {
          color: theme.primary,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        deleteBtn: {
          flex: 1,
          backgroundColor: theme.danger + '20',
          borderRadius: radius.md,
          padding: spacing.sm,
          alignItems: 'center',
        },
        deleteBtnText: {
          color: theme.danger,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        addSection: {
          marginTop: spacing.lg,
        },
        addHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
        },
        addToggle: {
          padding: spacing.xxs,
        },
        addToggleText: {
          color: theme.primary,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
        },
        formCard: {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: theme.border,
        },
        formLabel: {
          color: theme.textMuted,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          marginBottom: spacing.xxs,
          marginLeft: spacing.xxs,
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
        typePickerRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.xs,
          marginBottom: spacing.sm,
        },
        typeBtn: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radius.md,
          borderWidth: 1,
          alignItems: 'center',
        },
        typeBtnText: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
        },
        formActions: {
          flexDirection: 'row',
          gap: spacing.xs,
          marginTop: spacing.xs,
        },
        cancelBtn: {
          flex: 1,
          backgroundColor: theme.surfaceLight,
          borderRadius: radius.md,
          padding: spacing.sm,
          alignItems: 'center',
        },
        cancelBtnText: {
          color: theme.text,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.md,
        },
        submitBtn: {
          flex: 1,
          backgroundColor: theme.primary,
          borderRadius: radius.md,
          padding: spacing.sm,
          alignItems: 'center',
        },
        submitBtnText: {
          color: '#FFF',
          fontWeight: fontWeight.bold,
          fontSize: fontSize.md,
        },
        emptyContainer: {
          alignItems: 'center',
          paddingVertical: spacing.xxl,
        },
        emptyIcon: {
          fontSize: 40,
          marginBottom: spacing.md,
        },
        emptyText: {
          color: theme.textMuted,
          fontSize: fontSize.md,
          textAlign: 'center',
        },
        emptySubtext: {
          color: theme.textMuted,
          fontSize: fontSize.sm,
          textAlign: 'center',
          marginTop: spacing.xs,
        },
      }),
    [theme],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.scrollContent,
            { alignItems: 'center', justifyContent: 'center', flex: 1 },
          ]}
        >
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('notificationChannels.title', 'Notification Channels')}</Text>
        <Text style={styles.subtitle}>
          {t('notificationChannels.subtitle', 'Configure multi-channel notification delivery')}
        </Text>
      </View>

      <View>
        <Text style={styles.sectionTitle}>
          {t('notificationChannels.configured', 'Configured Channels')}
        </Text>

        {channels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>
              {t('notificationChannels.empty', 'No notification channels configured')}
            </Text>
            <Text style={styles.emptySubtext}>
              {t('notificationChannels.emptyHint', 'Add a channel below to start receiving alerts')}
            </Text>
          </View>
        ) : (
          channels.map((ch) => (
            <View key={ch.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={styles.channelIcon}>{CHANNEL_ICONS[ch.type]}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{ch.name}</Text>
                    <Text style={styles.cardDetail} numberOfLines={1}>
                      {ch.type}
                    </Text>
                  </View>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[ch.type] + '20' }]}>
                  <Text style={[styles.typeBadgeText, { color: TYPE_COLORS[ch.type] }]}>
                    {ch.type.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>
                  {ch.enabled
                    ? t('notificationChannels.enabled', 'Enabled')
                    : t('notificationChannels.disabled', 'Disabled')}
                </Text>
                {togglingId === ch.id ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Switch
                    value={ch.enabled}
                    onValueChange={() => handleToggle(ch)}
                    trackColor={{ false: theme.border, true: theme.primary + '60' }}
                    thumbColor={ch.enabled ? theme.primary : theme.textMuted}
                  />
                )}
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.testBtn}
                  onPress={() => handleTest(ch)}
                  disabled={testingId === ch.id}
                  accessibilityRole="button"
                  accessibilityLabel={t('notificationChannels.test', 'Test')}
                >
                  {testingId === ch.id ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text style={styles.testBtnText}>{t('notificationChannels.test', 'Test')}</Text>
                  )}
                </Pressable>
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(ch)}
                  accessibilityRole="button"
                  accessibilityLabel={t('notificationChannels.delete', 'Delete')}
                >
                  <Text style={styles.deleteBtnText}>
                    {t('notificationChannels.delete', 'Delete')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.addSection}>
        <View style={styles.addHeader}>
          <Text style={styles.sectionTitle}>
            {t('notificationChannels.addChannel', 'Add Channel')}
          </Text>
          <Pressable
            style={styles.addToggle}
            onPress={() => setShowAddForm(!showAddForm)}
            accessibilityRole="button"
            accessibilityLabel={
              showAddForm
                ? t('common.cancel', 'Cancel')
                : t('notificationChannels.addChannel', 'Add Channel')
            }
          >
            <Text style={styles.addToggleText}>
              {showAddForm
                ? t('common.cancel', 'Cancel')
                : `+ ${t('notificationChannels.addChannel', 'Add Channel')}`}
            </Text>
          </Pressable>
        </View>

        {showAddForm && (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>{t('notificationChannels.type', 'Type')}</Text>
            <View style={styles.typePickerRow}>
              {CHANNEL_TYPES.map((tp) => (
                <Pressable
                  key={tp}
                  style={[
                    styles.typeBtn,
                    {
                      borderColor: newType === tp ? TYPE_COLORS[tp] : theme.border,
                      backgroundColor: newType === tp ? TYPE_COLORS[tp] + '20' : theme.surface,
                    },
                  ]}
                  onPress={() => {
                    setNewType(tp);
                    setNewConfig({});
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t(`notificationChannels.type_${tp}`, tp)}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: newType === tp ? TYPE_COLORS[tp] : theme.text },
                    ]}
                  >
                    {CHANNEL_ICONS[tp]} {t(`notificationChannels.type_${tp}`, tp)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.formLabel}>{t('notificationChannels.name', 'Name')}</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('notificationChannels.namePlaceholder', 'My Channel')}
              placeholderTextColor={theme.textMuted}
              accessibilityLabel={t('notificationChannels.name', 'Name')}
            />

            {configFields.map((field) => (
              <View key={field.key}>
                <Text style={styles.formLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={newConfig[field.key] || ''}
                  onChangeText={(val) => setNewConfig((prev) => ({ ...prev, [field.key]: val }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.textMuted}
                  keyboardType={field.keyboardType || 'default'}
                  secureTextEntry={field.key.includes('token') || field.key.includes('auth')}
                  accessibilityLabel={field.label}
                />
              </View>
            ))}

            <View style={styles.formActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={resetAddForm}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel', 'Cancel')}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel', 'Cancel')}</Text>
              </Pressable>
              <Pressable
                style={styles.submitBtn}
                onPress={handleAdd}
                accessibilityRole="button"
                accessibilityLabel={t('notificationChannels.addChannel', 'Add Channel')}
              >
                <Text style={styles.submitBtnText}>
                  {t('notificationChannels.addChannel', 'Add Channel')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
