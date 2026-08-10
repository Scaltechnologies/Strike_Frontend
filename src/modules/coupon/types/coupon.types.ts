// src/modules/coupon/types/coupon.types.ts
// Mirrors admin-service's CouponResponse — read-only, vendor-scoped.

export type DiscountType = 'PERCENTAGE' | 'FLAT';

export interface CouponResponse {
  id: number;
  code: string;
  title: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minPurchaseAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  vendorId: number | null;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
