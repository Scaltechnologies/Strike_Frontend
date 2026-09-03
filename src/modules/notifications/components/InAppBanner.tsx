// src/modules/notifications/components/InAppBanner.tsx
// Foreground push arrivals show here instead of a blocking Alert.alert (which is
// the only feedback primitive that existed in this codebase before). Auto-dismisses.

import { useEffect, useRef } from 'react';
import { Animated, View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { NotificationResponse } from '../types/notification.types';
import { getNotificationDisplay } from '../notificationDisplay';
import { resolveNotificationTarget } from '../push/notificationRouting';
import { clearBanner, markReadLocally } from '../store/notificationStore';

const AUTO_DISMISS_MS = 4000;

export default function InAppBanner({ notification }: { notification: NotificationResponse | null }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const translateY = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!notification) return;

    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 9 }).start();
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification?.id]);

  function dismiss() {
    Animated.timing(translateY, { toValue: -120, duration: 200, useNativeDriver: true }).start(() => {
      clearBanner();
    });
  }

  function handlePress() {
    if (!notification) return;
    markReadLocally(notification.id);
    const target = resolveNotificationTarget(notification);
    dismiss();
    if (target) router.push({ pathname: target.pathname as any, params: target.params });
  }

  if (!notification) return null;
  const { icon, bg, fg } = getNotificationDisplay(notification.type);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY }] }]}
    >
      <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.9}>
        <View style={[styles.iconWrap, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={18} color={fg} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
          <Text style={styles.desc} numberOfLines={2}>{notification.message}</Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color="#9BA3AF" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 12, right: 12, zIndex: 999, elevation: 999,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#EAECEF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12,
    ...Platform.select({ android: { elevation: 6 } }),
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: '800', color: '#1A1A1A' },
  desc: { fontSize: 12, color: '#5A6272', marginTop: 2 },
});
