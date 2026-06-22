// src/modules/vendor/services/vendorProfileService.ts

import axiosInstance from '../../../core/api/axiosInstance';
import { ApiResponse } from '../../../core/types/api.types';
import endpoints from '../../../core/api/endpoints';
import {
  VendorProfileResponse,
  UpdateVendorProfileRequest,
  VendorProfileStatus,
} from '../types/vendor.types';

// GET /api/vendor/profile
export async function getVendorProfile(): Promise<VendorProfileResponse> {
  const res = await axiosInstance.get<ApiResponse<VendorProfileResponse>>(endpoints.vendor.profile);
  return res.data.data;
}

// PUT /api/vendor/profile — full update
export async function updateVendorProfile(
  payload: UpdateVendorProfileRequest,
): Promise<VendorProfileResponse> {
  const res = await axiosInstance.put<ApiResponse<VendorProfileResponse>>(
    endpoints.vendor.profile,
    payload,
  );
  return res.data.data;
}

// PATCH /api/vendor/profile — partial update
export async function patchVendorProfile(
  payload: UpdateVendorProfileRequest,
): Promise<VendorProfileResponse> {
  const res = await axiosInstance.patch<ApiResponse<VendorProfileResponse>>(
    endpoints.vendor.profile,
    payload,
  );
  return res.data.data;
}

// GET /api/vendor/profile/status
// Returns { status, rejectionReason, commissionRate }
export async function getVendorProfileStatus(): Promise<VendorProfileStatus> {
  const res = await axiosInstance.get<ApiResponse<VendorProfileStatus>>(
    endpoints.vendor.profileStatus,
  );
  return res.data.data;
}
