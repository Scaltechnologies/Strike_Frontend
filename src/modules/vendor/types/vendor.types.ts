// src/modules/vendor/types/vendor.types.ts
// Derived from: vendor-service VendorProfileController DTOs

// ── Vendor Profile ─────────────────────────────────────────────────────

// Response: GET /api/vendor/profile
export interface VendorProfileResponse {
  id: number;
  vendorId: number;
  shopName: string;
  ownerName: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// Request: PUT /api/vendor/profile (full update)
//           PATCH /api/vendor/profile (partial update — same shape, all fields optional)
export interface UpdateVendorProfileRequest {
  shopName?: string;
  ownerName?: string;
  mobile?: string;
  email?: string;
  address?: string;
  category?: string;
  description?: string;
  logoUrl?: string;
}

// ── Vendor Status ──────────────────────────────────────────────────────

// Response: GET /api/vendor/profile/status
// Backend returns Map<String,Object> with keys: status, rejectionReason, commissionRate
export interface VendorProfileStatus {
  status: 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  rejectionReason: string | null;
  commissionRate: number;
}
