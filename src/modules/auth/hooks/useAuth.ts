// src/modules/auth/hooks/useAuth.ts

import { useState } from 'react';
import { router } from 'expo-router';
import { sendOtp, verifyOtp, signup } from '../services/authService';
import { saveTokens } from '../../../core/storage/secureStorage';
import {
  SendOtpRequest,
  VerifyOtpRequest,
  SignupRequest,
} from '../types/auth.types';

// ── Send OTP Hook ─────────────────────────────────
export const useSendOtp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (payload: SendOtpRequest) => {
    try {
      setLoading(true);
      setError(null);
      await sendOtp(payload);
      router.push({
        pathname: '/(auth)/otp',
        params: { phoneNumber: payload.phoneNumber },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return { handleSendOtp, loading, error };
};

// ── Verify OTP Hook ───────────────────────────────
export const useVerifyOtp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerifyOtp = async (payload: VerifyOtpRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await verifyOtp(payload);

      if (response.isNewUser) {
        // ❌ Not registered — block login, show error
        setError('You are not registered. Please sign up first.');
        return;
      }

      //  Existing user — save tokens and go to dashboard
      await saveTokens(response.tokens);
      router.replace('/(main)/dashboard');

    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return { handleVerifyOtp, loading, error };
};

// ── Signup Hook ───────────────────────────────────
export const useSignup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (payload: SignupRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await signup(payload);
      await saveTokens(response.tokens);
      router.replace('/(main)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return { handleSignup, loading, error };
};