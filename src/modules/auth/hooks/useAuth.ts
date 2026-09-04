// src/modules/auth/hooks/useAuth.ts

import { useState } from 'react';
import { router } from 'expo-router';
// authService.sendOtp / verifyOtp (legacy POST /api/auth/vendor/login|verify)
// are intentionally not imported here — the Firebase path below replaces
// them as the UI path, but both remain defined and exported in authService
// as the preserved compatibility fallback.
import { registerVendor, registerLogoUpload, firebaseVerify } from '../services/authService';
import { sendPhoneOtp, confirmPhoneOtp, getFirebaseIdToken } from '../../../core/firebase/firebaseAuth';
import {
  saveTokens, savePendingBanner, getPendingBanner, clearPendingBanner,
} from '../../../core/storage/secureStorage';
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

  // mobileNumber is used to key the pending-banner lookup below (and, on a
  // fresh registration, to persist bannerUri if it hasn't been saved yet) —
  // it is not sent to the backend, since the verified phone number is
  // already embedded in the Firebase ID token.
  //
  // bannerUri: local device image picked on the registration screen. It can
  // essentially NEVER be uploaded in this same call — a brand-new vendor's
  // first successful verify always transitions PENDING -> VERIFIED, not
  // ACTIVE (ACTIVE only happens once an admin approves them, in a separate,
  // later session), so no token/Store row exists yet here. The real upload
  // happens in the "on ACTIVE" branch below, which runs whenever this vendor
  // eventually authenticates successfully with status ACTIVE — that login
  // may be a plain login with no bannerUri argument at all, so the source of
  // truth for what to upload is secureStorage's pending-banner entry, keyed
  // by mobile number, not this function argument.
  const handleVerifyOtp = async (mobileNumber: string, otp: string, bannerUri?: string) => {
    try {
      setLoading(true);
      setError(null);

      if (bannerUri) {
        try {
          await savePendingBanner(mobileNumber, bannerUri);
        } catch {
          // Best-effort — worst case the vendor sets it later from Store Settings.
        }
      }

      const firebaseUser = await confirmPhoneOtp(otp);
      const idToken = await getFirebaseIdToken(firebaseUser);
      const response = await firebaseVerify(idToken);

      if (response.status === 'ACTIVE') {
        // Map backend `token` field to `accessToken` for secureStorage.
        // The Firebase ID token itself is discarded here — never stored.
        await saveTokens({ accessToken: response.token, refreshToken: response.refreshToken });

        // Upload whatever banner is pending for THIS phone number — could have
        // been picked just now, or days ago in a registration session that
        // ended at "pending-approval" long before this login.
        try {
          const pending = await getPendingBanner();
          if (pending && pending.mobileNumber === mobileNumber) {
            await uploadStoreBanner(pending.uri);
            await clearPendingBanner();
          }
        } catch (bannerErr) {
          // The picked file may no longer exist after a long approval wait —
          // this must never block login. Leave the pending entry in place
          // only if it's a plausible transient failure; either way the
          // vendor can still set the banner from Store Settings.
          console.warn('Pending banner upload failed:', bannerErr);
          await clearPendingBanner();
        }

        router.replace('/(main)/home');
      } else {
        // PENDING, VERIFIED, SUSPENDED, REJECTED — not yet approved. The
        // pending banner (if any) stays in secureStorage, to be uploaded the
        // next time this vendor logs in and lands here with status ACTIVE.
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
// POST /api/auth/vendor/register creates the vendor row (PENDING) and kicks
// off the legacy backend-side OTP (unused — nothing reads it). The actual
// OTP the vendor types on the next screen has to come from Firebase, so we
// must also call sendPhoneOtp() here, exactly like useSendOtp does for
// login — otherwise the OTP screen's confirmPhoneOtp() has no pending
// ConfirmationResult and fails until the vendor taps "Resend OTP" (which
// does call sendPhoneOtp) once. registerVendor() is safe to retry if
// sendPhoneOtp() fails below: the backend only creates a new vendor row when
// one doesn't already exist for this mobile number, so a retry after a
// Firebase-side failure (e.g. SMS quota) won't duplicate it.
//
// A picked banner is uploaded to the server IMMEDIATELY, before /register —
// see registerLogoUpload() — so its URL rides along on RegisterVendorRequest
// and lands on the Store the moment admin approves (vendor-service sets it
// at Store creation time). This is deliberately separate from — and takes
// priority over — the older savePendingBanner()/uploadStoreBanner() path
// below (see useVerifyOtp), which re-uploads the same *local* file only on
// the vendor's first ACTIVE login: that could be hours or days after
// registration (however long admin approval takes), and OS cache eviction
// can invalidate a locally-picked file's URI well before then, silently
// losing the banner with no error ever surfacing to the vendor. Uploading
// now, while the file is guaranteed to still exist, avoids that failure mode
// entirely. The old path is kept as a fallback only for when this immediate
// upload itself fails (e.g. a network blip during signup).
export const useRegister = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (payload: RegisterVendorRequest, bannerUri?: string) => {
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

      await registerVendor({ ...payload, logoUrl });

      // Only needed as a fallback when the immediate upload above didn't happen
      // or failed — if it succeeded, the Store will already get its banner at
      // approval time and there is nothing left to defer.
      if (bannerUri && !logoUrl) {
        try {
          await savePendingBanner(payload.mobileNumber, bannerUri);
        } catch {
          // Best-effort — worst case the vendor sets it later from Store Settings.
        }
      }
      await sendPhoneOtp(payload.mobileNumber);
      router.push({
        pathname: '/(auth)/otp',
        params: { phoneNumber: payload.mobileNumber, bannerUri: !logoUrl ? (bannerUri ?? '') : '' },
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return { handleRegister, loading, error };
};
