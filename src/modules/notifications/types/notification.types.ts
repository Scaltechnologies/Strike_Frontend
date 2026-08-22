// src/modules/notifications/types/notification.types.ts
// Contract proposed for VendorNotificationController — NOT YET IMPLEMENTED backend-side.
// See C:\Users\USER\.claude\plans\abstract-baking-key.md for the full negotiation notes.

export type NotificationType =
  | 'REDEMPTION_REQUESTED'
  | 'REDEMPTION_APPROVED'
  | 'REDEMPTION_REJECTED'
  | 'TRANSACTION_NEW'
  | 'WITHDRAWAL_STATUS_UPDATED'
  | 'SUBSCRIPTION_PURCHASED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'WALLET_LOW_BALANCE';

// data carries type-specific ids only (e.g. { redemptionId: "123" }), never a raw
// route string — notificationRouting.ts owns the id -> screen mapping so a route
// rename never requires a backend change.
export interface NotificationResponse {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data: Record<string, string>;
}

export interface RegisterPushTokenRequest {
  expoPushToken: string;
  platform: 'ios' | 'android';
  deviceId?: string;
}
