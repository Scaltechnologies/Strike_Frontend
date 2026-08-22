// src/modules/notifications/components/NotificationListener.tsx
// Mounted once inside (main)/_layout.tsx — the only place a vendor session is
// guaranteed to exist, so it's safe to request permission and register a push
// token here. Renders nothing but the in-app banner for foreground arrivals.
//
// expo-notifications must NEVER be statically imported here: it runs an
// import-time side effect that throws synchronously on Android inside Expo Go
// (see pushRegistration.ts). We only require() it lazily, inside the effect,
// after confirming we're not running in Expo Go.

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import { ensurePushPermissionAndRegister } from '../push/pushRegistration';
import { resolveNotificationTarget } from '../push/notificationRouting';
import { prependNotification, markReadLocally } from '../store/notificationStore';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationResponse } from '../types/notification.types';
import InAppBanner from './InAppBanner';

interface RawNotificationRequest {
  content: { title?: string | null; body?: string | null; data?: Record<string, unknown> };
}

function toNotificationResponse(request: RawNotificationRequest): NotificationResponse | null {
  const content = request.content;
  const data = (content.data ?? {}) as Record<string, string>;
  const type = data.type as NotificationResponse['type'] | undefined;
  if (!type) return null;
  return {
    id: Number(data.id) || Date.now(),
    type,
    title: content.title ?? '',
    body: content.body ?? '',
    read: false,
    createdAt: new Date().toISOString(),
    data,
  };
}

export default function NotificationListener() {
  const router = useRouter();
  const { refreshUnreadCount, bannerNotification } = useNotifications();

  useEffect(() => {
    refreshUnreadCount();

    // Remote push (and expo-notifications' own module-load side effect) isn't
    // available in Expo Go on Android since SDK 53 — don't even require() it.
    if (isRunningInExpoGo()) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: false,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    ensurePushPermissionAndRegister().catch(() => {
      // Best-effort — permission denial or a network hiccup must never block the app.
    });

    // Catch a tap that launched the app from a fully killed state.
    Notifications.getLastNotificationResponseAsync()
      .then((response: any) => {
        const n = response && toNotificationResponse(response.notification.request);
        if (!n) return;
        const target = resolveNotificationTarget(n);
        if (target) router.push({ pathname: target.pathname as any, params: target.params });
      })
      .catch(() => {});

    const receivedSub = Notifications.addNotificationReceivedListener((event: any) => {
      const n = toNotificationResponse(event.request);
      if (n) prependNotification(n);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const n = toNotificationResponse(response.notification.request);
      if (!n) return;
      markReadLocally(n.id);
      const target = resolveNotificationTarget(n);
      if (target) router.push({ pathname: target.pathname as any, params: target.params });
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <InAppBanner notification={bannerNotification} />;
}
