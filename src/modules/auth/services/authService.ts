// src/modules/auth/services/authService.ts

import axiosInstance from '../../../core/api/axiosInstance';
import { RegisterVendorRequest, VendorAuthResponse } from '../types/auth.types';

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
