// src/core/firebase/firebaseMessaging.ts
//
// Thin wrapper around @react-native-firebase/messaging's modular API. Alongside
// firebaseAuth.ts, this is the only other place in the app that talks to Firebase
// directly — callers (pushRegistration.ts, NotificationListener.tsx, index.ts) own
// what to *do* with a token/message; this module only exposes the raw primitives.
//
// Native module — requires an EAS development build. Does NOT work in Expo Go, and
// (per project convention — see pushRegistration.ts / NotificationListener.tsx) must
// never be statically imported: a top-level `import ... from '@react-native-firebase/messaging'`
// crashes the whole app at bundle-load time in Expo Go, same as expo-notifications does.
// Every export here is guarded by isRunningInExpoGo() and lazily require()s the module.

import { isRunningInExpoGo } from 'expo';

export interface RemoteMessageLike {
  data?: Record<string, string>;
  notification?: { title?: string; body?: string };
}

function loadMessaging() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const messagingModule = require('@react-native-firebase/messaging');
  return { app: getApp(), messagingModule };
}

// The raw FCM device registration token — this, not an Expo push token, is what the
// backend's FirebaseProvider expects in Message.builder().setToken(...).
export async function getFcmToken(): Promise<string | null> {
  if (isRunningInExpoGo()) return null;
  try {
    const { app, messagingModule } = loadMessaging();
    return await messagingModule.getToken(messagingModule.getMessaging(app));
  } catch {
    return null;
  }
}

// Fires whenever the FCM token rotates (app reinstall, Firebase-side refresh, etc.) —
// the caller is responsible for re-registering the new token with the backend.
export function onFcmTokenRefresh(callback: (token: string) => void): () => void {
  if (isRunningInExpoGo()) return () => {};
  try {
    const { app, messagingModule } = loadMessaging();
    return messagingModule.onTokenRefresh(messagingModule.getMessaging(app), callback);
  } catch {
    return () => {};
  }
}

// A message arriving while the app is in the foreground. FCM never auto-shows a system
// notification or plays a sound in this state — the caller must do both explicitly.
export function onForegroundMessage(callback: (message: RemoteMessageLike) => void): () => void {
  if (isRunningInExpoGo()) return () => {};
  try {
    const { app, messagingModule } = loadMessaging();
    return messagingModule.onMessage(messagingModule.getMessaging(app), callback);
  } catch {
    return () => {};
  }
}

// User tapped a notification while the app was backgrounded (not killed).
export function onNotificationOpenedApp(callback: (message: RemoteMessageLike) => void): () => void {
  if (isRunningInExpoGo()) return () => {};
  try {
    const { app, messagingModule } = loadMessaging();
    return messagingModule.onNotificationOpenedApp(messagingModule.getMessaging(app), callback);
  } catch {
    return () => {};
  }
}

// The notification that cold-started the app (killed -> tapped), if any. Resolves once.
export async function getInitialNotification(): Promise<RemoteMessageLike | null> {
  if (isRunningInExpoGo()) return null;
  try {
    const { app, messagingModule } = loadMessaging();
    return await messagingModule.getInitialNotification(messagingModule.getMessaging(app));
  } catch {
    return null;
  }
}
