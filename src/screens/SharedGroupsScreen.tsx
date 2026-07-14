import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useGroupSharingStore } from '../store/groupSharing';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import { GroupShare } from '../types';
import { useTranslation } from 'react-i18next';
import * as API from '../api/client';
import { RemoteMiner } from '../types';

export function SharedGroupsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { sharedWithMe, sharedByMe, loading, loadShared, revokeShare, updateAccess } =
    useGroupSharingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [sharedMiners, setSharedMiners] = useState<RemoteMiner[]>([]);
  const [minersLoading, setMinersLoading] = useState(false);

  useEffect(() => {
    loadShared();
  }, [loadShared]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadShared();
    setRefreshing(false);
  }, [loadShared]);

  const viewSharedMiners = useCallback(async (groupId: string) => {
    setSelectedGroup(groupId);
    setMinersLoading(true);
    try {
      const result = await API.fetchSharedGroupMiners(groupId);
      setSharedMiners(result.miners);
    } catch {
      setSharedMiners([]);
    } finally {
      setMinersLoading(false);
    }
  }, []);

  const handleRevoke = useCallback(
    (shareId: number) => {
      revokeShare(shareId);
    },
    [revokeShare],
  );

  const handleToggleAccess = useCallback(
    (share: GroupShare) => {
      updateAccess(share.id, share.accessLevel === 'view' ? 'edit' : 'view');
    },
    [updateAccess],
  );

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg, padding: 16 },
    title: {
      color: theme.text,
      fontSize: 24,
      fontWeight: fontWeight.extrabold,
      marginBottom: 16,
      marginTop: spacing.xs,
      letterSpacing: -0.5,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: radius.md,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    groupName: {
      color: theme.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
    },
    cardDetail: {
      color: theme.textDim,
      fontSize: fontSize.sm,
      marginTop: spacing.xxs,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xxs,
      marginTop: spacing.xs,
    },
    actionBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: radius.sm,
      borderWidth: 1,
    },
    actionBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    emptyText: {
      color: theme.textDim,
      fontSize: fontSize.base,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    minerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.xs,
      backgroundColor: theme.surfaceLight,
      borderRadius: radius.sm,
      marginBottom: spacing.xxs,
    },
    minerName: { color: theme.text, fontSize: fontSize.base, fontWeight: '500' },
    minerIp: { color: theme.textDim, fontSize: fontSize.sm },
    backBtn: {
      marginTop: spacing.sm,
      paddingVertical: spacing.xs,
      alignItems: 'center',
    },
    backBtnText: { color: theme.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  });

  if (selectedGroup) {
    return (
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.goBack')}
          style={styles.backBtn}
          onPress={() => {
            setSelectedGroup(null);
            setSharedMiners([]);
          }}
        >
          <Text style={styles.backBtnText}>{t('common.goBack')}</Text>
        </Pressable>
        <Text style={styles.sectionTitle}>{t('groupSharing.sharedMiners')}</Text>
        <Text style={styles.cardDetail}>{selectedGroup}</Text>
        {minersLoading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: spacing.lg }} />
        ) : sharedMiners.length === 0 ? (
          <Text style={styles.emptyText}>{t('groups.noMiners')}</Text>
        ) : (
          <FlatList
            data={sharedMiners}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.minerRow}>
                <View>
                  <Text style={styles.minerName}>{item.name}</Text>
                  <Text style={styles.minerIp}>{item.ip}</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('groupSharing.title')}</Text>

      <Text style={styles.sectionTitle}>{t('groupSharing.sharedWithMe')}</Text>
      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} />
      ) : sharedWithMe.length === 0 ? (
        <Text style={styles.emptyText}>{t('groupSharing.noShares')}</Text>
      ) : (
        <FlatList
          data={sharedWithMe}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.groupName}>{item.groupId}</Text>
                <Text style={[styles.cardDetail, { marginTop: 0 }]}>{item.accessLevel}</Text>
              </View>
              <Text style={styles.cardDetail}>
                {t('groupSharing.sharedByMe')}: {item.ownerEmail || ''}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('groupSharing.sharedMiners')}
                  style={[styles.actionBtn, { borderColor: theme.primary }]}
                  onPress={() => viewSharedMiners(item.groupId)}
                >
                  <Text style={[styles.actionBtnText, { color: theme.primary }]}>
                    {t('groupSharing.sharedMiners')}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('groupSharing.revoke')}
                  style={[styles.actionBtn, { borderColor: theme.danger }]}
                  onPress={() => handleRevoke(item.id)}
                >
                  <Text style={[styles.actionBtnText, { color: theme.danger }]}>
                    {t('groupSharing.revoke')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Text style={styles.sectionTitle}>{t('groupSharing.sharedByMe')}</Text>
      {sharedByMe.length === 0 ? (
        <Text style={styles.emptyText}>{t('groupSharing.noShares')}</Text>
      ) : (
        <FlatList
          data={sharedByMe}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.groupName}>{item.groupId}</Text>
                <Text style={[styles.cardDetail, { marginTop: 0 }]}>{item.accessLevel}</Text>
              </View>
              <Text style={styles.cardDetail}>{item.sharedWithEmail}</Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('groupSharing.accessLevel')}
                  style={[styles.actionBtn, { borderColor: theme.primary }]}
                  onPress={() => handleToggleAccess(item)}
                >
                  <Text style={[styles.actionBtnText, { color: theme.primary }]}>
                    {item.accessLevel === 'view' ? t('groupSharing.edit') : t('groupSharing.view')}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('groupSharing.revoke')}
                  style={[styles.actionBtn, { borderColor: theme.danger }]}
                  onPress={() => handleRevoke(item.id)}
                >
                  <Text style={[styles.actionBtnText, { color: theme.danger }]}>
                    {t('groupSharing.revoke')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
      <FlatList
        data={[]}
        renderItem={null}
        ListEmptyComponent={null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      />
    </View>
  );
}
