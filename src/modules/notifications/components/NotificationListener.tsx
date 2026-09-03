// src/modules/notifications/components/NotificationListener.tsx
// Mounted once inside (main)/_layout.tsx — the only place a vendor session is
// guaranteed to exist, so it's safe to request permission and register a push
// token here. Renders the in-app banner (routine types) and the urgent alert
// sheet (CARD_REQUEST / REDEMPTION_REQUEST) for foreground arrivals.
//
// expo-notifications and @react-native-firebase/messaging must NEVER be statically
// imported here: both run import-time side effects that throw synchronously on
// Android inside Expo Go. We only require() them lazily, inside the effect, after
// confirming we're not running in Expo Go (see pushRegistration.ts / firebaseMessaging.ts).

import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import {
  ensurePushPermissionAndRegister, URGENT_CHANNEL_ID, URGENT_SOUND, DEFAULT_CHANNEL_ID, DEFAULT_SOUND,
} from '../push/pushRegistration';
import { resolveNotificationTarget } from '../push/notificationRouting';
import { prependNotification, markReadLocally, enqueueUrgent } from '../store/notificationStore';
import { registerPushToken } from '../services/notificationService';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationResponse, NotificationType, URGENT_NOTIFICATION_TYPES } from '../types/notification.types';
import {
  onForegroundMessage, onNotificationOpenedApp, getInitialNotification, onFcmTokenRefresh, RemoteMessageLike,
} from '../../../core/firebase/firebaseMessaging';
import InAppBanner from './InAppBanner';
import UrgentAlertSheet from './UrgentAlertSheet';
import { Platform } from 'react-native';

function toNotificationResponse(message: RemoteMessageLike): NotificationResponse | null {
  const data = (message.data ?? {}) as Record<string, string>;
  const type = data.type as NotificationType | undefined;
  if (!type) return null;
  return {
    id: Date.now(),
    type,
    title: message.notification?.title ?? '',
    message: message.notification?.body ?? '',
    isRead: false,
    createdAt: new Date().toISOString(),
    actionUrl: data.deepLink ?? null,
  };
}

// Forces the OS to actually play a sound for this arrival while the JS app is
// foregrounded — FCM messages never auto-play a sound on their own in that state.
function playForegroundSound(n: NotificationResponse) {
  if (isRunningInExpoGo()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');
    const urgent = URGENT_NOTIFICATION_TYPES.has(n.type);
    Notifications.scheduleNotificationAsync({
      content: {
        title: n.title,
        body: n.message,
        sound: urgent ? URGENT_SOUND : DEFAULT_SOUND,
        ...(Platform.OS === 'android' ? { channelId: urgent ? URGENT_CHANNEL_ID : DEFAULT_CHANNEL_ID } : {}),
        data: { type: n.type },
      },
      trigger: null,
    }).catch(() => {});
  } catch {
    // Best-effort — a missing sound file or plugin misconfiguration must never crash the app.
  }
}

export default function NotificationListener() {
  const router = useRouter();
  const { refreshUnreadCount, unreadCount, bannerNotification } = useNotifications();

  function handleTap(message: RemoteMessageLike) {
    const n = toNotificationResponse(message);
    if (!n) return;
    markReadLocally(n.id);
    const target = resolveNotificationTarget(n);
    if (target) router.push({ pathname: target.pathname as any, params: target.params });
  }

  function handleForegroundArrival(message: RemoteMessageLike) {
    const n = toNotificationResponse(message);
    if (!n) return;
    playForegroundSound(n);
    if (URGENT_NOTIFICATION_TYPES.has(n.type)) {
      enqueueUrgent(n);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    prependNotification(n);
  }

  useEffect(() => {
    refreshUnreadCount();

    // Remote push isn't available in Expo Go on Android since SDK 53 — don't even require() it.
    if (isRunningInExpoGo()) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    ensurePushPermissionAndRegister().catch(() => {
      // Best-effort — permission denial or a network hiccup must never block the app.
    });

    // Catch a tap that launched the app from a fully killed state.
    getInitialNotification().then(message => {
      if (message) handleTap(message);
    });

    const unsubForeground = onForegroundMessage(handleForegroundArrival);
    const unsubOpened = onNotificationOpenedApp(handleTap);
    const unsubTokenRefresh = onFcmTokenRefresh(token => {
      registerPushToken({
        platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
        deviceToken: token,
      }).catch(() => {});
    });

    return () => {
      unsubForeground();
      unsubOpened();
      unsubTokenRefresh();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the OS app-icon badge in sync with the backend-sourced unread count —
  // backend stays the source of truth, this just mirrors it onto the icon.
  useEffect(() => {
    if (isRunningInExpoGo()) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Notifications = require('expo-notifications');
      Notifications.setBadgeCountAsync(unreadCount).catch(() => {});
    } catch {
      // Best-effort.
    }
  }, [unreadCount]);

  return (
    <>
      <InAppBanner notification={bannerNotification} />
      <UrgentAlertSheet />
    </>
  );
}
