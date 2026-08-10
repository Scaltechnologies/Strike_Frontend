// src/app/_layout.tsx

import { Stack } from 'expo-router';
import { MaintenanceGate } from '../core/maintenance/MaintenanceGate';

export default function RootLayout() {
  return (
    <MaintenanceGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </MaintenanceGate>
  );
}