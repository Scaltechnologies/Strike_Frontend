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
  signInWithPhoneNumber,
  getIdToken as firebaseGetIdToken,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import type { ConfirmationResult, User } from '@react-native-firebase/auth';

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

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

// Sends (or resends) a Firebase Phone Auth OTP to a 10-digit Indian mobile
// number. Any previously pending confirmation is discarded — only the most
// recently sent code is valid.
export async function sendPhoneOtp(phoneNumber: string): Promise<void> {
  const formatted = toE164IndianPhone(phoneNumber);
  confirmationResult = null;
  try {
    confirmationResult = await signInWithPhoneNumber(getAuth(), formatted);
  } catch (err) {
    throw new Error(mapFirebaseAuthError(err));
  }
}

// Confirms the OTP against the pending ConfirmationResult and returns the
// signed-in Firebase user. Single-use — calling this again without a fresh
// sendPhoneOtp() fails with a clear "session expired" error instead of
// silently reusing a stale confirmation.
export async function confirmPhoneOtp(code: string): Promise<User> {
  if (!confirmationResult) {
    throw new Error('Your OTP session expired. Please request a new code.');
  }
  try {
    const credential = await confirmationResult.confirm(code);
    confirmationResult = null;
    if (!credential?.user) {
      throw new Error('Verification failed. Please try again.');
    }
    return credential.user;
  } catch (err) {
    confirmationResult = null;
    throw new Error(mapFirebaseAuthError(err));
  }
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
