// src/modules/notifications/types/notification.types.ts
// Contract matches notification-service's real, already-implemented API:
// NotificationSelfServiceController (/api/notifications/me/**) + InAppNotification entity.

export type NotificationType =
  | 'CARD_REQUEST'
  | 'REDEMPTION_REQUEST'
  | 'REDEMPTION_REQUESTED'
  | 'REDEMPTION_APPROVED'
  | 'REDEMPTION_REJECTED'
  | 'TRANSACTION_NEW'
  | 'WITHDRAWAL_STATUS_UPDATED'
  | 'SUBSCRIPTION_PURCHASED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'WALLET_LOW_BALANCE';

// CARD_REQUEST and REDEMPTION_REQUEST need an immediate, hard-to-miss alert
// (siren + urgent sheet) — everything else gets the lighter in-app banner.
export const URGENT_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  'CARD_REQUEST',
  'REDEMPTION_REQUEST',
]);

// Mirrors InAppNotification (notification-service): id, recipientId, recipientType,
// title, message, type, actionUrl (deep link), isRead, readAt, createdAt.
export interface NotificationResponse {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
}

// The FCM push payload's `data` map (see EventNotificationServiceImpl.dispatchPush) —
// distinct from NotificationResponse because a push arrival isn't yet a persisted
// inbox row with a real numeric id.
export interface PushDataPayload {
  type?: string;
  deepLink?: string;
  [key: string]: string | undefined;
}

export interface RegisterPushTokenRequest {
  platform: 'ANDROID' | 'IOS' | 'WEB';
  deviceToken: string;
  deviceName?: string;
  appVersion?: string;
}

export interface PushDeviceResponse {
  id: number;
  platform: string;
  deviceToken: string;
  active: boolean;
}
