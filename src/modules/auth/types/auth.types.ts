// src/modules/auth/types/auth.types.ts

export interface SendOtpRequest {
  phoneNumber: string;
}

export interface SendOtpResponse {
  message: string;
  otpExpiresInSeconds: number;
}

export interface VerifyOtpRequest {
  phoneNumber: string;
  otp: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface VerifyOtpResponse {
  tokens: AuthTokens;
  isNewUser: boolean;
}

export interface SignupRequest {
  hotelName: string;
  address: string;
  mobileNumber: string;
  email: string;
  latitude: number;
  longitude: number;
}

export interface SignupResponse {
  tokens: AuthTokens;
  userId: string;
}

export interface AuthUser {
  userId: string;
  name: string;
  phoneNumber: string;
  role: 'USER' | 'VENDOR' | 'ADMIN';
}