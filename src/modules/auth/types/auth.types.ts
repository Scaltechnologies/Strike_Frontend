// src/modules/auth/types/auth.types.ts

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Backend: POST /api/auth/vendor/verify response
export interface VendorAuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  vendorId: number;
  hotelName: string;
  mobileNumber: string;
  email: string;
  address: string;
  status: 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  message: string;
}

// Frontend type — UI uses "phoneNumber", service maps to "mobileNumber"
export interface SendOtpRequest {
  phoneNumber: string;
}

export interface VerifyOtpRequest {
  phoneNumber: string;
  otp: string;
}

// Backend: POST /api/auth/vendor/register body
export interface RegisterVendorRequest {
  hotelName: string;
  address: string;
  mobileNumber: string;
  email?: string;
  latitude: number;
  longitude: number;
}
