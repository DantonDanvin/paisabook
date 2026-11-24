import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { C } from '@/lib/theme';

const icon = (name: IconName) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Icon name={name} color={focused ? C.text : C.faint} />;
  };

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: { height: 66 + insets.bottom, paddingTop: 4, paddingBottom: 4 + insets.bottom },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Accounts', tabBarIcon: icon('card') }} />
      <Tabs.Screen name="chart" options={{ title: 'Chart', tabBarIcon: icon('chart') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
