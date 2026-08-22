// src/modules/notifications/push/notificationRouting.ts
// The single place that maps a notification's type + data ids to a real
// expo-router route. Backend only ever sends type-specific ids (see
// notification.types.ts) — never a raw path — so a future route rename here
// never requires a backend change.

import { NotificationResponse } from '../types/notification.types';

export interface NotificationTarget {
  pathname: string;
  params?: Record<string, string>;
}

export function resolveNotificationTarget(n: NotificationResponse): NotificationTarget | null {
  switch (n.type) {
    case 'REDEMPTION_REQUESTED':
    case 'REDEMPTION_APPROVED':
    case 'REDEMPTION_REJECTED':
      return n.data.redemptionId
        ? { pathname: '/(main)/redemption-detail', params: { id: n.data.redemptionId } }
        : { pathname: '/(main)/redemption-history' };
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
