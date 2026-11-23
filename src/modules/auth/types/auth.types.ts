// src/modules/auth/types/auth.types.ts

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type VendorStatus = 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

// Backend: POST /api/auth/vendor/signin and /change-password response
export interface VendorAuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  vendorId: number;
  hotelName: string;
  mobileNumber: string;
  email: string;
  address: string;
  status: VendorStatus;
  message?: string;
  // True while the vendor is on a system-generated password (from the
  // approval or forgot-password email) — the app must make them set their own.
  mustChangePassword?: boolean;
}

// Backend: POST /api/auth/vendor/signin body
export interface SignInRequest {
  email: string;
  password: string;
}

// Backend: POST /api/auth/vendor/change-password body (bearer token required)
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Backend: POST /api/auth/vendor/register body. No password: the vendor
// receives a generated one by email once an admin approves the store.
export interface RegisterVendorRequest {
  hotelName: string;
  address: string;
  mobileNumber: string;
  email: string;
  latitude: number;
  longitude: number;
  // Returned by POST /api/auth/vendor/register/upload-logo (see
  // authService.registerLogoUpload) when a banner was picked on the signup
  // screen and the immediate upload succeeded. Left undefined otherwise —
  // useRegister() then falls back to the deferred pending-banner upload on
  // the vendor's first sign-in instead.
  logoUrl?: string;
}
