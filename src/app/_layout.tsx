// src/app/_layout.tsx

import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import { MaintenanceGate } from '../core/maintenance/MaintenanceGate';
import { MANROPE_FONTS } from '../core/theme/fonts';

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
    <MaintenanceGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="change-password" options={{ gestureEnabled: false }} />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="account-deletion" />
      </Stack>
    </MaintenanceGate>
  );
}