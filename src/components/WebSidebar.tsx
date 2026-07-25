import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useMinerStore } from '../store/miners';
import { useSubscriptionStore } from '../store/subscription';
import { useAuthStore } from '../store/auth';
import * as haptic from '../utils/haptics';
import type { RootStackParamList } from '../types';

const NAV_ITEMS = [
  { key: 'Dashboard', icon: '⬡', labelKey: 'tabs.dashboard' },
  { key: 'Pools', icon: '🌊', labelKey: 'tabs.pools' },
  { key: 'Analytics', icon: '📊', labelKey: 'tabs.analytics' },
  { key: 'Settings', icon: '⚙', labelKey: 'tabs.settings' },
] as const;

const QUICK_LINKS = [
  { screen: 'FleetHealth' as keyof RootStackParamList, icon: '💓', labelKey: 'fleetHealth.title' },
  {
    screen: 'PredictiveMaintenance' as keyof RootStackParamList,
    icon: '🔮',
    labelKey: 'navigator.predictiveMaintenance',
  },
  { screen: 'WorldMap' as keyof RootStackParamList, icon: '🗺', labelKey: 'navigator.worldMap' },
  {
    screen: 'ActivityFeed' as keyof RootStackParamList,
    icon: '📋',
    labelKey: 'navigator.activityFeed',
  },
  {
    screen: 'AlertChannels' as keyof RootStackParamList,
    icon: '🔔',
    labelKey: 'alertChannels.title',
  },
  { screen: 'Wallets' as keyof RootStackParamList, icon: '💰', labelKey: 'settings.wallets' },
  { screen: 'Groups' as keyof RootStackParamList, icon: '📁', labelKey: 'settings.groups' },
  { screen: 'Teams' as keyof RootStackParamList, icon: '👥', labelKey: 'teams.title' },
  { screen: 'Profile' as keyof RootStackParamList, icon: '👤', labelKey: 'profile.title' },
];

export function WebSidebar({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { miners } = useMinerStore();
  const { isPro } = useSubscriptionStore();
  const { email } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const navigateTo = useCallback(
    (screen: string) => {
      haptic.light();
      (navigation as { navigate: (name: string) => void }).navigate(screen);
    },
    [navigation],
  );

  const navigateTab = useCallback(
    (tab: string) => {
      haptic.light();
      (
        navigation as { navigate: (name: string, params?: Record<string, unknown>) => void }
      ).navigate('MainTabs', { screen: tab });
    },
    [navigation],
  );

  if (Platform.OS !== 'web' || isMobile) {
    return <>{children}</>;
  }

  const onlineCount = miners.filter((m) => m.isOnline).length;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.sidebar,
          {
            backgroundColor: theme.surface,
            borderRightColor: theme.border,
            width: collapsed ? 56 : 240,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onPress={() => setCollapsed(!collapsed)}
          style={[styles.collapseBtn, { backgroundColor: theme.bg }]}
        >
          <Text style={{ color: theme.text, fontSize: 16 }}>{collapsed ? '»' : '«'}</Text>
        </Pressable>

        {!collapsed && (
          <View style={styles.logoSection}>
            <Text style={[styles.logo, { color: theme.primary }]}>HashWatch</Text>
            {email && (
              <Text style={[styles.email, { color: theme.textDim }]} numberOfLines={1}>
                {email}
              </Text>
            )}
            <View style={styles.statRow}>
              <View style={[styles.statBadge, { backgroundColor: theme.success + '20' }]}>
                <Text style={[styles.statText, { color: theme.success }]}>{onlineCount}</Text>
              </View>
              <View style={[styles.statBadge, { backgroundColor: theme.surfaceLight }]}>
                <Text style={[styles.statText, { color: theme.textDim }]}>{miners.length}</Text>
              </View>
              {isPro && (
                <View style={[styles.statBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.statText, { color: theme.primary }]}>PRO</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <ScrollView style={styles.navScroll}>
          <View style={styles.navSection}>
            {!collapsed && (
              <Text style={[styles.navSectionLabel, { color: theme.textDim }]}>
                {t('sidebar.main', 'MAIN')}
              </Text>
            )}
            {NAV_ITEMS.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={t(item.labelKey)}
                onPress={() => navigateTab(item.key)}
                style={[
                  styles.navItem,
                  {
                    backgroundColor: 'transparent',
                  },
                ]}
              >
                <Text style={[styles.navIcon, { color: theme.text }]}>{item.icon}</Text>
                {!collapsed && (
                  <Text style={[styles.navLabel, { color: theme.text }]}>{t(item.labelKey)}</Text>
                )}
              </Pressable>
            ))}
          </View>

          <View style={[styles.navSection, { marginTop: 16 }]}>
            {!collapsed && (
              <Text style={[styles.navSectionLabel, { color: theme.textDim }]}>
                {t('sidebar.tools', 'TOOLS')}
              </Text>
            )}
            {QUICK_LINKS.map((item) => (
              <Pressable
                key={item.screen}
                accessibilityRole="button"
                accessibilityLabel={t(item.labelKey)}
                onPress={() => navigateTo(item.screen)}
                style={[styles.navItem, { backgroundColor: 'transparent' }]}
              >
                <Text style={[styles.navIcon, { color: theme.text }]}>{item.icon}</Text>
                {!collapsed && (
                  <Text style={[styles.navLabel, { color: theme.text }]}>{t(item.labelKey)}</Text>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
    height: '100vh' as unknown as number,
    position: 'fixed' as unknown as 'absolute',
    top: 0,
    left: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  collapseBtn: {
    padding: 10,
    margin: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  logoSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logo: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  email: {
    fontSize: 11,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: '700',
  },
  navScroll: {
    flex: 1,
  },
  navSection: {
    padding: 8,
  },
  navSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  navIcon: {
    fontSize: 16,
    width: 28,
    textAlign: 'center',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    marginLeft: 240,
  },
});
