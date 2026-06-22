// src/core/types/api.types.ts
// Shared API wrapper types used across all services.
// ApiResponse<T> — every backend response is wrapped in this envelope.
// PageResponse<T> — matches Spring Boot's Page<T> serialisation.

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

// Custom PageResponse<T> wrapper used by all services (NOT Spring's Page<T> directly).
// Populated via PageResponse.from(Page<T> page) static factory.
//   content        — the items for this page
//   page           — 0-indexed current page number
//   size           — items per page
//   totalElements  — total item count across all pages
//   totalPages     — total page count
//   last           — true if this is the last page
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
