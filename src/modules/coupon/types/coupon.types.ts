// src/modules/coupon/types/coupon.types.ts
// Mirrors admin-service's CouponResponse — read-only, vendor-scoped.

export type DiscountType = 'PERCENTAGE' | 'FLAT';

export type CouponApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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
  approvalStatus?: CouponApprovalStatus;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Request: POST /api/vendor/coupons
// Vendor submits this to request a new coupon; admin must approve before
// it becomes active. See endpoints.coupon.create.
export interface CreateCouponRequest {
  title: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minPurchaseAmount?: number;
  maxUses?: number;
  validFrom: string;   // YYYY-MM-DD
  validUntil: string;  // YYYY-MM-DD
}
