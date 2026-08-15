// src/modules/notifications/services/notificationService.ts
// VendorNotificationController — NOT YET IMPLEMENTED backend-side (see notification.types.ts).
// Falls back to local mock data while USE_MOCK_NOTIFICATIONS is on, so the UI is
// buildable/demoable ahead of the backend contract landing.

import axiosInstance from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import { ApiResponse, PageResponse } from '../../../core/types/api.types';
import { NotificationResponse, RegisterPushTokenRequest } from '../types/notification.types';
import { MOCK_NOTIFICATIONS, USE_MOCK_NOTIFICATIONS } from '../mocks/mockNotifications';

const MOCK_DELAY_MS = 350;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// GET /api/vendor/notifications
export async function getNotifications(
  page = 0,
  size = 20,
  unreadOnly = false,
): Promise<PageResponse<NotificationResponse>> {
  if (USE_MOCK_NOTIFICATIONS) {
    await delay(MOCK_DELAY_MS);
    const content = unreadOnly ? MOCK_NOTIFICATIONS.filter(n => !n.read) : MOCK_NOTIFICATIONS;
    return { content, page: 0, size: content.length, totalElements: content.length, totalPages: 1, last: true };
  }
  const res = await axiosInstance.get<ApiResponse<PageResponse<NotificationResponse>>>(
    endpoints.notification.list,
    { params: { page, size, unreadOnly } },
  );
  return res.data.data;
}

// GET /api/vendor/notifications/unread-count
export async function getUnreadCount(): Promise<number> {
  if (USE_MOCK_NOTIFICATIONS) {
    await delay(MOCK_DELAY_MS);
    return MOCK_NOTIFICATIONS.filter(n => !n.read).length;
  }
  const res = await axiosInstance.get<ApiResponse<{ count: number }>>(endpoints.notification.unreadCount);
  return res.data.data.count;
}

// PATCH /api/vendor/notifications/{id}/read
export async function markNotificationRead(id: number): Promise<void> {
  if (USE_MOCK_NOTIFICATIONS) {
    const n = MOCK_NOTIFICATIONS.find(x => x.id === id);
    if (n) n.read = true;
    return;
  }
  await axiosInstance.patch(endpoints.notification.markRead(id));
}

// PATCH /api/vendor/notifications/read-all
export async function markAllNotificationsRead(): Promise<void> {
  if (USE_MOCK_NOTIFICATIONS) {
    MOCK_NOTIFICATIONS.forEach(n => { n.read = true; });
    return;
  }
  await axiosInstance.patch(endpoints.notification.markAllRead);
}

// POST /api/vendor/notifications/push-token
export async function registerPushToken(payload: RegisterPushTokenRequest): Promise<void> {
  if (USE_MOCK_NOTIFICATIONS) return;
  await axiosInstance.post(endpoints.notification.registerPushToken, payload);
}

// DELETE /api/vendor/notifications/push-token
export async function deregisterPushToken(expoPushToken: string): Promise<void> {
  if (USE_MOCK_NOTIFICATIONS) return;
  await axiosInstance.delete(endpoints.notification.deregisterPushToken, { data: { expoPushToken } });
}
