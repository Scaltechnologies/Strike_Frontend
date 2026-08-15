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
  bannerNotification: NotificationResponse | null;
}

let state: NotificationState = {
  items: [],
  unreadCount: 0,
  loading: false,
  refreshing: false,
  error: null,
  pushPermission: 'undetermined',
  pushToken: null,
  bannerNotification: null,
};

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
    unreadCount: items.filter(n => !n.read).length,
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
    items: state.items.map(n => (n.id === id ? { ...n, read: true } : n)),
    unreadCount: Math.max(0, state.items.find(n => n.id === id && !n.read) ? state.unreadCount - 1 : state.unreadCount),
  };
  emit();
}

export function markAllReadLocally(): void {
  state = {
    ...state,
    items: state.items.map(n => ({ ...n, read: true })),
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
    unreadCount: state.unreadCount + (n.read ? 0 : 1),
    bannerNotification: n,
  };
  emit();
}

export function clearBanner(): void {
  state = { ...state, bannerNotification: null };
  emit();
}

export function setPushPermission(pushPermission: PushPermissionState): void {
  state = { ...state, pushPermission };
  emit();
}

export function setPushToken(pushToken: string | null): void {
  state = { ...state, pushToken };
  emit();
}

// Called on logout / session expiry so stale badge counts don't leak into the
// next login on a shared device.
export function resetNotificationStore(): void {
  state = {
    items: [],
    unreadCount: 0,
    loading: false,
    refreshing: false,
    error: null,
    pushPermission: 'undetermined',
    pushToken: null,
    bannerNotification: null,
  };
  emit();
}
