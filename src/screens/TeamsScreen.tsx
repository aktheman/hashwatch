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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useAuthStore } from '../store/auth';
import { NavigationProp } from '../types';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import * as haptic from '../utils/haptics';

interface Team {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  role: string;
  createdAt: number;
}

interface Invitation {
  id: string;
  teamId: string;
  email: string;
  role: string;
  invitedBy: string;
  createdAt: number;
  status: string;
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

export function TeamsScreen(_props: { navigation: NavigationProp }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { token } = useAuthStore();

  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'admin'>('viewer');

  const fetchTeams = useCallback(async () => {
    if (!token) return;
    try {
      const data = (await apiCall('/api/teams')) as {
        teams: Team[];
        invitations: Invitation[];
      };
      setTeamsList(data.teams);
      setInvitations(data.invitations);
    } catch (err) {
      console.warn('Failed to fetch teams:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTeams();
    setRefreshing(false);
  }, [fetchTeams]);

  const createTeam = useCallback(async () => {
    if (!newTeamName.trim()) return;
    try {
      await apiCall('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      setNewTeamName('');
      setShowCreateModal(false);
      haptic.success();
      await fetchTeams();
    } catch (err: unknown) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
    }
  }, [newTeamName, fetchTeams, t]);

  const acceptInvite = useCallback(
    async (invite: Invitation) => {
      try {
        await apiCall(`/api/teams/${invite.teamId}/accept`, { method: 'POST' });
        haptic.success();
        await fetchTeams();
      } catch (err: unknown) {
        Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
      }
    },
    [fetchTeams, t],
  );

  const leaveTeam = useCallback(
    async (teamId: string) => {
      try {
        await apiCall(`/api/teams/${teamId}/leave`, { method: 'DELETE' });
        haptic.success();
        setSelectedTeam(null);
        await fetchTeams();
      } catch (err: unknown) {
        Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
      }
    },
    [fetchTeams, t],
  );

  const inviteMember = useCallback(async () => {
    if (!selectedTeam || !inviteEmail.trim()) return;
    try {
      await apiCall(`/api/teams/${selectedTeam.id}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      setInviteEmail('');
      setShowInviteModal(false);
      haptic.success();
      Alert.alert(t('common.success'), t('teams.inviteSent', 'Invitation sent'));
    } catch (err: unknown) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
    }
  }, [selectedTeam, inviteEmail, inviteRole, t]);

  const roleColors: Record<string, string> = {
    owner: theme.warning,
    admin: theme.primary,
    viewer: theme.textDim,
  };

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
    cardTitle: {
      color: theme.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.xxs,
    },
    cardSub: {
      color: theme.textDim,
      fontSize: fontSize.sm,
    },
    badge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
      borderRadius: radius.sm,
      alignSelf: 'flex-start',
    },
    badgeText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: '#FFF',
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
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.surface,
      padding: spacing.md,
      borderRadius: radius.md,
      marginBottom: 2,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inviteCard: {
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: theme.primary + '40',
    },
    emptyText: {
      color: theme.textDim,
      fontSize: fontSize.md,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
    rolePicker: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    roleBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      alignItems: 'center',
      borderWidth: 1,
    },
    chevron: {
      color: theme.textMuted,
      fontSize: fontSize.h3,
      fontWeight: '300',
    },
  });

  if (selectedTeam) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <Pressable
          onPress={() => setSelectedTeam(null)}
          accessibilityRole="button"
          accessibilityLabel={t('common.goBack')}
        >
          <Text style={[styles.cardSub, { marginBottom: spacing.md }]}>← {t('common.goBack')}</Text>
        </Pressable>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Text style={styles.cardTitle}>{selectedTeam.name}</Text>
          <View
            style={[styles.badge, { backgroundColor: roleColors[selectedTeam.role || 'viewer'] }]}
          >
            <Text style={styles.badgeText}>
              {t(`teams.${selectedTeam.role}`, selectedTeam.role)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('teams.miners', 'Team Miners')}</Text>
          <View style={styles.card}>
            <Text style={styles.cardSub}>
              {t('teams.minerList', 'Miners shared with this team will appear here.')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.xs,
            }}
          >
            <Text style={styles.sectionTitle}>{t('teams.members')}</Text>
            {(selectedTeam.role === 'owner' || selectedTeam.role === 'admin') && (
              <Pressable
                onPress={() => setShowInviteModal(true)}
                accessibilityRole="button"
                accessibilityLabel={t('teams.inviteMember')}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {t('teams.inviteMember')}
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.row}>
            <Text style={styles.cardSub}>
              {t('teams.memberCount', { count: selectedTeam.memberCount })}
            </Text>
          </View>
        </View>

        {selectedTeam.role !== 'owner' && (
          <Pressable
            style={[styles.btn, { backgroundColor: theme.danger + '20', marginTop: spacing.md }]}
            onPress={() => {
              Alert.alert(
                t('teams.leave'),
                t('teams.leaveConfirm', 'Are you sure you want to leave this team?'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('teams.leave'),
                    style: 'destructive',
                    onPress: () => leaveTeam(selectedTeam.id),
                  },
                ],
              );
            }}
            accessibilityRole="button"
            accessibilityLabel={t('teams.leave')}
          >
            <Text style={[styles.btnText, { color: theme.danger }]}>{t('teams.leave')}</Text>
          </Pressable>
        )}

        <Modal visible={showInviteModal} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              padding: spacing.xl,
            }}
          >
            <View
              style={{ backgroundColor: theme.bg, borderRadius: radius.lg, padding: spacing.lg }}
            >
              <Text style={[styles.cardTitle, { marginBottom: spacing.md }]}>
                {t('teams.inviteMember')}
              </Text>
              <TextInput
                style={styles.input}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder={t('teams.email')}
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel={t('teams.email')}
              />
              <Text style={[styles.sectionTitle, { marginLeft: 0, marginBottom: spacing.xs }]}>
                {t('teams.role')}
              </Text>
              <View style={styles.rolePicker}>
                {(['viewer', 'admin'] as const).map((r) => (
                  <Pressable
                    key={r}
                    style={[
                      styles.roleBtn,
                      {
                        borderColor: inviteRole === r ? theme.primary : theme.border,
                        backgroundColor: inviteRole === r ? theme.primary + '20' : theme.surface,
                      },
                    ]}
                    onPress={() => setInviteRole(r)}
                    accessibilityRole="button"
                    accessibilityLabel={t(`teams.${r}`)}
                  >
                    <Text
                      style={{
                        color: inviteRole === r ? theme.primary : theme.text,
                        fontWeight: fontWeight.semibold,
                        fontSize: fontSize.sm,
                      }}
                    >
                      {t(`teams.${r}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <Pressable
                  style={[styles.btn, { flex: 1, backgroundColor: theme.surfaceLight }]}
                  onPress={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.cancel')}
                >
                  <Text style={[styles.btnText, { color: theme.text }]}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, { flex: 1 }]}
                  onPress={inviteMember}
                  accessibilityRole="button"
                  accessibilityLabel={t('teams.inviteMember')}
                >
                  <Text style={styles.btnText}>{t('teams.inviteMember')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <Text style={styles.title}>{t('teams.title')}</Text>

      {invitations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('teams.invitations')}</Text>
          {invitations.map((inv) => (
            <View key={inv.id} style={styles.inviteCard}>
              <Text style={styles.cardTitle}>{inv.teamId}</Text>
              <Text style={styles.cardSub}>
                {t('teams.role')}: {t(`teams.${inv.role}`)}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm }}>
                <Pressable
                  style={[styles.btn, { flex: 1, backgroundColor: theme.success }]}
                  onPress={() => acceptInvite(inv)}
                  accessibilityRole="button"
                  accessibilityLabel={t('teams.accept')}
                >
                  <Text style={styles.btnText}>{t('teams.accept')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, { flex: 1, backgroundColor: theme.surfaceLight }]}
                  onPress={() => {
                    haptic.light();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('teams.decline')}
                >
                  <Text style={[styles.btnText, { color: theme.text }]}>{t('teams.decline')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.xs,
          }}
        >
          <Text style={styles.sectionTitle}>{t('teams.title')}</Text>
          <Pressable
            onPress={() => setShowCreateModal(true)}
            accessibilityRole="button"
            accessibilityLabel={t('teams.createTeam')}
          >
            <Text
              style={{
                color: theme.primary,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
              }}
            >
              + {t('teams.createTeam')}
            </Text>
          </Pressable>
        </View>

        {teamsList.length === 0 ? (
          <Text style={styles.emptyText}>{t('teams.noTeams')}</Text>
        ) : (
          teamsList.map((team) => (
            <Pressable
              key={team.id}
              style={styles.card}
              onPress={() => {
                haptic.light();
                setSelectedTeam(team);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${team.name}, ${team.memberCount} members`}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={styles.cardTitle}>{team.name}</Text>
                <View
                  style={[styles.badge, { backgroundColor: roleColors[team.role || 'viewer'] }]}
                >
                  <Text style={styles.badgeText}>{t(`teams.${team.role}`, team.role)}</Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: spacing.xxs,
                }}
              >
                <Text style={styles.cardSub}>
                  {t('teams.memberCount', { count: team.memberCount })}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <Modal visible={showCreateModal} transparent animationType="fade">
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
              {t('teams.createTeam')}
            </Text>
            <TextInput
              style={styles.input}
              value={newTeamName}
              onChangeText={setNewTeamName}
              placeholder={t('teams.teamName')}
              placeholderTextColor={theme.textMuted}
              autoFocus
              accessibilityLabel={t('teams.teamName')}
            />
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Pressable
                style={[styles.btn, { flex: 1, backgroundColor: theme.surfaceLight }]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewTeamName('');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Text style={[styles.btnText, { color: theme.text }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, { flex: 1 }]}
                onPress={createTeam}
                accessibilityRole="button"
                accessibilityLabel={t('teams.createTeam')}
              >
                <Text style={styles.btnText}>{t('teams.createTeam')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
