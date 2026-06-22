// src/modules/dashboard/types/dashboard.types.ts
// Derived from: vendor-service DashboardController + AnalyticsController DTOs

// ── Dashboard ──────────────────────────────────────────────────────────

// Response: GET /api/vendor/dashboard/my  |  GET /api/vendor/dashboard/store/{storeId}
// Backend fields: storeId, totalRevenue, totalRedemptionAmount, totalCardsSold,
//   totalActiveSubscriptions, totalSubscriptions, totalRedemptions,
//   recentTransactions (List<Object>), recentRedemptions (List<Object>), activeCards (List<Object>)
// NOTE: recentTransactions / recentRedemptions / activeCards are typed List<Object> in the backend
// Java source — exact field shape is not specified in the docs. Typed as unknown[] here;
// UI screens should treat these defensively.
export interface DashboardSummaryResponse {
  storeId: number;
  totalRevenue: number;
  totalRedemptionAmount: number;
  totalCardsSold: number;
  totalActiveSubscriptions: number;
  totalSubscriptions: number;
  totalRedemptions: number;
  recentTransactions: RecentTransaction[];
  recentRedemptions: RecentRedemption[];
  activeCards: ActiveCardSummary[];
}

// Best-effort shapes for the List<Object> fields.
// These are inferred from what the backend likely returns; treat all fields as optional
// since the backend contract does not formally define them.
export interface RecentTransaction {
  id?: number;
  amount?: number;
  transactionType?: string;
  createdAt?: string;
  customerId?: number;
  subscriptionId?: number;
  remarks?: string | null;
  [key: string]: unknown;
}

export interface RecentRedemption {
  id?: number;
  totalAmount?: number;
  status?: string;
  createdAt?: string;
  userId?: number;
  [key: string]: unknown;
}

export interface ActiveCardSummary {
  id?: number;
  name?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

// ── Analytics ──────────────────────────────────────────────────────────

// Response: GET /api/analytics/my  |  GET /api/analytics/store/{storeId}
// Verified from AnalyticsResponse.java — only 3 fields; lists are List<Object> at runtime.
export interface AnalyticsResponse {
  storeId: number;
  transactions: unknown[];
  redemptions: unknown[];
}
