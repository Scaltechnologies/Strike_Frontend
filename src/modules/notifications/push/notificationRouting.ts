// src/modules/notifications/push/notificationRouting.ts
// Resolves where a notification tap should navigate. Prefers a server-supplied deep
// link (in-app's `actionUrl`, or the FCM push payload's `data.deepLink`) so the backend
// can point at a specific request without a frontend release — falls back to a static
// per-type route when no explicit link was sent, or when the link doesn't look like a
// route this app actually has (a stale/malformed value already sitting in a notification
// row — e.g. an old backend bug that sent an API path instead of a screen path — must
// never strand the user on an unmatched route).

import { NotificationResponse } from '../types/notification.types';

export interface NotificationTarget {
  pathname: string;
  params?: Record<string, string>;
}

// Every real screen in this app lives under one of these Expo Router groups — see
// src/app/(main) and src/app/(auth). A deep link outside both is not a route this
// app can resolve, however well-formed the string otherwise looks.
function isKnownRoute(pathname: string): boolean {
  return pathname.startsWith('/(main)/') || pathname.startsWith('/(auth)/');
}

// Deep links are sent as "/(main)/redemption-detail?id=123" — split into expo-router's
// separate pathname/params shape.
function parseDeepLink(link: string): NotificationTarget | null {
  const [pathname, query] = link.split('?');
  if (!isKnownRoute(pathname)) return null;
  if (!query) return { pathname };
  const params: Record<string, string> = {};
  new URLSearchParams(query).forEach((value, key) => { params[key] = value; });
  return { pathname, params };
}

function staticTargetFor(n: NotificationResponse): NotificationTarget | null {
  switch (n.type) {
    case 'CARD_REQUEST':
      return { pathname: '/(main)/pay-at-store' };
    case 'REDEMPTION_REQUEST':
    case 'REDEMPTION_REQUESTED':
    case 'REDEMPTION_APPROVED':
    case 'REDEMPTION_REJECTED':
      return { pathname: '/(main)/redemption-history' };
    case 'TRANSACTION_NEW':
      return { pathname: '/(main)/transactions' };
    case 'WITHDRAWAL_STATUS_UPDATED':
    case 'WALLET_LOW_BALANCE':
      return { pathname: '/(main)/wallet' };
    case 'SUBSCRIPTION_PURCHASED':
    case 'SUBSCRIPTION_EXPIRED':
    case 'SUBSCRIPTION_CANCELLED':
      return { pathname: '/(main)/store-subscriptions' };
    case 'VENDOR_APPROVED':
    case 'VENDOR_REJECTED':
    case 'VENDOR_SUSPENDED':
    case 'VENDOR_REACTIVATED':
      return { pathname: '/(main)/my-profile' };
    default:
      return null;
  }
}

export function resolveNotificationTarget(n: NotificationResponse): NotificationTarget | null {
  if (n.actionUrl) {
    const target = parseDeepLink(n.actionUrl);
    if (target) return target;
  }
  return staticTargetFor(n);
}
