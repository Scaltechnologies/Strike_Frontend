// src/modules/auth/hooks/useAuth.ts
//
// Vendor auth: mobile number + 4-digit PIN.
//   Register: details → Firebase phone OTP → choose PIN → admin review →
//             once approved, sign in with mobile + PIN.
//   Forgot PIN: phone OTP → new PIN (ACTIVE vendors are signed straight in).
// The Firebase ID token only proves the number to the backend; the app's
// session is always the backend JWT pair.

import { useState } from 'react';
import { router } from 'expo-router';
import {
  registerWithPhone,
  registerLogoUpload,
  signInWithPin,
  resetPin,
  changePin,
} from '../services/authService';
import {
  saveTokens,
  savePendingBanner,
  getPendingBanner,
  clearPendingBanner,
  saveLastMobile,
  clearAll,
} from '../../../core/storage/secureStorage';
import { PhoneRegisterRequest, VendorAuthResponse } from '../types/auth.types';
import { uploadStoreBanner } from '../../store/services/storeService';
import { getUserMessage } from '../../../core/api/errorMessage';
import { normalizeEmail } from '../utils/validation';
import { signOutFirebase } from '../../../core/firebase/firebaseAuth';
import { deregisterCurrentPushToken } from '../../notifications/push/pushRegistration';
import { resetNotificationStore } from '../../notifications/store/notificationStore';

type ApiError = Error & { status?: number; code?: string };

// axiosInstance shapes HTTP errors as "[401] /api/auth/vendor/pin/signin — <message>".
// The backend message is already user-facing copy, so show just that part.
export function cleanMessage(err: unknown, fallback: string): string {
  const msg = getUserMessage(err, fallback);
  return msg.replace(/^\[\d{3}\]\s+\S+\s+—\s+/, '').trim() || fallback;
}

export function errorCodeOf(err: unknown): string | undefined {
  return (err as ApiError | null)?.code;
}

// Errors meaning the OTP proof is no longer usable → verify the number again.
export const OTP_PROOF_ERROR_CODES = new Set(['PHONE_MISMATCH']);
export const isOtpProofError = (err: unknown): boolean => {
  const status = (err as ApiError | null)?.status;
  return OTP_PROOF_ERROR_CODES.has(errorCodeOf(err) ?? '') || status === 401;
};

// Persist the session and go Home.
async function completeSignIn(response: VendorAuthResponse): Promise<void> {
  if (!response.token || !response.refreshToken) {
    throw new Error('Could not sign in. Please try again.');
  }
  await saveTokens({ accessToken: response.token, refreshToken: response.refreshToken });
  if (response.mobileNumber) await saveLastMobile(response.mobileNumber);

  // A banner picked at signup whose immediate upload failed is kept locally,
  // keyed by mobile number, and uploaded on the vendor's first sign-in.
  try {
    const pending = await getPendingBanner();
    if (pending && pending.mobileNumber === response.mobileNumber) {
      await uploadStoreBanner(pending.uri);
      await clearPendingBanner();
    }
  } catch (bannerErr) {
    // The picked file may be gone after a long approval wait — never block
    // sign-in; the vendor can still set a banner from Store Settings.
    console.warn('Pending banner upload failed:', bannerErr);
    await clearPendingBanner();
  }

  router.replace('/(main)/home');
}

// ── Sign in ────────────────────────────────────────────────────────────
export const useSignIn = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // e.g. PIN_NOT_SET / ACCOUNT_LOCKED / PIN_RESET_REQUIRED — lets the screen
  // point at "Forgot PIN?" when that's the way forward.
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);

  const handleSignIn = async (mobileNumber: string, pin: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(undefined);
      const response = await signInWithPin({ mobileNumber: mobileNumber.trim(), pin });
      await completeSignIn(response);
      return true;
    } catch (err) {
      setErrorCode(errorCodeOf(err));
      setError(cleanMessage(err, 'Could not sign in. Please try again.'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { handleSignIn, loading, error, errorCode, clearError: () => { setError(null); setErrorCode(undefined); } };
};

// ── Forgot PIN (after the phone OTP) ───────────────────────────────────
export const useResetPin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolves to:
  //   'signed-in' — ACTIVE vendor, navigated Home
  //   'pending'   — PIN saved, store still awaiting approval (message returned)
  //   { failed, otpProblem } — show `error`; otpProblem → verify the number again
  const handleReset = async (
    firebaseIdToken: string,
    newPin: string,
  ): Promise<{ result: 'signed-in' } | { result: 'pending'; message: string } | { result: 'failed'; otpProblem: boolean }> => {
    try {
      setLoading(true);
      setError(null);
      const response = await resetPin({ firebaseIdToken, newPin });
      void signOutFirebase();
      if (response.token && response.refreshToken) {
        await completeSignIn(response);
        return { result: 'signed-in' };
      }
      if (response.mobileNumber) await saveLastMobile(response.mobileNumber);
      return {
        result: 'pending',
        message: response.message ?? 'Your PIN has been saved. You can sign in once our team approves your store.',
      };
    } catch (err) {
      setError(cleanMessage(err, 'Could not save your PIN. Please try again.'));
      return { result: 'failed', otpProblem: isOtpProofError(err) };
    } finally {
      setLoading(false);
    }
  };

  return { handleReset, loading, error, clearError: () => setError(null) };
};

// ── Change PIN (signed in, from Profile) ───────────────────────────────
export const useChangePin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolves true on success. Fresh tokens; other devices have to sign in again.
  const handleChange = async (currentPin: string, newPin: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await changePin({ currentPin, newPin });
      if (response?.token && response?.refreshToken) {
        await saveTokens({ accessToken: response.token, refreshToken: response.refreshToken });
      }
      return true;
    } catch (err) {
      setError(cleanMessage(err, 'Could not change your PIN. Please try again.'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { handleChange, loading, error, clearError: () => setError(null) };
};

// Ends the local session (same cleanup as Profile → Logout).
export const signOutLocally = async (): Promise<void> => {
  try { await deregisterCurrentPushToken(); } catch { /* best-effort */ }
  resetNotificationStore();
  await clearAll();
  router.replace('/(auth)/login');
};

// ── Register (after the phone OTP + PIN) ───────────────────────────────
// A picked banner is uploaded IMMEDIATELY, before registering — see
// registerLogoUpload() — so its URL rides along and lands on the Store the
// moment admin approves. Only if that upload fails is the local file kept
// (savePendingBanner) and uploaded on first sign-in.
export const useRegister = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolves to whether it succeeded and, if not, whether the OTP proof was
  // the problem (expired / mismatched → verify the number again).
  const handleRegister = async (
    payload: PhoneRegisterRequest,
    bannerUri?: string,
  ): Promise<{ ok: true } | { ok: false; otpProblem: boolean }> => {
    try {
      setLoading(true);
      setError(null);

      let logoUrl: string | undefined;
      if (bannerUri) {
        try {
          logoUrl = await registerLogoUpload(bannerUri);
        } catch {
          // Falls through to the deferred pending-banner path below.
        }
      }

      const email = payload.email?.trim() ? normalizeEmail(payload.email) : undefined;
      await registerWithPhone({ ...payload, email, logoUrl });
      void signOutFirebase();
      await saveLastMobile(payload.mobileNumber);

      if (bannerUri && !logoUrl) {
        try {
          await savePendingBanner(payload.mobileNumber, bannerUri);
        } catch {
          // Best-effort — worst case the vendor sets it later from Store Settings.
        }
      }

      router.replace({ pathname: '/(auth)/login', params: { registered: '1', mobile: payload.mobileNumber } });
      return { ok: true };
    } catch (err) {
      setError(cleanMessage(err, 'Registration failed. Please try again.'));
      return { ok: false, otpProblem: isOtpProofError(err) };
    } finally {
      setLoading(false);
    }
  };

  return { handleRegister, loading, error, clearError: () => setError(null) };
};
