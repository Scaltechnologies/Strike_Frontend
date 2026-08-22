import { Stack } from 'expo-router';
import { RedemptionProvider } from '../../modules/redemption/store/RedemptionContext';
import NotificationListener from '../../modules/notifications/components/NotificationListener';

// The 5 real tabs live in the nested (tabs) group below. Everything else here
// is a proper Stack screen (not a sibling "tab" with href:null) so that
// router.back() actually pops to the screen the vendor came from instead of
// falling back to the tab navigator's initial route (Home).
export default function MainLayout() {
  return (
    <RedemptionProvider>
      <NotificationListener />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="my-profile" />
        <Stack.Screen name="cards" />
        <Stack.Screen name="card-create" />
        <Stack.Screen name="card-detail" />
        <Stack.Screen name="store-subscriptions" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="my-coupons" />
        <Stack.Screen name="coupon-create" />
        <Stack.Screen name="redemption-history" />
        <Stack.Screen name="redemption-detail" />
        <Stack.Screen name="store-settings" />
        <Stack.Screen name="redeem" />
        <Stack.Screen name="customer_history" />
        <Stack.Screen name="notifications" />
      </Stack>
    </RedemptionProvider>
  );
}
