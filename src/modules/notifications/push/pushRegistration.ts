// src/modules/notifications/push/pushRegistration.ts
// Permission request + Expo push token lifecycle. Every call here is best-effort —
// a failure must never block the tab bar from rendering (see NotificationListener).
//
// IMPORTANT: expo-notifications runs an auto-registration side effect at *import
// time* (DevicePushTokenAutoRegistration.fx.ts) that throws synchronously on
// Android when running inside Expo Go (remote push was removed from Expo Go in
// SDK 53). We defer to plain `require()` behind an isRunningInExpoGo() guard so
// the module is never even loaded while developing in Expo Go — a static
// `import * as Notifications from 'expo-notifications'` here would crash the
// whole app at bundle-load time regardless of try/catch.

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { registerPushToken, deregisterPushToken } from '../services/notificationService';
import { setPushPermission, setPushToken, getNotificationState } from '../store/notificationStore';

export async function ensurePushPermissionAndRegister(): Promise<void> {
  if (isRunningInExpoGo()) return;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Notifications = require('expo-notifications');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Device = require('expo-device');

  // Simulators/emulators and web can't receive remote push — skip silently.
  if (!Device.isDevice) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      lightColor: '#CC2200',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  setPushPermission(finalStatus === 'granted' ? 'granted' : 'denied');
  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
  setPushToken(expoPushToken);

  await registerPushToken({
    expoPushToken,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
}

export async function deregisterCurrentPushToken(): Promise<void> {
  if (isRunningInExpoGo()) return;

  const { pushToken } = getNotificationState();
  if (!pushToken) return;
  await deregisterPushToken(pushToken);
  setPushToken(null);
}
