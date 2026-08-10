import axiosInstance from '../../../core/api/axiosInstance';
import { ApiResponse } from '../../../core/types/api.types';
import endpoints from '../../../core/api/endpoints';
import { DashboardSummaryResponse, AnalyticsResponse } from '../types/dashboard.types';

function safeDashboard(d: DashboardSummaryResponse | null | undefined): DashboardSummaryResponse {
  return {
    storeId:                  d?.storeId                  ?? 0,
    totalRevenue:             Number(d?.totalRevenue             ?? 0),
    totalRedemptionAmount:    Number(d?.totalRedemptionAmount    ?? 0),
    totalCardsSold:           Number(d?.totalCardsSold           ?? 0),
    totalActiveSubscriptions: Number(d?.totalActiveSubscriptions ?? 0),
    totalSubscriptions:       Number(d?.totalSubscriptions       ?? 0),
    totalRedemptions:         Number(d?.totalRedemptions         ?? 0),
    recentTransactions:       d?.recentTransactions ?? [],
    recentRedemptions:        d?.recentRedemptions  ?? [],
    activeCards:              d?.activeCards         ?? [],
  };
}

// GET /api/vendor/dashboard/my
// Falls back to /store/{storeId} if the /my endpoint errors for a reason other than
// "no data yet" (e.g. a 500 or network failure). A 404 from either endpoint means the
// vendor genuinely has no dashboard record yet (brand-new store, nothing sold/redeemed) —
// that's treated as a valid empty state, not a failure, so the UI never has to show a
// scary error banner for what is really just zeroed-out stats.
export async function getMyDashboard(): Promise<DashboardSummaryResponse> {
  try {
    const res = await axiosInstance.get<ApiResponse<DashboardSummaryResponse>>(
      endpoints.dashboard.my,
    );
    return safeDashboard(res.data.data);
  } catch (primaryErr: any) {
    if (primaryErr?.status === 404) return safeDashboard(null);

    // /my endpoint failed for a non-404 reason — try store-specific endpoint as fallback
    let storeId: number;
    try {
      type SR = { success: boolean; data: { id: number } };
      const storeRes = await axiosInstance.get<SR>(endpoints.store.my);
      storeId = storeRes.data.data.id;
    } catch {
      throw primaryErr; // can't resolve store — surface original error
    }

    try {
      const res = await axiosInstance.get<ApiResponse<DashboardSummaryResponse>>(
        endpoints.dashboard.store(storeId),
      );
      return safeDashboard(res.data.data);
    } catch (fallbackErr: any) {
      if (fallbackErr?.status === 404) return safeDashboard(null);
      // Both dashboard endpoints failed for a real error — throw so the UI shows an
      // error + retry instead of silently rendering all-zero stats (which look like real data).
      throw primaryErr;
    }
  }
}

// GET /api/vendor/dashboard/store/{storeId}
export async function getStoreDashboard(storeId: number): Promise<DashboardSummaryResponse> {
  const res = await axiosInstance.get<ApiResponse<DashboardSummaryResponse>>(
    endpoints.dashboard.store(storeId),
  );
  return safeDashboard(res.data.data);
}

// GET /api/analytics/my
export async function getMyAnalytics(): Promise<AnalyticsResponse> {
  const res = await axiosInstance.get<ApiResponse<AnalyticsResponse>>(endpoints.analytics.my);
  return res.data.data;
}

// GET /api/analytics/store/{storeId}
export async function getStoreAnalytics(storeId: number): Promise<AnalyticsResponse> {
  const res = await axiosInstance.get<ApiResponse<AnalyticsResponse>>(
    endpoints.analytics.store(storeId),
  );
  return res.data.data;
}
