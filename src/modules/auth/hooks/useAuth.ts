// src/modules/auth/hooks/useAuth.ts

import { useState } from 'react';
import { router } from 'expo-router';
// authService.sendOtp / verifyOtp (legacy POST /api/auth/vendor/login|verify)
// are intentionally not imported here — the Firebase path below replaces
// them as the UI path, but both remain defined and exported in authService
// as the preserved compatibility fallback.
import { registerVendor, firebaseVerify } from '../services/authService';
import { sendPhoneOtp, confirmPhoneOtp, getFirebaseIdToken } from '../../../core/firebase/firebaseAuth';
import { saveTokens } from '../../../core/storage/secureStorage';
import { RegisterVendorRequest } from '../types/auth.types';
import { uploadStoreBanner } from '../../store/services/storeService';

// ── Send OTP Hook (Login flow) ────────────────────────────────────────
// Firebase Phone Auth — sends a real SMS via signInWithPhoneNumber() and
// keeps the resulting ConfirmationResult pending for the OTP screen.
// (Legacy authService.sendOtp / POST /api/auth/vendor/login is preserved
// below, unused by this hook, as the compatibility fallback path.)
export const useSendOtp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (mobileNumber: string) => {
    try {
      setLoading(true);
      setError(null);
      await sendPhoneOtp(mobileNumber);
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

// ── Resend OTP Hook (OTP screen) ──────────────────────────────────────
// Re-triggers Firebase Phone Auth for the same number, replacing the pending
// ConfirmationResult. Does not navigate — used from the OTP screen itself.
export const useResendOtp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async (mobileNumber: string) => {
    try {
      setLoading(true);
      setError(null);
      await sendPhoneOtp(mobileNumber);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { handleResend, loading, error };
};

// ── Verify OTP Hook ───────────────────────────────────────────────────
// Firebase confirms the OTP client-side, then the Firebase ID token is
// exchanged exactly once for the backend Vendor JWT via
// POST /api/auth/vendor/firebase-verify. Navigation/status handling below is
// unchanged from the legacy flow.
export const useVerifyOtp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // mobileNumber is accepted for call-site compatibility with the OTP screen
  // but is not sent anywhere — the verified phone number is already embedded
  // in the Firebase ID token.
  //
  // bannerUri: local device image picked on the registration screen, carried
  // through as a route param since no auth token exists until this call
  // succeeds. Uploaded best-effort right after login — a failure here must
  // not block the vendor from reaching the app (they can still set it later
  // from Store Settings).
  const handleVerifyOtp = async (mobileNumber: string, otp: string, bannerUri?: string) => {
    try {
      setLoading(true);
      setError(null);

      const firebaseUser = await confirmPhoneOtp(otp);
      const idToken = await getFirebaseIdToken(firebaseUser);
      const response = await firebaseVerify(idToken);

      if (response.status === 'ACTIVE') {
        // Map backend `token` field to `accessToken` for secureStorage.
        // The Firebase ID token itself is discarded here — never stored.
        await saveTokens({ accessToken: response.token, refreshToken: response.refreshToken });

        if (bannerUri) {
          try {
            await uploadStoreBanner(bannerUri);
          } catch (bannerErr) {
            console.warn('Banner upload after registration failed:', bannerErr);
          }
        }

        router.replace('/(main)/home');
      } else {
        // PENDING, VERIFIED, SUSPENDED, REJECTED — not yet approved.
        // No token was issued, so the picked banner can't be uploaded yet;
        // the vendor can set it from Store Settings once approved.
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

  const handleRegister = async (payload: RegisterVendorRequest, bannerUri?: string) => {
    try {
      setLoading(true);
      setError(null);
      await registerVendor(payload);
      router.push({
        pathname: '/(auth)/otp',
        params: { phoneNumber: payload.mobileNumber, bannerUri: bannerUri ?? '' },
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return { handleRegister, loading, error };
};
