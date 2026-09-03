// src/modules/notifications/push/notificationRouting.ts
// Resolves where a notification tap should navigate. Prefers a server-supplied deep
// link (in-app's `actionUrl`, or the FCM push payload's `data.deepLink`) so the backend
// can point at a specific request without a frontend release — falls back to a static
// per-type route only when no explicit link was sent.

import { NotificationResponse } from '../types/notification.types';

export interface NotificationTarget {
  pathname: string;
  params?: Record<string, string>;
}

// Deep links are sent as "/(main)/redemption-detail?id=123" — split into expo-router's
// separate pathname/params shape.
function parseDeepLink(link: string): NotificationTarget {
  const [pathname, query] = link.split('?');
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
    default:
      return null;
  }
}

export function resolveNotificationTarget(n: NotificationResponse): NotificationTarget | null {
  if (n.actionUrl) return parseDeepLink(n.actionUrl);
  return staticTargetFor(n);
}
