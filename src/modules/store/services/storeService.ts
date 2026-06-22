// src/modules/store/services/storeService.ts

import axiosInstance from '../../../core/api/axiosInstance';
import { ApiResponse } from '../../../core/types/api.types';
import endpoints from '../../../core/api/endpoints';
import {
  StoreResponse,
  StoreDetailsRequest,
  UpdateStoreLocationRequest,
  StoreStatus,
  StoreTimingRequest,
  StoreTimingResponse,
  StoreHolidayRequest,
  StoreHolidayResponse,
} from '../types/store.types';

// ── Store ───────────────────────────────────────────────────────────────

// GET /api/vendor/stores/my
export async function getMyStore(): Promise<StoreResponse> {
  const res = await axiosInstance.get<ApiResponse<StoreResponse>>(endpoints.store.my);
  return res.data.data;
}

// PUT /api/vendor/stores/my
export async function updateMyStore(payload: StoreDetailsRequest): Promise<StoreResponse> {
  const res = await axiosInstance.put<ApiResponse<StoreResponse>>(endpoints.store.my, payload);
  return res.data.data;
}

// PATCH /api/vendor/stores/my/location
export async function updateStoreLocation(payload: UpdateStoreLocationRequest): Promise<StoreResponse> {
  const res = await axiosInstance.patch<ApiResponse<StoreResponse>>(endpoints.store.myLocation, payload);
  return res.data.data;
}

// PATCH /api/stores/my/status?status=ACTIVE
// Backend: @RequestParam StoreStatus status — sent as a URL query parameter, not request body
export async function updateStoreStatus(status: StoreStatus): Promise<StoreResponse> {
  const res = await axiosInstance.patch<ApiResponse<StoreResponse>>(
    endpoints.store.myStatus,
    null,
    { params: { status } },
  );
  return res.data.data;
}

// ── Store Timings ───────────────────────────────────────────────────────

// GET /api/vendor/stores/{storeId}/timings
export async function getStoreTimings(storeId: number): Promise<StoreTimingResponse[]> {
  const res = await axiosInstance.get<ApiResponse<StoreTimingResponse[]>>(
    endpoints.store.timings(storeId),
  );
  return res.data.data ?? [];
}

// POST /api/vendor/stores/{storeId}/timings
// Upserts: if a timing for the same dayOfWeek already exists it is overwritten
export async function upsertStoreTiming(
  storeId: number,
  payload: StoreTimingRequest,
): Promise<StoreTimingResponse> {
  const res = await axiosInstance.post<ApiResponse<StoreTimingResponse>>(
    endpoints.store.timings(storeId),
    payload,
  );
  return res.data.data;
}

// DELETE /api/vendor/stores/{storeId}/timings/{timingId}
export async function deleteStoreTiming(storeId: number, timingId: number): Promise<void> {
  await axiosInstance.delete(endpoints.store.timing(storeId, timingId));
}

// ── Store Holidays ──────────────────────────────────────────────────────

// GET /api/vendor/stores/{storeId}/holidays
export async function getStoreHolidays(storeId: number): Promise<StoreHolidayResponse[]> {
  const res = await axiosInstance.get<ApiResponse<StoreHolidayResponse[]>>(
    endpoints.store.holidays(storeId),
  );
  return res.data.data ?? [];
}

// POST /api/vendor/stores/{storeId}/holidays
export async function addStoreHoliday(
  storeId: number,
  payload: StoreHolidayRequest,
): Promise<StoreHolidayResponse> {
  const res = await axiosInstance.post<ApiResponse<StoreHolidayResponse>>(
    endpoints.store.holidays(storeId),
    payload,
  );
  return res.data.data;
}

// DELETE /api/vendor/stores/{storeId}/holidays/{holidayId}
export async function deleteStoreHoliday(storeId: number, holidayId: number): Promise<void> {
  await axiosInstance.delete(endpoints.store.holiday(storeId, holidayId));
}
