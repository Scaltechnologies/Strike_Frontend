// src/core/firebase/firebaseAuth.ts
//
// Thin wrapper around @react-native-firebase/auth's Phone Auth API.
// This is the ONLY place in the app that talks to Firebase directly — the
// Firebase ID token produced here is exchanged exactly once for the backend
// Vendor JWT (see authService.firebaseVerify) and is never itself treated as
// an application session token.
//
// Native module — requires an EAS development build. Does NOT work in Expo Go.
//
// ── Why verifyPhoneNumber() and not signInWithPhoneNumber() ──────────────
// On Android, when the number belongs to the SIM in this device (the normal
// case for a vendor registering on their own phone), Google Play services
// verifies it on its own — instant verification, or SMS auto-retrieval.
// With signInWithPhoneNumber(), RNFirebase's native code then calls
// signInWithCredential() *by itself* and swallows the result. That consumes
// the verification session, so the code the vendor types afterwards is
// rejected with auth/session-expired ("Your OTP session expired") even though
// the number was verified — and JS only learns about it through a racy
// onAuthStateChanged event, if at all. It also explains why it "works with a
// different number": that number's SIM isn't in the device, so nothing is
// auto-verified and the typed code is the only path.
//
// verifyPhoneNumber() instead reports every step to JS and never signs in on
// its own. We own the single signInWithCredential() call — either with the
// auto-verified credential or with the typed code, whichever comes first —
// so the session can't be consumed behind our back.

import {
  getAuth,
  verifyPhoneNumber,
  signInWithCredential,
  PhoneAuthProvider,
  getIdToken as firebaseGetIdToken,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import type { User } from '@react-native-firebase/auth';

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

// Android's auto-retrieval window (seconds). Firebase caps this at 120.
const AUTO_RETRIEVAL_TIMEOUT_SECONDS = 60;
// Safety net in case native never answers the send at all (e.g. the
// activity was unavailable) — otherwise the button would spin forever.
const SEND_TIMEOUT_MS = 60_000;

type PhoneAuthSnapshot = {
  state: 'sent' | 'timeout' | 'verified' | 'error';
  verificationId: string | null;
  code: string | null;
  error: unknown;
};

function toE164IndianPhone(phoneNumber: string): string {
  const digits = phoneNumber.trim();
  if (!INDIAN_MOBILE_REGEX.test(digits)) {
    throw new Error('Enter a valid 10-digit mobile number.');
  }
  return `+91${digits}`;
}

// ── Module state for the single pending verification ──────────────────
// Held in module scope because the send (register/login screen) and the
// confirm (OTP screen) happen on different screens.

// Bumped on every send so late events from a superseded send are ignored.
let generation = 0;
// From onCodeSent / onVerificationComplete — needed to build a credential
// from the code the vendor types.
let verificationId: string | null = null;
// The signed-in Firebase user once verified (automatically or manually).
// Also lets a retry after a *backend* failure (e.g. firebase-verify
// rejecting the request) re-run the exchange without a new SMS.
let confirmedUser: User | null = null;
// The one in-flight signInWithCredential(), shared so an auto-verification
// and a typed code can never sign in twice / race each other.
let signInInFlight: Promise<User> | null = null;
// True while the OTP screen's own Verify press is running — that path
// continues by itself, so the auto-verify listeners must stay quiet.
let manualConfirmInFlight = false;

type AutoVerifiedListener = (user: User, code: string | null) => void;
const autoVerifyListeners = new Set<AutoVerifiedListener>();
let autoVerifiedCode: string | null = null;

function resetPendingState(): void {
  generation += 1;
  verificationId = null;
  confirmedUser = null;
  signInInFlight = null;
  autoVerifiedCode = null;
}

function errorCode(err: unknown): string {
  return (err as { code?: string } | null | undefined)?.code ?? '';
}

// Signs in exactly once per send. Reuses an in-flight attempt instead of
// starting a second one against the same (single-use) verification.
function signInOnce(gen: number, attempt: () => Promise<User>): Promise<User> {
  if (confirmedUser) return Promise.resolve(confirmedUser);
  if (signInInFlight) return signInInFlight;
  const p = attempt()
    .then((user) => {
      if (gen === generation) confirmedUser = user;
      return user;
    })
    .finally(() => {
      if (signInInFlight === p) signInInFlight = null;
    });
  signInInFlight = p;
  return p;
}

// Android auto-verification: sign in with the credential native already has.
async function signInWithAutoVerifiedCredential(snapshot: PhoneAuthSnapshot): Promise<User> {
  const auth = getAuth();
  try {
    // A null verificationId makes native use the PhoneAuthCredential it
    // cached in onVerificationCompleted — this is the only form that works
    // for *instant* verification, where there is no SMS code at all.
    const cached = PhoneAuthProvider.credential(null as unknown as string, null as unknown as string);
    const result = await signInWithCredential(auth, cached);
    return result.user;
  } catch (cachedErr) {
    // Fall back to rebuilding it from the retrieved SMS code, if we got one.
    if (snapshot.verificationId && snapshot.code) {
      const rebuilt = PhoneAuthProvider.credential(snapshot.verificationId, snapshot.code);
      const result = await signInWithCredential(auth, rebuilt);
      return result.user;
    }
    throw cachedErr;
  }
}

async function handleAutoVerified(gen: number, snapshot: PhoneAuthSnapshot): Promise<void> {
  if (snapshot.verificationId) verificationId = snapshot.verificationId;
  autoVerifiedCode = snapshot.code;
  // A typed-code attempt may be running (e.g. a mistyped code) — let it
  // settle first so a failure there doesn't drag this attempt down with it.
  if (signInInFlight) {
    try {
      await signInInFlight;
    } catch {
      // ignore — try the auto-verified credential below
    }
  }
  if (gen !== generation) return;
  try {
    const user = await signInOnce(gen, () => signInWithAutoVerifiedCredential(snapshot));
    if (gen !== generation || manualConfirmInFlight) return;
    autoVerifyListeners.forEach((cb) => cb(user, autoVerifiedCode));
  } catch (err) {
    // Not fatal: the vendor can still type the SMS code — the session was
    // NOT consumed, because our own sign-in is what failed.
    if (__DEV__) console.log('[firebaseAuth] auto-verify sign-in failed:', errorCode(err));
  }
}

// Lets the OTP screen continue automatically when Android verified the
// number without the vendor typing a code. Fires immediately if that already
// happened before the screen subscribed. `code` is the auto-retrieved SMS
// code when there was one (for display only), or null for instant
// verification. Returns an unsubscribe function.
export function onPhoneAutoVerified(cb: AutoVerifiedListener): () => void {
  autoVerifyListeners.add(cb);
  if (confirmedUser && !manualConfirmInFlight) cb(confirmedUser, autoVerifiedCode);
  return () => {
    autoVerifyListeners.delete(cb);
  };
}

// Sends (or resends) a Firebase Phone Auth OTP to a 10-digit Indian mobile
// number. Resolves once the SMS is sent or the number is already verified;
// rejects with a user-facing message on failure. Any previously pending
// verification is discarded — only the most recent send is valid.
//
// forceResend: true for the OTP screen's "Resend OTP" — otherwise Firebase
// deliberately doesn't send a second SMS while the first request is still
// within its timeout.
export async function sendPhoneOtp(
  phoneNumber: string,
  options: { forceResend?: boolean } = {},
): Promise<void> {
  const formatted = toE164IndianPhone(phoneNumber);
  resetPendingState();
  const gen = generation;
  // Drop any Firebase user left from an earlier number — the app's session is
  // the backend JWT, never Firebase's own.
  await signOutFirebase();

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(
      () => settle(() => reject(new Error('Could not send OTP. Please check your connection and try again.'))),
      SEND_TIMEOUT_MS,
    );

    let listener: ReturnType<typeof verifyPhoneNumber>;
    try {
      listener = verifyPhoneNumber(
        getAuth(),
        formatted,
        AUTO_RETRIEVAL_TIMEOUT_SECONDS,
        !!options.forceResend,
      );
    } catch (err) {
      settle(() => reject(new Error(mapFirebaseAuthError(err))));
      return;
    }

    listener.on('state_changed', (raw) => {
      const snapshot = raw as unknown as PhoneAuthSnapshot;
      if (gen !== generation) return; // superseded by a newer send

      switch (snapshot.state) {
        case 'sent':
          verificationId = snapshot.verificationId;
          settle(resolve);
          break;
        case 'timeout':
          // Auto-retrieval window over — the typed code still works.
          if (snapshot.verificationId) verificationId = snapshot.verificationId;
          settle(resolve);
          break;
        case 'verified':
          // May arrive before 'sent' (instant verification, no SMS) or after
          // it (SMS auto-retrieval). Either way the send itself succeeded.
          void handleAutoVerified(gen, snapshot);
          settle(resolve);
          break;
        case 'error':
          settle(() => reject(new Error(mapFirebaseAuthError(snapshot.error))));
          break;
      }
    });
  });
}

// Confirms the typed OTP and returns the signed-in Firebase user. A wrong
// code leaves the verification pending so the vendor can retype it; once
// verified (manually or automatically), retries return the same user until
// the next sendPhoneOtp().
export async function confirmPhoneOtp(code: string): Promise<User> {
  if (confirmedUser) return confirmedUser;

  const gen = generation;
  manualConfirmInFlight = true;
  try {
    // Auto-verification already signing in? Use that rather than racing it
    // with a second sign-in on the same verification.
    if (signInInFlight) {
      try {
        return await signInInFlight;
      } catch {
        // fall through to the typed code
      }
    }

    if (!verificationId) {
      throw new Error('Your OTP session expired. Please tap "Resend OTP".');
    }
    const id = verificationId;
    return await signInOnce(gen, async () => {
      const credential = PhoneAuthProvider.credential(id, code.trim());
      const result = await signInWithCredential(getAuth(), credential);
      if (!result?.user) throw new Error('Verification failed. Please try again.');
      return result.user;
    });
  } catch (err) {
    // Belt and braces: if anything signed this number in meanwhile, accept it.
    if (gen === generation && confirmedUser) return confirmedUser;
    if (err instanceof Error && !errorCode(err)) throw err;
    throw new Error(mapFirebaseAuthError(err));
  } finally {
    manualConfirmInFlight = false;
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
// always appended to unmapped/config messages (not just in __DEV__) because a
// release/production build has no visible console — without this, an
// unmapped code is indistinguishable from any other failure on device.
export function mapFirebaseAuthError(error: unknown): string {
  const code = errorCode(error);

  if (__DEV__) {
    console.warn('[firebaseAuth] error code:', code || 'unknown');
  }

  const suffix = code ? ` (${code})` : '';

  switch (code) {
    case 'auth/invalid-phone-number':
      return 'That phone number looks invalid. Please check and try again.';
    case 'auth/too-many-requests':
      // Firebase anti-abuse block on this device/number — not something a
      // retry fixes; it lifts on its own after a while (can be hours).
      return 'Too many OTP requests from this device. Please try again after some time.';
    case 'auth/quota-exceeded':
      return 'SMS limit reached for now. Please try again later.';
    case 'auth/invalid-verification-code':
      return 'Incorrect OTP. Please check and try again.';
    case 'auth/code-expired':
      return 'This OTP has expired. Please tap "Resend OTP".';
    case 'auth/session-expired':
      return 'Your OTP session expired. Please tap "Resend OTP".';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/user-disabled':
      return 'This number has been disabled. Please contact support.';
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
