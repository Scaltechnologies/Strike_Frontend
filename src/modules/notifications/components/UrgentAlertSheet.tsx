// src/modules/notifications/components/UrgentAlertSheet.tsx
// The premium, hard-to-miss alert for CARD_REQUEST / REDEMPTION_REQUEST — distinct from
// the lighter InAppBanner used for every other notification type. Renders urgentQueue[0]
// from notificationStore; dismissing or navigating advances to the next queued alert, so
// several rapid requests are shown one at a time instead of stacking.

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Animated, View, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import { useRouter } from 'expo-router';
import { getNotificationState, subscribeNotifications, dequeueUrgent, markReadLocally } from '../store/notificationStore';
import { resolveNotificationTarget } from '../push/notificationRouting';

const DS = {
  primary: '#CC2200',
  primarySoft: '#FFF0EE',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  text: '#1A1A1A',
  text2: '#5A6272',
  border: '#EAECEF',
  surface: '#FFFFFF',
};

function copyFor(type: string): { icon: keyof typeof Ionicons.glyphMap; accent: string; accentSoft: string; heading: string } {
  if (type === 'REDEMPTION_REQUEST') {
    return { icon: 'alert-circle', accent: DS.warning, accentSoft: DS.warningSoft, heading: 'REDEMPTION REQUEST' };
  }
  return { icon: 'notifications', accent: DS.primary, accentSoft: DS.primarySoft, heading: 'NEW CARD REQUEST' };
}

export default function UrgentAlertSheet() {
  const router = useRouter();
  const state = useSyncExternalStore(subscribeNotifications, getNotificationState, getNotificationState);
  const notification = state.urgentQueue[0] ?? null;

  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!notification) return;
    scale.setValue(0.85);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification?.id]);

  if (!notification) return null;
  const { icon, accent, accentSoft, heading } = copyFor(notification.type);

  function handleDismiss() {
    dequeueUrgent();
  }

  function handleView() {
    if (!notification) return;
    markReadLocally(notification.id);
    const target = resolveNotificationTarget(notification);
    dequeueUrgent();
    if (target) router.push({ pathname: target.pathname as any, params: target.params });
  }

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} hitSlop={10}>
            <Ionicons name="close" size={18} color={DS.text2} />
          </TouchableOpacity>

          <Animated.View style={[styles.iconRing, { backgroundColor: accentSoft, transform: [{ scale: pulse }] }]}>
            <View style={[styles.iconWrap, { backgroundColor: accent }]}>
              <Ionicons name={icon} size={30} color="#FFFFFF" />
            </View>
          </Animated.View>

          <Text style={[styles.heading, { color: accent }]}>{heading}</Text>
          <Text style={styles.title} numberOfLines={2}>{notification.title}</Text>
          <Text style={styles.desc} numberOfLines={3}>{notification.message}</Text>

          <TouchableOpacity style={[styles.viewBtn, { backgroundColor: accent }]} onPress={handleView} activeOpacity={0.85}>
            <Text style={styles.viewBtnText}>VIEW REQUEST</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDismiss} hitSlop={8} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(17,17,20,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: DS.surface, borderRadius: 24,
    paddingTop: 28, paddingBottom: 20, paddingHorizontal: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24,
    ...Platform.select({ android: { elevation: 12 } }),
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F7FA', zIndex: 1,
  },
  iconRing: {
    width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
  },
  heading: { fontSize: 13, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  title: { fontSize: 19, fontWeight: '800', color: DS.text, textAlign: 'center', marginBottom: 6 },
  desc: { fontSize: 14, color: DS.text2, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  viewBtn: {
    width: '100%', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
  },
  viewBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  dismissBtn: { marginTop: 14 },
  dismissText: { fontSize: 13, fontWeight: '700', color: DS.text2 },
});
