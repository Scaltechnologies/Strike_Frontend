// src/modules/notifications/mocks/mockNotifications.ts
// Temporary scaffold so the notification center is buildable/demoable before the
// backend contract (see notification.types.ts) is implemented. Flip
// USE_MOCK_NOTIFICATIONS to false once /api/vendor/notifications is live, then
// delete this file.

import { NotificationResponse } from '../types/notification.types';

export const USE_MOCK_NOTIFICATIONS = true;

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();

export const MOCK_NOTIFICATIONS: NotificationResponse[] = [
  {
    id: 1,
    type: 'REDEMPTION_REQUESTED',
    title: 'New redemption request',
    body: 'Aarav Sharma wants to redeem 2 items worth ₹450.',
    read: false,
    createdAt: minutesAgo(2),
    data: { redemptionId: '101' },
  },
  {
    id: 2,
    type: 'WALLET_LOW_BALANCE',
    title: 'Low wallet balance',
    body: 'Your available balance has dropped below ₹1,000.',
    read: false,
    createdAt: minutesAgo(40),
    data: {},
  },
  {
    id: 3,
    type: 'TRANSACTION_NEW',
    title: 'New card purchase',
    body: 'A customer purchased a card for ₹1,200.',
    read: false,
    createdAt: minutesAgo(75),
    data: {},
  },
  {
    id: 4,
    type: 'WITHDRAWAL_STATUS_UPDATED',
    title: 'Withdrawal paid out',
    body: 'Your withdrawal of ₹5,000 has been paid out.',
    read: true,
    createdAt: minutesAgo(240),
    data: {},
  },
  {
    id: 5,
    type: 'REDEMPTION_APPROVED',
    title: 'Redemption approved',
    body: "Priya Nair's redemption was approved.",
    read: true,
    createdAt: minutesAgo(500),
    data: { redemptionId: '98' },
  },
  {
    id: 6,
    type: 'SUBSCRIPTION_PURCHASED',
    title: 'New subscription',
    body: 'A customer subscribed to your Gold Card.',
    read: true,
    createdAt: minutesAgo(1600),
    data: {},
  },
  {
    id: 7,
    type: 'REDEMPTION_REJECTED',
    title: 'Redemption rejected',
    body: "Rohan Iyer's redemption request was rejected.",
    read: true,
    createdAt: minutesAgo(2900),
    data: { redemptionId: '87' },
  },
];
