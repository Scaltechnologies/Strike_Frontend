import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// This screen is a placeholder. The vendor redemption flow is handled on the
// Home screen (queue approve/reject). This file will be replaced by
// redemption-history.tsx in Wave 2.
export default function RedeemScreen() {
  const router = useRouter();
  useEffect(() => { router.replace('/(main)/home'); }, []);
  return null;
}
