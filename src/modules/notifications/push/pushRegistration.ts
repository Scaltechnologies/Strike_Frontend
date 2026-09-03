// src/modules/notifications/push/pushRegistration.ts
// Permission request + real FCM device-token lifecycle. Every call here is best-effort —
// a failure must never block the tab bar from rendering (see NotificationListener).
//
// IMPORTANT: expo-notifications runs an auto-registration side effect at *import
// time* (DevicePushTokenAutoRegistration.fx.ts) that throws synchronously on
// Android when running inside Expo Go (remote push was removed from Expo Go in
// SDK 53). We defer to plain `require()` behind an isRunningInExpoGo() guard so
// the module is never even loaded while developing in Expo Go — a static
// `import * as Notifications from 'expo-notifications'` here would crash the
// whole app at bundle-load time regardless of try/catch.
//
// The token registered with the backend is the raw FCM device token (via
// firebaseMessaging.getFcmToken()), not an Expo push token — the backend's
// FirebaseProvider sends via FirebaseMessaging.getInstance().send() with a raw FCM
// registration token, which an Expo push token is not compatible with.

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { getFcmToken } from '../../../core/firebase/firebaseMessaging';
import { registerPushToken, deregisterPushToken } from '../services/notificationService';
import { setPushPermission, setPushToken, getNotificationState } from '../store/notificationStore';

// Dedicated high-priority channel for CARD_REQUEST/REDEMPTION_REQUEST — everything
// else stays on 'default'. Must match notification-service's EventNotificationServiceImpl
// .urgentChannelAndSound() ("vendor_alerts" / "vendor_alert_siren") exactly, since on
// Android O+ the channel's own registered sound wins over anything set in the FCM payload.
export const URGENT_CHANNEL_ID = 'vendor_alerts';
export const URGENT_SOUND = 'vendor_alert_siren.wav';
export const DEFAULT_CHANNEL_ID = 'default';
export const DEFAULT_SOUND = 'notify.wav';

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
      name: 'Strike Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      sound: DEFAULT_SOUND,
    });
    await Notifications.setNotificationChannelAsync(URGENT_CHANNEL_ID, {
      name: 'Urgent Requests',
      description: 'New card and redemption requests that need your immediate attention.',
      importance: Notifications.AndroidImportance.MAX,
      sound: URGENT_SOUND,
      vibrationPattern: [0, 400, 200, 400, 200, 400],
      lightColor: '#CC2200',
      bypassDnd: true,
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

  const token = await getFcmToken();
  if (!token) return;
  setPushToken(token);

  try {
    const device = await registerPushToken({
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
      deviceToken: token,
      deviceName: Device.deviceName ?? undefined,
      appVersion: Constants.expoConfig?.version,
    });
    setPushToken(token, device.id);
  } catch {
    // Best-effort — the device stays registered locally and will retry next launch.
  }
}

export async function deregisterCurrentPushToken(): Promise<void> {
  if (isRunningInExpoGo()) return;

  const { pushDeviceId } = getNotificationState();
  if (pushDeviceId == null) return;
  try {
    await deregisterPushToken(pushDeviceId);
  } catch {
    // Best-effort — logging out must never fail because the backend call did.
  }
  setPushToken(null, null);
}
