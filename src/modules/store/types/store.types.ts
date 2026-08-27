// src/modules/store/types/store.types.ts
// Derived from: vendor-service DTOs in MASTER_BACKEND_DOCUMENTATION.md

// ── Enums ──────────────────────────────────────────────────────────────

export type StoreStatus = 'ACTIVE' | 'INACTIVE' | 'TEMPORARILY_CLOSED';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

// ── Store ──────────────────────────────────────────────────────────────

// Response: GET /api/vendor/stores/my
export interface StoreResponse {
  id: number;
  vendorId: number;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  category: string | null;
  description: string | null;
  logoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  status: StoreStatus;
  timings: StoreTimingResponse[];
  holidays: StoreHolidayResponse[];
  createdAt: string;
  updatedAt: string;
}

// Request: PUT /api/vendor/stores/my
export interface StoreDetailsRequest {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  category?: string;
  description?: string;
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
}

// Request: PATCH /api/vendor/stores/my/location
export interface UpdateStoreLocationRequest {
  latitude: number;
  longitude: number;
}

// ── Store Timings ──────────────────────────────────────────────────────

// Request: POST /api/vendor/stores/{id}/timings
// dayOfWeek is Java DayOfWeek — MONDAY … SUNDAY
// openTime / closeTime must be "HH:mm:ss" (Java LocalTime default format)
// When isClosed is true, send null (not undefined) so Spring doesn't NPE on absent fields
export interface StoreTimingRequest {
  dayOfWeek: DayOfWeek;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

// Response: GET/POST /api/vendor/stores/{id}/timings
export interface StoreTimingResponse {
  id: number;
  storeId: number;
  dayOfWeek: DayOfWeek;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

// ── Store Holidays ─────────────────────────────────────────────────────

// Request: POST /api/vendor/stores/{id}/holidays
// date is ISO LocalDate "YYYY-MM-DD"
export interface StoreHolidayRequest {
  date: string;
  reason?: string;
}

// Response: GET/POST /api/vendor/stores/{id}/holidays
export interface StoreHolidayResponse {
  id: number;
  storeId: number;
  date: string;
  reason: string | null;
  createdAt: string;
}

// ── Store Categories ────────────────────────────────────────────────────

// Response: GET /api/vendor/store-categories — the admin-curated list
// Store.category (a plain string, unchanged) gets picked from.
export interface StoreCategoryOption {
  id: number;
  name: string;
  displayOrder: number | null;
}
