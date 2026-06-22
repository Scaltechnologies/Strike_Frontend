// src/modules/dashboard/services/dashboardService.ts

import axiosInstance from '../../../core/api/axiosInstance';
import { ApiResponse } from '../../../core/types/api.types';
import endpoints from '../../../core/api/endpoints';
import { DashboardSummaryResponse, AnalyticsResponse } from '../types/dashboard.types';

// GET /api/vendor/dashboard/my
export async function getMyDashboard(): Promise<DashboardSummaryResponse> {
  const res = await axiosInstance.get<ApiResponse<DashboardSummaryResponse>>(
    endpoints.dashboard.my,
  );
  return res.data.data;
}

// GET /api/vendor/dashboard/store/{storeId}
export async function getStoreDashboard(storeId: number): Promise<DashboardSummaryResponse> {
  const res = await axiosInstance.get<ApiResponse<DashboardSummaryResponse>>(
    endpoints.dashboard.store(storeId),
  );
  return res.data.data;
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
