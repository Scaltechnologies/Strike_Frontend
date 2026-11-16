// src/core/firebase/firebaseAuth.ts
//
// Thin wrapper around @react-native-firebase/auth's modular Phone Auth API.
// This is the ONLY place in the app that talks to Firebase directly — the
// Firebase ID token produced here is exchanged exactly once for the backend
// Vendor JWT (see authService.firebaseVerify) and is never itself treated as
// an application session token.
//
// Native module — requires an EAS development build. Does NOT work in Expo Go.

import {
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
  getIdToken as firebaseGetIdToken,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import type { ConfirmationResult, User } from '@react-native-firebase/auth';

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

function toE164IndianPhone(phoneNumber: string): string {
  const digits = phoneNumber.trim();
  if (!INDIAN_MOBILE_REGEX.test(digits)) {
    throw new Error('Enter a valid 10-digit mobile number.');
  }
  return `+91${digits}`;
}

// Held in module scope because that's the only place Firebase's own SDK
// gives us to keep a ConfirmationResult between the send and confirm steps.
// Replaced wholesale on every send/resend; consumed (single-use) on confirm.
let confirmationResult: ConfirmationResult | null = null;

// The Firebase user from the last successful confirm. Kept so that a retry
// after a *backend* failure (e.g. firebase-verify rejecting the number) can
// re-run the exchange instead of failing with "session expired" — the
// ConfirmationResult itself can't be confirmed twice.
let confirmedUser: User | null = null;

// E164 number of the pending send — used to recognise an Android
// auto-verification (see confirmPhoneOtp).
let pendingPhone: string | null = null;

// On Android, when the number belongs to the SIM in this device (the normal
// case for a vendor registering on their own phone), Firebase auto-verifies
// (instant verification / SMS auto-retrieval) and the native SDK signs the
// user in by itself (RNFirebase's onVerificationCompleted). That consumes the
// verification, so confirm(code) then fails with auth/session-expired even
// though the number IS verified — and with instant verification no SMS may
// arrive at all. So we watch auth state for the whole pending send and treat
// a sign-in for the pending number as a successful verification.
let authUnsubscribe: (() => void) | null = null;
let confirmInFlight = false;
const autoVerifyListeners = new Set<(user: User) => void>();

function matchesPending(user: User | null): user is User {
  return !!user && !!pendingPhone && user.phoneNumber === pendingPhone;
}

function autoVerifiedUser(): User | null {
  const user = getAuth().currentUser;
  return matchesPending(user) ? user : null;
}

function watchForAutoVerification(): void {
  authUnsubscribe?.();
  authUnsubscribe = onAuthStateChanged(getAuth(), (user) => {
    if (!matchesPending(user) || confirmedUser) return;
    confirmedUser = user;
    confirmationResult = null;
    // A manual confirm() in flight picks confirmedUser up itself — only tell
    // the screen when the sign-in happened entirely on its own.
    if (!confirmInFlight) {
      autoVerifyListeners.forEach((cb) => cb(user));
    }
  });
}

// The native auto-sign-in races the confirm() rejection, so its auth-state
// event may reach JS a moment later — wait briefly before giving up.
async function waitForAutoVerifiedUser(timeoutMs: number): Promise<User | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const user = confirmedUser ?? autoVerifiedUser();
    if (user) return user;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return confirmedUser ?? autoVerifiedUser();
}

// Lets the OTP screen continue automatically when Firebase verified the
// number without the vendor typing a code. Fires immediately if that already
// happened before the screen subscribed. Returns an unsubscribe function.
export function onPhoneAutoVerified(cb: (user: User) => void): () => void {
  autoVerifyListeners.add(cb);
  if (confirmedUser && !confirmInFlight) cb(confirmedUser);
  return () => {
    autoVerifyListeners.delete(cb);
  };
}

// Sends (or resends) a Firebase Phone Auth OTP to a 10-digit Indian mobile
// number. Any previously pending confirmation is discarded — only the most
// recently sent code is valid.
export async function sendPhoneOtp(phoneNumber: string): Promise<void> {
  const formatted = toE164IndianPhone(phoneNumber);
  authUnsubscribe?.();
  authUnsubscribe = null;
  confirmationResult = null;
  confirmedUser = null;
  pendingPhone = formatted;
  // Drop any Firebase user left from an earlier number so only a sign-in that
  // happens for this send can count as auto-verification.
  await signOutFirebase();
  watchForAutoVerification();
  try {
    const result = await signInWithPhoneNumber(getAuth(), formatted);
    // If auto-verification already completed, this confirmation is unusable.
    if (!confirmedUser) confirmationResult = result;
  } catch (err) {
    throw new Error(mapFirebaseAuthError(err));
  }
}

// Confirms the OTP against the pending ConfirmationResult and returns the
// signed-in Firebase user. A wrong code leaves the confirmation pending so
// the vendor can retype it; once verified (manually or automatically),
// retries return the same user until the next sendPhoneOtp(). Only a
// genuinely expired code/session forces a resend.
export async function confirmPhoneOtp(code: string): Promise<User> {
  const already = confirmedUser ?? autoVerifiedUser();
  if (already) {
    confirmationResult = null;
    confirmedUser = already;
    return already;
  }
  if (!confirmationResult) {
    const late = await waitForAutoVerifiedUser(1500);
    if (late) return late;
    throw new Error('Your OTP session expired. Please request a new code.');
  }
  let credential;
  confirmInFlight = true;
  try {
    credential = await confirmationResult.confirm(code);
  } catch (err) {
    const errCode = (err as { code?: string } | null | undefined)?.code;
    if (errCode === 'auth/code-expired' || errCode === 'auth/session-expired') {
      // Usually the auto-verification above rather than a real expiry.
      const late = await waitForAutoVerifiedUser(3000);
      if (late) {
        confirmationResult = null;
        confirmedUser = late;
        return late;
      }
      confirmationResult = null;
    }
    throw new Error(mapFirebaseAuthError(err));
  } finally {
    confirmInFlight = false;
  }
  if (!credential?.user) {
    throw new Error('Verification failed. Please try again.');
  }
  confirmationResult = null;
  confirmedUser = credential.user;
  return credential.user;
}

// Firebase ID token — exchanged once for the backend Vendor JWT via
// POST /api/auth/vendor/firebase-verify. Never stored, never logged.
export async function getFirebaseIdToken(user: User): Promise<string> {
  try {
    return await firebaseGetIdToken(user);
  } catch (err) {
    throw new Error(mapFirebaseAuthError(err));
  }
}

// Best-effort local Firebase sign-out. The application's session is the
// backend JWT pair in secureStorage, not Firebase's own session — this never
// gates or replaces that.
export async function signOutFirebase(): Promise<void> {
  try {
    await firebaseSignOut(getAuth());
  } catch {
    // best-effort only
  }
}

// Maps Firebase Auth error codes to user-facing copy. The raw `code` is
// always appended to the message (not just in __DEV__) because a release/
// production build has no visible console — without this, an unmapped code
// is indistinguishable from any other failure on device.
export function mapFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string } | null | undefined)?.code ?? '';

  if (__DEV__) {
    console.warn('[firebaseAuth] error code:', code || 'unknown');
  }

  const suffix = code ? ` (${code})` : '';

  switch (code) {
    case 'auth/invalid-phone-number':
      return 'That phone number looks invalid. Please check and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a while before trying again.';
    case 'auth/quota-exceeded':
      return 'SMS limit reached for now. Please try again later.';
    case 'auth/invalid-verification-code':
      return 'Incorrect OTP. Please check and try again.';
    case 'auth/code-expired':
      return 'This OTP has expired. Please request a new one.';
    case 'auth/session-expired':
      return 'Your OTP session expired. Please request a new one.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/invalid-app-credential':
    case 'auth/app-not-authorized':
      // Almost always a SHA-1/SHA-256 certificate fingerprint mismatch: the
      // keystore that signed this build isn't registered against the
      // Firebase Android app, so Play Integrity attestation rejects the
      // Phone Auth request before any SMS is sent.
      return `Verification failed due to an app configuration issue. Please try again later.${suffix}`;
    case 'auth/missing-client-identifier':
    case 'auth/captcha-check-failed':
      return `Verification failed (app not verified with Firebase). Please try again later.${suffix}`;
    default:
      return `Something went wrong. Please try again.${suffix}`;
  }
}
