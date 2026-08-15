// src/modules/notifications/components/NotificationCard.tsx
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import { NotificationResponse } from '../types/notification.types';
import { getNotificationDisplay } from '../notificationDisplay';

const DS = {
  text: '#1A1A1A',
  text2: '#5A6272',
  text3: '#9BA3AF',
  primary: '#CC2200',
  border: '#EAECEF',
  surface: '#FFFFFF',
};

function formatTimeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 0) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationCard({
  notification, onPress,
}: {
  notification: NotificationResponse;
  onPress: () => void;
}) {
  const { icon, bg, fg } = getNotificationDisplay(notification.type);
  const unread = !notification.read;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {unread && <View style={styles.unreadDot} />}
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={fg} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={styles.desc} numberOfLines={2}>{notification.body}</Text>
        <Text style={styles.time}>{formatTimeAgo(notification.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: DS.surface, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: DS.border,
  },
  unreadDot: {
    position: 'absolute', top: 14, left: 6,
    width: 6, height: 6, borderRadius: 3, backgroundColor: DS.primary,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 6,
  },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '600', color: DS.text2 },
  titleUnread: { fontWeight: '800', color: DS.text },
  desc: { fontSize: 13, color: DS.text2, marginTop: 3, lineHeight: 18 },
  time: { fontSize: 11, color: DS.text3, marginTop: 6 },
});
