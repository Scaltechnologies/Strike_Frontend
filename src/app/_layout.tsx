// src/app/_layout.tsx

import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import { MaintenanceGate } from '../core/maintenance/MaintenanceGate';
import { MANROPE_FONTS } from '../core/theme/fonts';
import AppErrorScreen from '../components/AppErrorScreen';
import { LaunchUpdateGate } from '../core/updates/LaunchUpdateGate';

// Any screen that throws while rendering shows this instead of a blank white
// screen (React unmounts everything on an uncaught render error in release).
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <AppErrorScreen error={error} retry={retry} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(MANROPE_FONTS);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF0E6' }}>
        <ActivityIndicator size="large" color="#CC2200" />
      </View>
    );
  }

  return (
    // Applies a newly published app update before anything is shown, so every
    // vendor (incl. a fresh Play Store install) sees the current screens.
    <LaunchUpdateGate>
      <MaintenanceGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="change-pin" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="privacy-policy" />
          <Stack.Screen name="account-deletion" />
        </Stack>
      </MaintenanceGate>
    </LaunchUpdateGate>
  );
}