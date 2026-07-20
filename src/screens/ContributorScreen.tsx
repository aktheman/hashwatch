import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { NavigationProp } from '../types';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';
import {
  fetchContributors,
  fetchRepoStats,
  getContributorRank,
  Contributor,
  RepoStats,
} from '../api/github';
import * as haptic from '../utils/haptics';

const GITHUB_URL = 'https://github.com/aktheman/hashwatch';

export function ContributorScreen(_props: { navigation: NavigationProp }) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [repoStats, setRepoStats] = useState<RepoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [c, s] = await Promise.all([fetchContributors(), fetchRepoStats()]);
      setContributors(c);
      setRepoStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const totalCommits = contributors.reduce((sum, c) => sum + c.contributions, 0);

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
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: theme.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    statItem: { alignItems: 'center' },
    statValue: { color: theme.text, fontSize: fontSize.h3, fontWeight: fontWeight.bold },
    statLabel: { color: theme.textDim, fontSize: fontSize.sm },
    contributorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      padding: spacing.md,
      borderRadius: radius.lg,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: spacing.md },
    contributorInfo: { flex: 1 },
    contributorName: { color: theme.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    contribCount: { color: theme.textDim, fontSize: fontSize.sm },
    rankBadge: { fontSize: 20, marginRight: spacing.xs },
    rankNumber: {
      color: theme.textMuted,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      width: 24,
      textAlign: 'center',
    },
    contributeBtn: {
      backgroundColor: theme.primary,
      borderRadius: radius.lg,
      padding: spacing.md,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    contributeBtnText: { color: '#FFF', fontWeight: fontWeight.bold, fontSize: fontSize.md },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
    loadingText: { color: theme.textDim, fontSize: fontSize.md },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
    errorText: { color: theme.danger, fontSize: fontSize.md },
    retryBtn: {
      backgroundColor: theme.primary + '20',
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    retryBtnText: { color: theme.primary, fontWeight: fontWeight.semibold },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('contributors.title')}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>{t('contributors.loading')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('contributors.title')}</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('contributors.title')}</Text>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {repoStats && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{contributors.length}</Text>
              <Text style={styles.statLabel}>{t('contributors.totalContributors')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalCommits}</Text>
              <Text style={styles.statLabel}>{t('contributors.totalCommits')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{repoStats.open_issues_count}</Text>
              <Text style={styles.statLabel}>{t('contributors.openIssues')}</Text>
            </View>
          </View>
        )}

        {contributors
          .sort((a, b) => b.contributions - a.contributions)
          .map((contributor, index) => {
            const rank = getContributorRank(index);
            return (
              <View key={contributor.id} style={styles.contributorRow}>
                {rank.badge ? (
                  <Text style={styles.rankBadge}>{rank.badge}</Text>
                ) : (
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                )}
                <Image
                  source={{ uri: contributor.avatar_url }}
                  style={styles.avatar}
                  accessibilityLabel={`${contributor.login} avatar`}
                />
                <View style={styles.contributorInfo}>
                  <Text style={styles.contributorName}>{contributor.login}</Text>
                  <Text style={styles.contribCount}>
                    {contributor.contributions} {t('contributors.contributions')}
                  </Text>
                </View>
              </View>
            );
          })}

        <Pressable
          style={styles.contributeBtn}
          onPress={() => {
            haptic.medium();
            Linking.openURL(GITHUB_URL);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('contributors.contribute')}
        >
          <Text style={styles.contributeBtnText}>{t('contributors.contribute')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
