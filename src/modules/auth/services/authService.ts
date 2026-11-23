// src/modules/auth/services/authService.ts
//
// Vendor auth is email + password. Registration takes no password: once an
// admin approves the store, the backend emails the vendor a generated password
// (stored only as a hash), and the app makes them set their own on first
// sign-in. These endpoints return their bodies directly (no ApiResponse<T>
// envelope).

import axiosInstance, { BASE_URL } from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import {
  ChangePasswordRequest,
  CodeSentResponse,
  RegisterVendorRequest,
  SignInRequest,
  VendorAuthResponse,
} from '../types/auth.types';
import { uploadFile } from '../../../core/api/fileUpload';

// POST /api/auth/vendor/register — submits the store for admin review.
export const registerVendor = async (payload: RegisterVendorRequest): Promise<void> => {
  await axiosInstance.post(endpoints.auth.vendor.register, payload);
};

// POST /api/auth/vendor/signin
export const signIn = async (payload: SignInRequest): Promise<VendorAuthResponse> => {
  const res = await axiosInstance.post<VendorAuthResponse>(endpoints.auth.vendor.signIn, payload);
  return res.data;
};

// POST /api/auth/vendor/forgot-password — always resolves with the same
// message when the request is accepted, whether or not the email exists.
export const requestPasswordReset = async (email: string): Promise<string> => {
  const res = await axiosInstance.post<{ message?: string }>(
    endpoints.auth.vendor.forgotPassword,
    { email },
  );
  return res.data?.message ?? '';
};

// POST /api/auth/vendor/change-password — the bearer token is attached by
// axiosInstance. Returns fresh tokens (the old refresh token is revoked).
export const changePassword = async (payload: ChangePasswordRequest): Promise<VendorAuthResponse> => {
  const res = await axiosInstance.post<VendorAuthResponse>(endpoints.auth.vendor.changePassword, payload);
  return res.data;
};

// POST /api/auth/vendor/email-otp/send — emails a 6-digit code (registration).
export const sendRegistrationEmailCode = async (email: string): Promise<CodeSentResponse> => {
  const res = await axiosInstance.post<CodeSentResponse>(endpoints.auth.vendor.emailOtpSend, { email });
  return res.data;
};

// POST /api/auth/vendor/email-otp/verify — returns the token /register needs.
export const verifyRegistrationEmailCode = async (email: string, code: string): Promise<string> => {
  const res = await axiosInstance.post<{ emailVerificationToken: string }>(
    endpoints.auth.vendor.emailOtpVerify,
    { email, code },
  );
  return res.data.emailVerificationToken;
};

// POST /api/auth/vendor/change-email/request — password re-check, code to the new email.
export const requestEmailChange = async (newEmail: string, currentPassword: string): Promise<CodeSentResponse> => {
  const res = await axiosInstance.post<CodeSentResponse>(
    endpoints.auth.vendor.changeEmailRequest,
    { newEmail, currentPassword },
  );
  return res.data;
};

// POST /api/auth/vendor/change-email/confirm — returns fresh tokens.
export const confirmEmailChange = async (newEmail: string, code: string): Promise<VendorAuthResponse> => {
  const res = await axiosInstance.post<VendorAuthResponse>(
    endpoints.auth.vendor.changeEmailConfirm,
    { newEmail, code },
  );
  return res.data;
};

// POST /api/auth/vendor/register/upload-logo — unauthenticated (called before
// /register, since no vendor JWT exists yet). Returns { logoUrl }. Uses the
// same native multipart upload as uploadStoreBanner (storeService.ts) since
// RN's fetch/FormData/Blob path doesn't work in this environment — see fileUpload.ts.
export const registerLogoUpload = async (localUri: string): Promise<string> => {
  const url = `${BASE_URL}${endpoints.auth.vendor.registerLogoUpload}`;
  const res = await uploadFile(url, localUri, 'file', null);

  const body: { logoUrl?: string } | null = (() => {
    try { return JSON.parse(res.body); } catch { return null; }
  })();

  if (res.status < 200 || res.status >= 300 || !body?.logoUrl) {
    throw new Error(`Logo upload failed (${res.status})`);
  }
  return body.logoUrl;
};
