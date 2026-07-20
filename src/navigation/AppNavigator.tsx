import React, { lazy, Suspense, useEffect } from 'react';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { startPricePolling } from '../utils/hashrate';

import { useTranslation } from 'react-i18next';
import { OfflineBanner } from '../components/OfflineBanner';
import { ScreenErrorBoundary } from '../components/ScreenErrorBoundary';
import { UndoToast } from '../components/UndoToast';
import { UpdateBanner } from '../components/UpdateBanner';
import { useTheme } from '../theme';
import { useAlertHistoryStore } from '../store/alertHistory';
import type { RootStackParamList, TabParamList } from '../types';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

const DashboardScreen = lazy(() =>
  import('../screens/DashboardScreen').then((m) => ({ default: m.DashboardScreen })),
);
const MinerDetailScreen = lazy(() =>
  import('../screens/MinerDetailScreen').then((m) => ({ default: m.MinerDetailScreen })),
);
const AddMinerScreen = lazy(() =>
  import('../screens/AddMinerScreen').then((m) => ({ default: m.AddMinerScreen })),
);
const SettingsScreen = lazy(() =>
  import('../screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
);
const SubscriptionScreen = lazy(() =>
  import('../screens/SubscriptionScreen').then((m) => ({ default: m.SubscriptionScreen })),
);
const PoolsScreen = lazy(() =>
  import('../screens/PoolsScreen').then((m) => ({ default: m.PoolsScreen })),
);
const AnalyticsScreen = lazy(() =>
  import('../screens/AnalyticsScreen').then((m) => ({ default: m.AnalyticsScreen })),
);
const WalletsScreen = lazy(() =>
  import('../screens/WalletsScreen').then((m) => ({ default: m.WalletsScreen })),
);
const GroupsScreen = lazy(() =>
  import('../screens/GroupsScreen').then((m) => ({ default: m.GroupsScreen })),
);
const ImportDataScreen = lazy(() =>
  import('../screens/ImportDataScreen').then((m) => ({ default: m.ImportDataScreen })),
);
const MinerComparisonScreen = lazy(() =>
  import('../screens/MinerComparisonScreen').then((m) => ({ default: m.MinerComparisonScreen })),
);
const AlertHistoryScreen = lazy(() =>
  import('../screens/AlertHistoryScreen').then((m) => ({ default: m.AlertHistoryScreen })),
);
const NotificationHistoryScreen = lazy(() =>
  import('../screens/NotificationHistoryScreen').then((m) => ({
    default: m.NotificationHistoryScreen,
  })),
);
const PoolAnalyticsScreen = lazy(() =>
  import('../screens/PoolAnalyticsScreen').then((m) => ({
    default: m.PoolAnalyticsScreen,
  })),
);
const ExportReportScreen = lazy(() =>
  import('../screens/ExportReportScreen').then((m) => ({
    default: m.ExportReportScreen,
  })),
);
const SharedGroupsScreen = lazy(() =>
  import('../screens/SharedGroupsScreen').then((m) => ({
    default: m.SharedGroupsScreen,
  })),
);
const CustomThemeEditorScreen = lazy(() =>
  import('../screens/CustomThemeEditor').then((m) => ({
    default: m.default,
  })),
);
const FirmwareScreen = lazy(() =>
  import('../screens/FirmwareScreen').then((m) => ({
    default: m.default,
  })),
);
const DarkPoolScreen = lazy(() =>
  import('../screens/DarkPoolScreen').then((m) => ({
    default: m.DarkPoolScreen,
  })),
);
const ThemeMarketplaceScreen = lazy(() =>
  import('../screens/ThemeMarketplaceScreen').then((m) => ({
    default: m.ThemeMarketplaceScreen,
  })),
);
const PublicDashboardScreen = lazy(() =>
  import('../screens/PublicDashboardScreen').then((m) => ({
    default: m.PublicDashboardScreen,
  })),
);
const MinerMarketplaceScreen = lazy(() =>
  import('../screens/MarketplaceScreen').then((m) => ({
    default: m.MarketplaceScreen,
  })),
);
const TeamsScreen = lazy(() =>
  import('../screens/TeamsScreen').then((m) => ({
    default: m.TeamsScreen,
  })),
);
const AlertChannelsScreen = lazy(() =>
  import('../screens/AlertChannelsScreen').then((m) => ({
    default: m.AlertChannelsScreen,
  })),
);
const BotChannelsScreen = lazy(() =>
  import('../screens/BotChannelsScreen').then((m) => ({
    default: m.BotChannelsScreen,
  })),
);
const PoolCompareScreen = lazy(() =>
  import('../screens/PoolCompareScreen').then((m) => ({
    default: m.PoolCompareScreen,
  })),
);
const ContributorScreen = lazy(() =>
  import('../screens/ContributorScreen').then((m) => ({
    default: m.ContributorScreen,
  })),
);
const AnomalyScreen = lazy(() =>
  import('../screens/AnomalyScreen').then((m) => ({
    default: m.AnomalyScreen,
  })),
);
const EnergyScreen = lazy(() =>
  import('../screens/EnergyScreen').then((m) => ({
    default: m.EnergyScreen,
  })),
);
const ProfitabilitySwitchScreen = lazy(() =>
  import('../screens/ProfitabilitySwitchScreen').then((m) => ({
    default: m.ProfitabilitySwitchScreen,
  })),
);

function LoadingFallback() {
  const theme = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

function withScreenBoundary<P extends object>(Component: React.ComponentType<P>): React.FC<P> {
  return function WrappedScreen(props: P) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ScreenErrorBoundary>
          <Component {...props} />
        </ScreenErrorBoundary>
      </Suspense>
    );
  };
}

const WrappedDashboard = withScreenBoundary(DashboardScreen);
const WrappedPools = withScreenBoundary(PoolsScreen);
const WrappedAnalytics = withScreenBoundary(AnalyticsScreen);
const WrappedSettings = withScreenBoundary(SettingsScreen);
const WrappedMinerDetail = withScreenBoundary(MinerDetailScreen);
const WrappedAddMiner = withScreenBoundary(AddMinerScreen);
const WrappedSubscription = withScreenBoundary(SubscriptionScreen);
const WrappedWallets = withScreenBoundary(WalletsScreen);
const WrappedGroups = withScreenBoundary(GroupsScreen);
const WrappedImportData = withScreenBoundary(ImportDataScreen);
const WrappedMinerComparison = withScreenBoundary(MinerComparisonScreen);
const WrappedAlertHistory = withScreenBoundary(AlertHistoryScreen);
const WrappedNotificationHistory = withScreenBoundary(NotificationHistoryScreen);
const WrappedPoolAnalytics = withScreenBoundary(PoolAnalyticsScreen);
const WrappedExportReport = withScreenBoundary(ExportReportScreen);
const WrappedSharedGroups = withScreenBoundary(SharedGroupsScreen);
const WrappedCustomThemeEditor = withScreenBoundary(CustomThemeEditorScreen);
const WrappedFirmware = withScreenBoundary(FirmwareScreen);
const WrappedDarkPool = withScreenBoundary(DarkPoolScreen);
const WrappedThemeMarketplace = withScreenBoundary(ThemeMarketplaceScreen);
const WrappedPublicDashboard = withScreenBoundary(PublicDashboardScreen);
const WrappedMinerMarketplace = withScreenBoundary(MinerMarketplaceScreen);
const WrappedTeams = withScreenBoundary(TeamsScreen);
const WrappedAlertChannels = withScreenBoundary(AlertChannelsScreen);
const WrappedBotChannels = withScreenBoundary(BotChannelsScreen);
const WrappedPoolCompare = withScreenBoundary(PoolCompareScreen);
const WrappedContributors = withScreenBoundary(ContributorScreen);
const WrappedAnomaly = withScreenBoundary(AnomalyScreen);
const WrappedEnergy = withScreenBoundary(EnergyScreen);
const WrappedProfitabilitySwitch = withScreenBoundary(ProfitabilitySwitchScreen);

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, string> = {
  Dashboard: '⬡',
  Pools: '🌊',
  Analytics: '📊',
  Settings: '⚙',
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, color: focused ? theme.primary : theme.textMuted }}>
        {TAB_ICONS[label] || '•'}
      </Text>
    </View>
  );
}

function MainTabs() {
  const theme = useTheme();
  const { t } = useTranslation();
  const unreadCount = useAlertHistoryStore((s) => s.events.filter((e) => !e.read).length);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingBottom: 12,
          paddingTop: 10,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={WrappedDashboard}
        options={{ headerShown: false, tabBarLabel: t('tabs.dashboard') }}
      />
      <Tab.Screen
        name="Pools"
        component={WrappedPools}
        options={{ headerShown: false, tabBarLabel: t('tabs.pools') }}
      />
      <Tab.Screen
        name="Analytics"
        component={WrappedAnalytics}
        options={{ headerShown: false, tabBarLabel: t('tabs.analytics') }}
      />
      <Tab.Screen
        name="Settings"
        component={WrappedSettings}
        options={{
          headerShown: false,
          tabBarLabel: t('tabs.settings'),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function AppNavigator() {
  const theme = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    const stop = startPricePolling();
    return stop;
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.minerId && navigationRef.current) {
        navigationRef.current.navigate('MinerDetail', { minerId: data.minerId as string });
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <OfflineBanner />
      <UpdateBanner />
      <UndoToast />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          contentStyle: { backgroundColor: theme.bg },
          animation: 'none',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="MinerDetail"
          component={WrappedMinerDetail}
          options={{ title: t('navigator.minerDetail') }}
        />
        <Stack.Screen
          name="AddMiner"
          component={WrappedAddMiner}
          options={{ title: t('navigator.addMiner') }}
        />
        <Stack.Screen
          name="Subscription"
          component={WrappedSubscription}
          options={{ title: t('navigator.subscription') }}
        />
        <Stack.Screen
          name="Wallets"
          component={WrappedWallets}
          options={{ title: t('navigator.wallets') }}
        />
        <Stack.Screen
          name="Groups"
          component={WrappedGroups}
          options={{ title: t('navigator.groups') }}
        />
        <Stack.Screen
          name="ImportData"
          component={WrappedImportData}
          options={{ title: t('navigator.importData') }}
        />
        <Stack.Screen
          name="MinerComparison"
          component={WrappedMinerComparison}
          options={{ title: t('navigator.minerComparison') }}
        />
        <Stack.Screen
          name="AlertHistory"
          component={WrappedAlertHistory}
          options={{ title: t('alertHistory.title', 'Alert History') }}
        />
        <Stack.Screen
          name="NotificationHistory"
          component={WrappedNotificationHistory}
          options={{ title: t('notificationHistory.title', 'Notification History') }}
        />
        <Stack.Screen
          name="PoolAnalytics"
          component={WrappedPoolAnalytics}
          options={{ title: t('poolAnalytics.title', 'Pool Analytics') }}
        />
        <Stack.Screen
          name="ExportReport"
          component={WrappedExportReport}
          options={{ title: t('exportReport.title', 'Export Report') }}
        />
        <Stack.Screen
          name="SharedGroups"
          component={WrappedSharedGroups}
          options={{ title: t('groupSharing.title', 'Shared Groups') }}
        />
        <Stack.Screen
          name="CustomThemeEditor"
          component={WrappedCustomThemeEditor}
          options={{ title: t('themes.customEditor', 'Theme Editor') }}
        />
        <Stack.Screen
          name="Firmware"
          component={WrappedFirmware}
          options={{ title: t('navigator.firmware', 'Firmware') }}
        />
        <Stack.Screen
          name="DarkPool"
          component={WrappedDarkPool}
          options={{ title: t('darkPool.title', 'Dark Pool') }}
        />
        <Stack.Screen
          name="ThemeMarketplace"
          component={WrappedThemeMarketplace}
          options={{ title: t('marketplace.themeTitle', 'Theme Marketplace') }}
        />
        <Stack.Screen
          name="PublicDashboard"
          component={WrappedPublicDashboard}
          options={{
            title: t('publicDashboard.shareMiner', 'Share Live Status'),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="MinerMarketplace"
          component={WrappedMinerMarketplace}
          options={{ title: t('marketplace.title', 'Miner Marketplace') }}
        />
        <Stack.Screen
          name="Teams"
          component={WrappedTeams}
          options={{ title: t('teams.title', 'Teams') }}
        />
        <Stack.Screen
          name="AlertChannels"
          component={WrappedAlertChannels}
          options={{ title: t('alertChannels.title', 'Alert Channels') }}
        />
        <Stack.Screen
          name="BotChannels"
          component={WrappedBotChannels}
          options={{ title: t('botChannels.title', 'Bot Channels') }}
        />
        <Stack.Screen
          name="PoolCompare"
          component={WrappedPoolCompare}
          options={{ title: t('poolCompare.title', 'Pool Comparison') }}
        />
        <Stack.Screen
          name="Contributors"
          component={WrappedContributors}
          options={{ title: t('contributors.title', 'Contributors') }}
        />
        <Stack.Screen
          name="AnomalyDetection"
          component={WrappedAnomaly}
          options={{ title: t('anomalyDetection.title', 'Anomaly Detection') }}
        />
        <Stack.Screen
          name="Energy"
          component={WrappedEnergy}
          options={{ title: t('energy.title', 'Energy Tracking') }}
        />
        <Stack.Screen
          name="ProfitabilitySwitch"
          component={WrappedProfitabilitySwitch}
          options={{ title: t('profitabilitySwitch.title', 'Profitability Switching') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
