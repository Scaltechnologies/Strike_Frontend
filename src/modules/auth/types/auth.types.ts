// src/modules/auth/types/auth.types.ts

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type VendorStatus = 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

// Backend: /pin/signin, /pin/reset, /pin/change response. token/refreshToken
// are absent when /pin/reset is used by a vendor still awaiting approval.
export interface VendorAuthResponse {
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  vendorId: number;
  hotelName?: string;
  mobileNumber?: string;
  email?: string;
  address?: string;
  status: VendorStatus;
  message?: string;
}

// Backend: POST /api/auth/vendor/pin/signin body
export interface PinSignInRequest {
  mobileNumber: string;
  pin: string;
}

// Backend: POST /api/auth/vendor/pin/change body (bearer token required)
export interface ChangePinRequest {
  currentPin: string;
  newPin: string;
}

// Backend: POST /api/auth/vendor/pin/reset body ("Forgot PIN")
export interface ResetPinRequest {
  firebaseIdToken: string;
  newPin: string;
}

// Backend: POST /api/auth/vendor/phone/register body. The mobile number is
// proven by firebaseIdToken (Firebase phone OTP) and must match mobileNumber.
export interface PhoneRegisterRequest {
  hotelName: string;
  address: string;
  mobileNumber: string;
  // Optional contact email — not used for sign-in.
  email?: string;
  latitude: number;
  longitude: number;
  // From POST /api/auth/vendor/register/upload-logo when a banner was picked
  // and the immediate upload succeeded; otherwise the banner is uploaded on
  // first sign-in (see useRegister).
  logoUrl?: string;
  firebaseIdToken: string;
  pin: string;
  // Optional — this phone's FCM token, so the "approved" push reaches the vendor
  // before they can sign in (see getPushInfoForRegistration).
  pushToken?: string;
  pushPlatform?: 'ANDROID' | 'IOS';
  deviceName?: string;
  appVersion?: string;
}
