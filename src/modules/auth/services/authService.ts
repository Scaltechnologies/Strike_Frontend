// src/modules/auth/services/authService.ts

import {
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  SignupRequest,
  SignupResponse,
} from '../types/auth.types';

// ── Mock delay helper ─────────────────────────────
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ── Send OTP ──────────────────────────────────────
export const sendOtp = async (
  payload: SendOtpRequest
): Promise<SendOtpResponse> => {
  await delay(1000);
  console.log('Sending OTP to:', payload.phoneNumber);
  return {
    message: 'OTP sent successfully',
    otpExpiresInSeconds: 60,
  };
};

// ── Verify OTP ────────────────────────────────────
export const verifyOtp = async (
  payload: VerifyOtpRequest
): Promise<VerifyOtpResponse> => {
  await delay(1000);

  // Mock: "999999" = registered vendor, anything else = not registered
  const isNewUser = payload.otp !== '999999';

  return {
    tokens: {
      accessToken: 'mock_access_token_123',
      refreshToken: 'mock_refresh_token_456',
    },
    isNewUser,
  };
};

// ── Signup ────────────────────────────────────────
export const signup = async (
  payload: SignupRequest
): Promise<SignupResponse> => {
  await delay(1000);
  console.log('Signing up vendor:', payload.hotelName, payload.mobileNumber);
  return {
    tokens: {
      accessToken: 'mock_access_token_789',
      refreshToken: 'mock_refresh_token_012',
    },
    userId: 'mock_user_001',
  };
};