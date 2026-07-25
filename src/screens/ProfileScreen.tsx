import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Switch,
  Platform,
} from 'react-native';
import { useAuthStore } from '../store/auth';
import { useTheme } from '../theme';
import { useMinerStore } from '../store/miners';
import { useSubscriptionStore } from '../store/subscription';
import { useTranslation } from 'react-i18next';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import * as haptic from '../utils/haptics';
import { useNavigation } from '@react-navigation/native';
import { putSetting as putRemoteSetting } from '../api/client';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const { token, userId, email, logout } = useAuthStore();
  const { miners } = useMinerStore();
  const { isPro } = useSubscriptionStore();

  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: t('profile.title'),
      headerStyle: { backgroundColor: theme.bg },
      headerTintColor: theme.text,
    });
  }, [navigation, theme, t]);

  const handleSavePassword = useCallback(async () => {
    if (newPassword.length < 8) {
      Alert.alert(t('profile.error'), t('profile.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('profile.error'), t('profile.passwordMismatch'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change password');
      }
      haptic.success();
      Alert.alert(t('profile.success'), t('profile.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      haptic.error();
      Alert.alert(t('profile.error'), err.message || t('profile.changePasswordFailed'));
    } finally {
      setSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword, token, t]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(t('profile.deleteAccount'), t('profile.deleteAccountConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(
              `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/account`,
              {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            haptic.success();
            logout();
          } catch {
            haptic.error();
            Alert.alert(t('profile.error'), t('profile.deleteAccountFailed'));
          }
        },
      },
    ]);
  }, [token, logout, t]);

  const onlineMiners = miners.filter((m) => m.status !== 'offline').length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} testID="profile-screen">
      <View style={[styles.avatarSection, { backgroundColor: theme.surface }]}>
        <View style={[styles.avatar, { backgroundColor: theme.primary + '30' }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>
            {(email || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.email, { color: theme.text }]}>
          {email || t('profile.notSignedIn')}
        </Text>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: isPro ? theme.success + '26' : theme.surfaceLight },
            ]}
          >
            <Text style={[styles.badgeText, { color: isPro ? theme.success : theme.textDim }]}>
              {isPro ? t('settings.pro') : t('settings.free')}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textDim }]}>{t('profile.stats')}</Text>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{miners.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>
              {t('profile.totalMiners')}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.success }]}>{onlineMiners}</Text>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>{t('profile.online')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.danger }]}>
              {miners.length - onlineMiners}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textDim }]}>{t('profile.offline')}</Text>
          </View>
        </View>
      </View>

      {token && (
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textDim }]}>
              {t('profile.changePassword')}
            </Text>
          </View>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border },
            ]}
            placeholder={t('profile.currentPassword')}
            placeholderTextColor={theme.textDim}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            accessibilityLabel={t('profile.currentPassword')}
          />
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border },
            ]}
            placeholder={t('profile.newPassword')}
            placeholderTextColor={theme.textDim}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            accessibilityLabel={t('profile.newPassword')}
          />
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border },
            ]}
            placeholder={t('profile.confirmPassword')}
            placeholderTextColor={theme.textDim}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            accessibilityLabel={t('profile.confirmPassword')}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.updatePassword')}
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}
            onPress={() => {
              haptic.medium();
              handleSavePassword();
            }}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? t('profile.saving') : t('profile.updatePassword')}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textDim }]}>
          {t('profile.dangerZone')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.signOut')}
          style={[styles.dangerBtn, { borderColor: theme.danger }]}
          onPress={() => {
            haptic.medium();
            Alert.alert(t('profile.signOut'), t('profile.signOutConfirm'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('profile.signOut'), style: 'destructive', onPress: logout },
            ]);
          }}
        >
          <Text style={[styles.dangerBtnText, { color: theme.danger }]}>
            {t('profile.signOut')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.deleteAccount')}
          style={[styles.dangerBtn, { borderColor: theme.danger + '60' }]}
          onPress={() => {
            haptic.warning();
            handleDeleteAccount();
          }}
        >
          <Text style={[styles.dangerBtnText, { color: theme.danger }]}>
            {t('profile.deleteAccount')}
          </Text>
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    margin: spacing.md,
    borderRadius: radius.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 28, fontWeight: fontWeight.bold },
  email: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  badgeRow: { flexDirection: 'row', marginTop: spacing.xs },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: radius.md,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.xs, marginTop: spacing.xxs },
  statDivider: { width: 1, height: 32 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSize.base,
    marginBottom: spacing.sm,
  },
  saveBtn: {
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  dangerBtn: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dangerBtnText: { fontWeight: fontWeight.semibold, fontSize: fontSize.base },
});
