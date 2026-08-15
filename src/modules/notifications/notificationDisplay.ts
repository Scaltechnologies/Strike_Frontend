// src/modules/notifications/notificationDisplay.ts
// Per-type icon/color/label used by NotificationCard, InAppBanner, and NotificationBell.

import { NotificationType } from './types/notification.types';

const PRIMARY = '#CC2200';
const PRIMARY_SOFT = '#FFF0EE';
const SUCCESS = '#16A34A';
const SUCCESS_SOFT = '#F0FDF4';
const WARNING = '#D97706';
const WARNING_SOFT = '#FFFBEB';
const ERROR = '#DC2626';
const ERROR_SOFT = '#FFF1F1';
const INFO = '#3B82F6';
const INFO_SOFT = '#F0F6FF';

export interface NotificationDisplay {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  bg: string;
  fg: string;
}

export function getNotificationDisplay(type: NotificationType): NotificationDisplay {
  switch (type) {
    case 'REDEMPTION_REQUESTED':
      return { icon: 'time-outline', bg: PRIMARY_SOFT, fg: PRIMARY };
    case 'REDEMPTION_APPROVED':
      return { icon: 'checkmark-circle-outline', bg: SUCCESS_SOFT, fg: SUCCESS };
    case 'REDEMPTION_REJECTED':
      return { icon: 'close-circle-outline', bg: ERROR_SOFT, fg: ERROR };
    case 'TRANSACTION_NEW':
      return { icon: 'card-outline', bg: INFO_SOFT, fg: INFO };
    case 'WITHDRAWAL_STATUS_UPDATED':
      return { icon: 'wallet-outline', bg: SUCCESS_SOFT, fg: SUCCESS };
    case 'SUBSCRIPTION_PURCHASED':
      return { icon: 'ribbon-outline', bg: INFO_SOFT, fg: INFO };
    case 'SUBSCRIPTION_EXPIRED':
    case 'SUBSCRIPTION_CANCELLED':
      return { icon: 'ribbon-outline', bg: WARNING_SOFT, fg: WARNING };
    case 'WALLET_LOW_BALANCE':
      return { icon: 'alert-circle-outline', bg: WARNING_SOFT, fg: WARNING };
    default:
      return { icon: 'notifications-outline', bg: INFO_SOFT, fg: INFO };
  }
}
