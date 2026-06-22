// src/modules/auth/hooks/useAuth.ts

import { useState } from 'react';
import { router } from 'expo-router';
import { sendOtp, verifyOtp, registerVendor } from '../services/authService';
import { saveTokens } from '../../../core/storage/secureStorage';
import { RegisterVendorRequest } from '../types/auth.types';

// ── Send OTP Hook (Login flow) ────────────────────────────────────────
// POST /api/auth/vendor/login — vendor must already be ACTIVE
export const useSendOtp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (mobileNumber: string) => {
    try {
      setLoading(true);
      setError(null);
      await sendOtp(mobileNumber);
      router.push({
        pathname: '/(auth)/otp',
        params: { phoneNumber: mobileNumber },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return { handleSendOtp, loading, error };
};

// ── Verify OTP Hook ───────────────────────────────────────────────────
// POST /api/auth/vendor/verify — navigates based on vendor status
export const useVerifyOtp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerifyOtp = async (mobileNumber: string, otp: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await verifyOtp(mobileNumber, otp);

      console.log('VERIFY RESPONSE =>', JSON.stringify(response, null, 2));

      if (response.status === 'ACTIVE') {
        // Map backend `token` field to `accessToken` for secureStorage
        await saveTokens({ accessToken: response.token, refreshToken: response.refreshToken });
        router.replace('/(main)/home');
      } else {
        // PENDING, VERIFIED, SUSPENDED, REJECTED — not yet approved
        router.replace('/(auth)/pending-approval');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return { handleVerifyOtp, loading, error };
};

// ── Register Hook (Signup flow) ───────────────────────────────────────
// POST /api/auth/vendor/register — creates vendor, then go to OTP screen
export const useRegister = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (payload: RegisterVendorRequest) => {
    try {
      setLoading(true);
      setError(null);
      await registerVendor(payload);
      router.push({
        pathname: '/(auth)/otp',
        params: { phoneNumber: payload.mobileNumber },
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return { handleRegister, loading, error };
};
