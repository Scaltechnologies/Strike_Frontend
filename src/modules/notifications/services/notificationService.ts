// src/modules/notifications/services/notificationService.ts
// Talks to notification-service's real, already-implemented self-service API
// (NotificationSelfServiceController → /api/notifications/me/**). Every response here
// is the controller's raw Map/List — NOT wrapped in the app's usual ApiResponse<T> envelope.

import axiosInstance from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import { PageResponse } from '../../../core/types/api.types';
import { NotificationResponse, RegisterPushTokenRequest, PushDeviceResponse } from '../types/notification.types';

// GET /api/notifications/me
export async function getNotifications(page = 0, size = 20): Promise<PageResponse<NotificationResponse>> {
  const res = await axiosInstance.get<PageResponse<NotificationResponse>>(
    endpoints.notification.list,
    { params: { page, size } },
  );
  return res.data;
}

// GET /api/notifications/me/unread-count -> { unreadCount }
export async function getUnreadCount(): Promise<number> {
  const res = await axiosInstance.get<{ unreadCount: number }>(endpoints.notification.unreadCount);
  return res.data.unreadCount;
}

// PATCH /api/notifications/me/{id}/read
export async function markNotificationRead(id: number): Promise<void> {
  await axiosInstance.patch(endpoints.notification.markRead(id));
}

// PATCH /api/notifications/me/read-all -> { updated }
export async function markAllNotificationsRead(): Promise<void> {
  await axiosInstance.patch(endpoints.notification.markAllRead);
}

// POST /api/notifications/me/devices -> PushDevice { id, platform, deviceToken, active }
export async function registerPushToken(payload: RegisterPushTokenRequest): Promise<PushDeviceResponse> {
  const res = await axiosInstance.post<PushDeviceResponse>(endpoints.notification.registerPushToken, payload);
  return res.data;
}

// DELETE /api/notifications/me/devices/{id} — deregisters by the numeric device id
// returned at registration time, not by the raw token.
export async function deregisterPushToken(deviceId: number): Promise<void> {
  await axiosInstance.delete(endpoints.notification.deregisterPushToken(deviceId));
}
