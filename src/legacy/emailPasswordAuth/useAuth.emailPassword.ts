// ─────────────────────────────────────────────────────────────────────────
// LEGACY — email + password vendor sign-in. DISABLED.
// Original path: src/modules/auth/hooks/useAuth.ts (replaced by mobile number + 4-digit PIN sign-in).
// Kept commented out for reference; see ./README.md to re-enable.
// ─────────────────────────────────────────────────────────────────────────
// // src/modules/auth/hooks/useAuth.ts
// //
// // Vendor auth: email + password.
// //   Register (no password) → admin approves → backend emails a generated
// //   password → Sign in → forced Change Password → Home.
// //   "Forgot password" emails a new generated password (the old one keeps
// //   working until either is used).
//
// import { useState } from 'react';
// import { router } from 'expo-router';
// import {
//   registerVendor,
//   registerLogoUpload,
//   signIn,
//   requestPasswordReset,
//   changePassword,
// } from '../services/authService';
// import {
//   saveTokens,
//   savePendingBanner,
//   getPendingBanner,
//   clearPendingBanner,
//   setMustChangePassword,
//   saveSignInEmail,
//   clearAll,
// } from '../../../core/storage/secureStorage';
// import { RegisterVendorRequest, VendorAuthResponse } from '../types/auth.types';
// import { uploadStoreBanner } from '../../store/services/storeService';
// import { getUserMessage } from '../../../core/api/errorMessage';
// import { normalizeEmail } from '../utils/validation';
// import { deregisterCurrentPushToken } from '../../notifications/push/pushRegistration';
// import { resetNotificationStore } from '../../notifications/store/notificationStore';
//
// type ApiError = Error & { status?: number; code?: string };
//
// // axiosInstance shapes HTTP errors as "[401] /api/auth/vendor/signin — <message>".
// // The backend message is already user-facing copy, so show just that part.
// export function cleanMessage(err: unknown, fallback: string): string {
//   const msg = getUserMessage(err, fallback);
//   return msg.replace(/^\[\d{3}\]\s+\S+\s+—\s+/, '').trim() || fallback;
// }
//
// function errorCode(err: unknown): string | undefined {
//   return (err as ApiError | null)?.code;
// }
//
// // Persist the session and route to the right place for this sign-in.
// async function completeSignIn(response: VendorAuthResponse): Promise<void> {
//   await saveTokens({ accessToken: response.token, refreshToken: response.refreshToken });
//   if (response.email) await saveSignInEmail(response.email);
//   const mustChange = !!response.mustChangePassword;
//   await setMustChangePassword(mustChange);
//
//   // A banner picked at signup whose immediate upload failed is kept locally,
//   // keyed by mobile number, and uploaded on the vendor's first sign-in.
//   try {
//     const pending = await getPendingBanner();
//     if (pending && pending.mobileNumber === response.mobileNumber) {
//       await uploadStoreBanner(pending.uri);
//       await clearPendingBanner();
//     }
//   } catch (bannerErr) {
//     // The picked file may be gone after a long approval wait — never block
//     // sign-in; the vendor can still set a banner from Store Settings.
//     console.warn('Pending banner upload failed:', bannerErr);
//     await clearPendingBanner();
//   }
//
//   if (mustChange) {
//     router.replace({ pathname: '/change-password', params: { forced: '1' } });
//   } else {
//     router.replace('/(main)/home');
//   }
// }
//
// // ── Sign in ────────────────────────────────────────────────────────────
// export const useSignIn = () => {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   // e.g. PASSWORD_NOT_SET / ACCOUNT_LOCKED — lets the screen point at
//   // "Forgot password" when that's the way forward.
//   const [errorCodeState, setErrorCode] = useState<string | undefined>(undefined);
//
//   const handleSignIn = async (email: string, password: string) => {
//     try {
//       setLoading(true);
//       setError(null);
//       setErrorCode(undefined);
//       const response = await signIn({ email: normalizeEmail(email), password });
//       await completeSignIn(response);
//     } catch (err) {
//       setErrorCode(errorCode(err));
//       setError(cleanMessage(err, 'Could not sign in. Please try again.'));
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   return { handleSignIn, loading, error, errorCode: errorCodeState };
// };
//
// // ── Forgot password ────────────────────────────────────────────────────
// export const useForgotPassword = () => {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [sentMessage, setSentMessage] = useState<string | null>(null);
//
//   const handleRequest = async (email: string) => {
//     try {
//       setLoading(true);
//       setError(null);
//       const message = await requestPasswordReset(normalizeEmail(email));
//       setSentMessage(
//         message ||
//           "If an approved account exists for this email, we've sent a new password to it. Please check your inbox (and spam folder).",
//       );
//     } catch (err) {
//       setError(cleanMessage(err, 'Could not send the email. Please try again.'));
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   return { handleRequest, loading, error, sentMessage, reset: () => setSentMessage(null) };
// };
//
// // ── Change password (forced after a generated password, or from Profile) ──
// export const useChangePassword = () => {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//
//   // Resolves true on success. The backend returns fresh tokens and revokes the
//   // previous refresh token, so other devices have to sign in again.
//   const handleChange = async (currentPassword: string, newPassword: string): Promise<boolean> => {
//     try {
//       setLoading(true);
//       setError(null);
//       const response = await changePassword({ currentPassword, newPassword });
//       if (response?.token && response?.refreshToken) {
//         await saveTokens({ accessToken: response.token, refreshToken: response.refreshToken });
//       }
//       await setMustChangePassword(false);
//       return true;
//     } catch (err) {
//       setError(cleanMessage(err, 'Could not change your password. Please try again.'));
//       return false;
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   return { handleChange, loading, error };
// };
//
// // Ends the local session (used by the forced change-password screen's
// // "Sign out" — same cleanup as Profile → Logout).
// export const signOutLocally = async (): Promise<void> => {
//   try { await deregisterCurrentPushToken(); } catch { /* best-effort */ }
//   resetNotificationStore();
//   await clearAll();
//   router.replace('/(auth)/login');
// };
//
// // ── Register ───────────────────────────────────────────────────────────
// // POST /api/auth/vendor/register submits the store for admin review — no OTP,
// // no password. On success the vendor is sent to Sign in with a note that
// // their login details will arrive by email once approved.
// //
// // A picked banner is uploaded IMMEDIATELY, before /register — see
// // registerLogoUpload() — so its URL rides along on RegisterVendorRequest and
// // lands on the Store the moment admin approves. Only if that upload fails is
// // the local file kept (savePendingBanner) and uploaded on first sign-in.
// export const useRegister = () => {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   // e.g. EMAIL_NOT_VERIFIED (verification token expired) → the form re-verifies.
//   const [errorCodeState, setErrorCode] = useState<string | undefined>(undefined);
//
//   const handleRegister = async (payload: RegisterVendorRequest, bannerUri?: string) => {
//     try {
//       setLoading(true);
//       setError(null);
//       setErrorCode(undefined);
//
//       let logoUrl: string | undefined;
//       if (bannerUri) {
//         try {
//           logoUrl = await registerLogoUpload(bannerUri);
//         } catch {
//           // Falls through to the deferred pending-banner path below.
//         }
//       }
//
//       const email = normalizeEmail(payload.email);
//       await registerVendor({ ...payload, email, logoUrl });
//
//       if (bannerUri && !logoUrl) {
//         try {
//           await savePendingBanner(payload.mobileNumber, bannerUri);
//         } catch {
//           // Best-effort — worst case the vendor sets it later from Store Settings.
//         }
//       }
//
//       router.replace({ pathname: '/(auth)/login', params: { registered: '1', email } });
//     } catch (err) {
//       setErrorCode(errorCode(err));
//       setError(cleanMessage(err, 'Registration failed. Please try again.'));
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   return { handleRegister, loading, error, errorCode: errorCodeState };
// };
