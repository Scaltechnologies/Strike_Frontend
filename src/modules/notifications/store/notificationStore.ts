// src/modules/notifications/store/notificationStore.ts
// Hand-rolled external store mirroring src/core/maintenance/maintenanceStore.ts —
// this codebase has no zustand/redux, module-level state + a subscriber Set,
// exposed to React via useSyncExternalStore.

import { NotificationResponse } from '../types/notification.types';

type Listener = () => void;

export type PushPermissionState = 'undetermined' | 'granted' | 'denied';

interface NotificationState {
  items: NotificationResponse[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  pushPermission: PushPermissionState;
  pushToken: string | null;
  /** Backend's numeric PushDevice id for the current token — deregistration is by id, not token. */
  pushDeviceId: number | null;
  bannerNotification: NotificationResponse | null;
  /** CARD_REQUEST / REDEMPTION_REQUEST arrivals, shown one at a time via UrgentAlertSheet so
   *  several rapid requests never stack — dedup'd by id so a duplicate FCM delivery never queues twice. */
  urgentQueue: NotificationResponse[];
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  loading: false,
  refreshing: false,
  error: null,
  pushPermission: 'undetermined',
  pushToken: null,
  pushDeviceId: null,
  bannerNotification: null,
  urgentQueue: [],
};

let state: NotificationState = { ...initialState };

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach(listener => listener());
}

export function getNotificationState(): NotificationState {
  return state;
}

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setNotificationsLoading(loading: boolean, refreshing = false): void {
  state = { ...state, loading, refreshing };
  emit();
}

export function setNotificationsError(error: string | null): void {
  state = { ...state, error, loading: false, refreshing: false };
  emit();
}

export function setNotifications(items: NotificationResponse[]): void {
  state = {
    ...state,
    items,
    unreadCount: items.filter(n => !n.isRead).length,
    loading: false,
    refreshing: false,
    error: null,
  };
  emit();
}

export function setUnreadCount(count: number): void {
  state = { ...state, unreadCount: count };
  emit();
}

export function markReadLocally(id: number): void {
  state = {
    ...state,
    items: state.items.map(n => (n.id === id ? { ...n, isRead: true } : n)),
    unreadCount: Math.max(0, state.items.find(n => n.id === id && !n.isRead) ? state.unreadCount - 1 : state.unreadCount),
  };
  emit();
}

export function markAllReadLocally(): void {
  state = {
    ...state,
    items: state.items.map(n => ({ ...n, isRead: true })),
    unreadCount: 0,
  };
  emit();
}

// Called when a push notification arrives in the foreground — prepend so it
// appears at the top of the in-app list immediately, without a refetch.
export function prependNotification(n: NotificationResponse): void {
  state = {
    ...state,
    items: [n, ...state.items],
    unreadCount: state.unreadCount + (n.isRead ? 0 : 1),
    bannerNotification: n,
  };
  emit();
}

export function clearBanner(): void {
  state = { ...state, bannerNotification: null };
  emit();
}

// CARD_REQUEST / REDEMPTION_REQUEST arrivals go through this queue instead of the
// lighter bannerNotification — UrgentAlertSheet always renders urgentQueue[0].
export function enqueueUrgent(n: NotificationResponse): void {
  if (state.urgentQueue.some(existing => existing.id === n.id)) return;
  state = { ...state, urgentQueue: [...state.urgentQueue, n] };
  emit();
}

export function dequeueUrgent(): void {
  state = { ...state, urgentQueue: state.urgentQueue.slice(1) };
  emit();
}

export function setPushPermission(pushPermission: PushPermissionState): void {
  state = { ...state, pushPermission };
  emit();
}

export function setPushToken(pushToken: string | null, pushDeviceId: number | null = state.pushDeviceId): void {
  state = { ...state, pushToken, pushDeviceId };
  emit();
}

// Called on logout / session expiry so stale badge counts don't leak into the
// next login on a shared device.
export function resetNotificationStore(): void {
  state = { ...initialState };
  emit();
}
