import './global.css';
import { isRunningInExpoGo } from 'expo';

// Must run before the React tree mounts (RNFirebase requirement) and before
// 'expo-router/entry' below. Guarded + lazily required exactly like every other
// @react-native-firebase/messaging touchpoint in this app (see firebaseMessaging.ts) —
// this file itself is evaluated in Expo Go too, so a static import here would crash
// the whole app at bundle-load time.
if (!isRunningInExpoGo()) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
    // Data-only handling for when the app is backgrounded or killed. A message with a
    // `notification` payload is already displayed by the OS automatically in that
    // state — this only needs to exist so RNFirebase doesn't warn about a missing
    // handler; there's no in-app UI to show anything in from here.
    setBackgroundMessageHandler(getMessaging(getApp()), async () => {});
  } catch {
    // Best-effort — a missing/misconfigured native module must never crash app startup.
  }
}

import 'expo-router/entry';
