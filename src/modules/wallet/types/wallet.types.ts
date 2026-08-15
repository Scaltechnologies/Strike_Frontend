// src/modules/wallet/types/wallet.types.ts
// Derived from: vendor-service VendorWithdrawalController, which proxies straight
// through to admin-service (WithdrawalRequest entity / InternalWithdrawalController).
// These 3 endpoints return raw JSON — NOT wrapped in the usual ApiResponse<T> envelope —
// because the vendor-service controller passes the admin-service response through as-is.
//
// A vendor may have at most one PENDING request at a time — POST returns 400 while
// one is outstanding.

export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PayoutMethod = 'BANK_TRANSFER' | 'UPI';

// GET /api/vendor/withdrawals/stats → raw object
export interface WithdrawalStats {
  totalRequests: number;
  totalEarnings: number;       // lifetime net revenue (subscription amount - commission)
  totalWithdrawn: number;      // lifetime amount from APPROVED requests
  pendingWithdrawals: number;  // sum of currently PENDING request amounts
  availableBalance: number;    // totalEarnings - totalWithdrawn - pendingWithdrawals, floored at 0
}

// GET /api/vendor/withdrawals → raw array (most recent 50, no pagination params)
// POST /api/vendor/withdrawals → raw object
export interface WithdrawalRequestResponse {
  id: number;
  vendorId: number;
  amount: number;
  method: PayoutMethod;
  bankAccountNumber: string | null;  // set when method === 'BANK_TRANSFER'
  bankAccountName: string | null;
  ifscCode: string | null;
  upiId: string | null;              // set when method === 'UPI'
  note: string | null;
  status: WithdrawalStatus;
  adminNote: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Request: POST /api/vendor/withdrawals
// vendorId is injected server-side from the JWT — do not send it.
// method defaults to BANK_TRANSFER server-side if omitted.
export interface CreateWithdrawalRequest {
  amount: number;
  method: PayoutMethod;
  bankAccountNumber?: string; // required when method === 'BANK_TRANSFER'
  bankAccountName?: string;   // required when method === 'BANK_TRANSFER'
  ifscCode?: string;          // required when method === 'BANK_TRANSFER'
  upiId?: string;             // required when method === 'UPI'
  note?: string;
}

// GET /api/vendor/withdrawals/commissions → raw PageResponse (NOT ApiResponse-wrapped)
// One row per card purchase: the gross amount, the platform's cut, and what was credited.
// REVERSED means a cancelled/duplicate purchase — excluded from totalEarnings/availableBalance
// server-side, so it must never render as "Credited" here either.
export type CommissionStatus = 'PENDING' | 'SETTLED' | 'REVERSED';

export interface CommissionRecordResponse {
  id: number;
  vendorId: number;
  vendorName: string;
  storeId: number;
  subscriptionId: number;
  cardName: string | null; // null for records created before this field existed
  userId: number;
  subscriptionAmount: number; // gross card price paid by the customer
  commissionRate: number;     // % taken by the platform at the time of purchase
  commissionAmount: number;   // subscriptionAmount * commissionRate / 100
  status: CommissionStatus;
  settledAt: string | null;
  createdAt: string;
}

export interface CommissionPage {
  content: CommissionRecordResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// GET /api/vendor/withdrawals/payout-method → raw object, or null if the vendor has
// never submitted a withdrawal yet. Remembered from their most recently used details
// so the request form can be pre-filled instead of retyped every time.
export interface SavedPayoutMethod {
  vendorId: number;
  method: PayoutMethod;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  ifscCode: string | null;
  upiId: string | null;
  updatedAt: string;
}
