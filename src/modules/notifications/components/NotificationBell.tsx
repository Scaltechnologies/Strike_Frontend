// src/modules/notifications/components/NotificationBell.tsx
// Dropped into home.tsx's header, next to the existing QR icon button.

import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import { useRouter } from 'expo-router';
import { useNotifications } from '../hooks/useNotifications';

const PRIMARY = '#CC2200';

export default function NotificationBell({ style }: { style?: object }) {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity
      style={[styles.iconBtn, style]}
      onPress={() => router.push('/(main)/notifications')}
      activeOpacity={0.75}
    >
      <Ionicons name="notifications-outline" size={20} color="#1A1A1A" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F6F7FA',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
