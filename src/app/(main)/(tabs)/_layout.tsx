import { Tabs } from 'expo-router';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';

const PRIMARY = '#CC2200';
const TEXT_MUTED = '#9BA3AF';

const TABS = [
  { name: 'home',         label: 'Home',         icon: 'home-outline' as const,       activeIcon: 'home' as const },
  { name: 'transactions', label: 'Transactions', icon: 'receipt-outline' as const,    activeIcon: 'receipt' as const },
  { name: 'menu',         label: 'Menu',         icon: 'restaurant-outline' as const, activeIcon: 'restaurant' as const },
  { name: 'dashboard',    label: 'Dashboard',    icon: 'grid-outline' as const,       activeIcon: 'grid' as const },
  { name: 'profile',      label: 'Profile',      icon: 'person-outline' as const,     activeIcon: 'person' as const },
];

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route: any, i: number) => {
        const focused = state.index === i;
        const tab = TABS[i];
        if (!tab) return null;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={[styles.item, focused && styles.activeItem]}
            activeOpacity={0.85}
          >
            <Ionicons
              name={focused ? tab.activeIcon : tab.icon}
              size={20}
              color={focused ? '#fff' : TEXT_MUTED}
            />
            <Text style={[styles.label, focused && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="menu" />
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  item: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 14, gap: 3,
  },
  activeItem: { backgroundColor: PRIMARY },
  label:       { fontSize: 9, color: TEXT_MUTED, fontWeight: '500' },
  activeLabel: { color: '#fff', fontWeight: '700' },
});
