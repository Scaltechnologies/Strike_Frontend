// src/modules/auth/services/authService.ts

import axiosInstance, { BASE_URL } from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import { RegisterVendorRequest, VendorAuthResponse } from '../types/auth.types';
import { uploadFile } from '../../../core/api/fileUpload';

// POST /api/auth/vendor/login — requests OTP for an existing vendor
export const sendOtp = async (mobileNumber: string): Promise<void> => {
  await axiosInstance.post('/api/auth/vendor/login', { mobileNumber });
};

// POST /api/auth/vendor/verify — verifies OTP, returns auth response with status.
// This endpoint returns VendorAuthResponse directly (no ApiResponse<T> wrapper).
export const verifyOtp = async (
  mobileNumber: string,
  otp: string,
): Promise<VendorAuthResponse> => {
  const res = await axiosInstance.post<VendorAuthResponse>(
    '/api/auth/vendor/verify',
    { mobileNumber, otp },
  );
  return res.data;
};

// POST /api/auth/vendor/register — creates vendor account, triggers OTP
export const registerVendor = async (
  payload: RegisterVendorRequest,
): Promise<void> => {
  await axiosInstance.post('/api/auth/vendor/register', payload);
};

// POST /api/auth/vendor/register/upload-logo — unauthenticated (called before /register,
// since no vendor JWT exists yet). Returns { logoUrl } directly, no ApiResponse<T> envelope
// (matches this controller's other endpoints — see verifyOtp's comment above). Uses the same
// native multipart upload as uploadStoreBanner (storeService.ts) since RN's fetch/FormData/Blob
// path doesn't work in this environment — see fileUpload.ts.
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

// POST /api/auth/vendor/firebase-verify — exchanges a Firebase Phone Auth ID
// token for the backend Vendor JWT. The idToken is never treated as the
// application's session token; it is only ever sent here, once, in the
// request body. Returns VendorAuthResponse — same shape as verifyOtp().
export const firebaseVerify = async (idToken: string): Promise<VendorAuthResponse> => {
  const res = await axiosInstance.post<VendorAuthResponse>(
    endpoints.auth.vendor.firebaseVerify,
    { idToken },
  );
  return res.data;
};
