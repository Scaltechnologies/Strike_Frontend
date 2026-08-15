// src/modules/coupon/services/couponService.ts

import axiosInstance from '../../../core/api/axiosInstance';
import { ApiResponse } from '../../../core/types/api.types';
import endpoints from '../../../core/api/endpoints';
import { CouponResponse, CreateCouponRequest } from '../types/coupon.types';

// GET /api/vendor/coupons/my
export async function getMyCoupons(): Promise<CouponResponse[]> {
  const res = await axiosInstance.get<ApiResponse<CouponResponse[]>>(endpoints.coupon.my);
  return res.data.data ?? [];
}

// POST /api/vendor/coupons — submits a coupon request for admin approval.
export async function requestCoupon(payload: CreateCouponRequest): Promise<CouponResponse> {
  const res = await axiosInstance.post<ApiResponse<CouponResponse>>(endpoints.coupon.create, payload);
  return res.data.data as CouponResponse;
}
