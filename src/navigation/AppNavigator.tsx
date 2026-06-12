import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { DashboardScreen } from '../screens/DashboardScreen';
import { MinerDetailScreen } from '../screens/MinerDetailScreen';
import { AddMinerScreen } from '../screens/AddMinerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { PoolsScreen } from '../screens/PoolsScreen';
import { useTheme } from '../theme';

type RootStackParamList = {
  MainTabs: undefined;
  MinerDetail: { minerId: string };
  AddMiner: undefined;
  Subscription: undefined;
};

type TabParamList = {
  Dashboard: undefined;
  Pools: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const theme = useTheme();
  const icons: Record<string, string> = {
    Dashboard: '⬡',
    Pools: '🌊',
    Settings: '⚙',
  };
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, color: focused ? theme.primary : theme.textMuted }}>
        {icons[label] || '•'}
      </Text>
    </View>
  );
}

function MainTabs() {
  const theme = useTheme();
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
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Pools" component={PoolsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const theme = useTheme();
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="MinerDetail"
          component={MinerDetailScreen}
          options={{ title: 'Miner Details' }}
        />
        <Stack.Screen name="AddMiner" component={AddMinerScreen} options={{ title: 'Add Miner' }} />
        <Stack.Screen
          name="Subscription"
          component={SubscriptionScreen}
          options={{ title: 'HashWatch Pro' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export type { RootStackParamList, TabParamList };
