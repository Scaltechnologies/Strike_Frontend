// src/modules/notifications/hooks/useNotifications.ts
import { useCallback, useSyncExternalStore } from 'react';
import { getUserMessage } from '../../../core/api/errorMessage';
import {
  getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead,
} from '../services/notificationService';
import {
  getNotificationState, subscribeNotifications, setNotificationsLoading,
  setNotifications, setNotificationsError, setUnreadCount, markReadLocally, markAllReadLocally,
} from '../store/notificationStore';

export function useNotifications() {
  const state = useSyncExternalStore(subscribeNotifications, getNotificationState, getNotificationState);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    setNotificationsLoading(true, isRefresh);
    try {
      const page = await getNotifications();
      setNotifications(page.content);
    } catch (e) {
      setNotificationsError(getUserMessage(e, 'Could not load notifications'));
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      setUnreadCount(await getUnreadCount());
    } catch {
      // Best-effort — badge just stays at its last known value.
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    markReadLocally(id);
    try {
      await markNotificationRead(id);
    } catch {
      // Local state already reflects "read"; a failed sync isn't worth surfacing.
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    markAllReadLocally();
    try {
      await markAllNotificationsRead();
    } catch {
      // Same as above — optimistic local update stands regardless.
    }
  }, []);

  return { ...state, loadNotifications, refreshUnreadCount, markAsRead, markAllAsRead };
}
