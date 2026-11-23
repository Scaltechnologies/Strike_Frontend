// src/modules/auth/services/authService.ts
//
// Vendor auth is mobile number + 4-digit PIN. The number is proven with a
// Firebase phone OTP (src/core/firebase/firebaseAuth.ts) at registration and
// for "Forgot PIN"; the backend reads the number from the verified Firebase ID
// token, never from the request. These endpoints return their bodies directly
// (no ApiResponse<T> envelope).

import axiosInstance, { BASE_URL } from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import {
  ChangePinRequest,
  PhoneRegisterRequest,
  PinSignInRequest,
  ResetPinRequest,
  VendorAuthResponse,
} from '../types/auth.types';
import { uploadFile } from '../../../core/api/fileUpload';

// POST /api/auth/vendor/phone/register — submits the store for admin review.
export const registerWithPhone = async (payload: PhoneRegisterRequest): Promise<string> => {
  const res = await axiosInstance.post<{ message?: string }>(endpoints.auth.vendor.phoneRegister, payload);
  return res.data?.message ?? '';
};

// POST /api/auth/vendor/pin/signin
export const signInWithPin = async (payload: PinSignInRequest): Promise<VendorAuthResponse> => {
  const res = await axiosInstance.post<VendorAuthResponse>(endpoints.auth.vendor.pinSignIn, payload);
  return res.data;
};

// POST /api/auth/vendor/pin/reset — tokens come back only for ACTIVE vendors.
export const resetPin = async (payload: ResetPinRequest): Promise<VendorAuthResponse> => {
  const res = await axiosInstance.post<VendorAuthResponse>(endpoints.auth.vendor.pinReset, payload);
  return res.data;
};

// POST /api/auth/vendor/pin/change — bearer token attached by axiosInstance.
// Returns fresh tokens (the old refresh token is revoked).
export const changePin = async (payload: ChangePinRequest): Promise<VendorAuthResponse> => {
  const res = await axiosInstance.post<VendorAuthResponse>(endpoints.auth.vendor.pinChange, payload);
  return res.data;
};

// POST /api/auth/vendor/register/upload-logo — unauthenticated (called before
// registering, since no vendor JWT exists yet). Returns { logoUrl }. Uses the
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
