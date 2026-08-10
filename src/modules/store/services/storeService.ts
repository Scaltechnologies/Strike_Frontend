// src/modules/store/services/storeService.ts

import axiosInstance, { BASE_URL } from '../../../core/api/axiosInstance';
import { getAccessToken } from '../../../core/storage/secureStorage';
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

// POST /api/vendor/stores/my/banner — multipart upload, field name "file".
//
// Deliberately bypasses axiosInstance/axios here and uses the raw fetch API.
// Axios's FormData handling in React Native goes through header-merging logic
// (instance defaults + per-call overrides + its own transformRequest) that is
// easy to get subtly wrong — no combination of explicit Content-Type overrides
// reliably produced a request the backend could parse. fetch's RN implementation
// detects a FormData body natively and always generates the correct
// `multipart/form-data; boundary=…` header itself, with no header gymnastics
// required, so upload this one endpoint through fetch instead.
export async function uploadStoreBanner(localUri: string): Promise<StoreResponse> {
  const filename = localUri.split('/').pop() || `banner-${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    name: filename,
    type: mimeType,
  } as any);

  const token = await getAccessToken();
  const url = `${BASE_URL}${endpoints.store.myBanner}`;

  let res: globalThis.Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData as any,
    });
  } catch {
    throw new Error(`No response from server. Check BASE_URL (${BASE_URL}) and that the backend is running.`);
  }

  const body: ApiResponse<StoreResponse> | null = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.message || `HTTP ${res.status}`;
    const apiError = new Error(`[${res.status}] ${endpoints.store.myBanner} — ${message}`) as Error & { status?: number };
    apiError.status = res.status;
    throw apiError;
  }
  if (!body) {
    throw new Error('Malformed response from server.');
  }
  return body.data;
}

// PATCH /api/stores/my/status?status=ACTIVE
// Backend: @RequestParam StoreStatus status — sent as a URL query parameter, no request body.
// Pass undefined (not null) so axios sends no Content-Length, avoiding Spring body-parse errors.
export async function updateStoreStatus(status: StoreStatus): Promise<StoreResponse> {
  const res = await axiosInstance.patch<ApiResponse<StoreResponse>>(
    endpoints.store.myStatus,
    undefined,
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

// PUT /api/vendor/stores/{storeId}/timings/{timingId}
// Used when a timing for this day already exists — POST only creates (unique constraint).
export async function updateStoreTiming(
  storeId: number,
  timingId: number,
  payload: StoreTimingRequest,
): Promise<StoreTimingResponse> {
  const res = await axiosInstance.put<ApiResponse<StoreTimingResponse>>(
    endpoints.store.timing(storeId, timingId),
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
