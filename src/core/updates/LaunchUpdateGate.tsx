// src/core/updates/LaunchUpdateGate.tsx
//
// Makes a published EAS Update take effect on the FIRST open, not "some later
// open". By default expo-updates downloads an update in the background and only
// applies it on a later cold start, so a vendor who installs from the Play Store
// keeps seeing the code built into the store binary (e.g. old sign-in screens)
// until they happen to restart the app at the right moment.
//
// On each cold start this checks for an update, downloads it and restarts into
// it before showing the app. Bounded by timeouts, so a slow or offline phone
// just opens the app it already has. Never runs in development / Expo Go.

import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';

const CHECK_TIMEOUT_MS = 6000;
const FETCH_TIMEOUT_MS = 25000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// Once per JS runtime: after reloadAsync() the new bundle starts fresh and checks
// again, finds itself current, and opens normally.
let checkedThisLaunch = false;

export function LaunchUpdateGate({ children }: { children: ReactNode }) {
  const enabled = !__DEV__ && Updates.isEnabled && !checkedThisLaunch;
  const [ready, setReady] = useState(!enabled);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    checkedThisLaunch = true;
    let cancelled = false;
    (async () => {
      try {
        const check = await withTimeout(Updates.checkForUpdateAsync(), CHECK_TIMEOUT_MS);
        if (check.isAvailable) {
          if (!cancelled) setDownloading(true);
          const fetched = await withTimeout(Updates.fetchUpdateAsync(), FETCH_TIMEOUT_MS);
          if (fetched.isNew) {
            await Updates.reloadAsync(); // restarts into the new bundle
            return;
          }
        }
      } catch {
        // Offline, slow or update server error — open what we have; expo-updates
        // still finishes any background download for next time.
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  if (ready) return <>{children}</>;

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color="#CC2200" />
      {downloading && <Text style={styles.text}>Getting the latest version…</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF0E6' },
  text: { marginTop: 14, fontSize: 14, color: '#5A6272' },
});
