// src/modules/coupon/services/couponService.ts

import axiosInstance from '../../../core/api/axiosInstance';
import { ApiResponse } from '../../../core/types/api.types';
import endpoints from '../../../core/api/endpoints';
import { CouponResponse } from '../types/coupon.types';

// GET /api/vendor/coupons/my
export async function getMyCoupons(): Promise<CouponResponse[]> {
  const res = await axiosInstance.get<ApiResponse<CouponResponse[]>>(endpoints.coupon.my);
  return res.data.data ?? [];
}
