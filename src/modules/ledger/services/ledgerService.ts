import axiosInstance from '../../../core/api/axiosInstance';
import { PageResponse } from '../../../core/types/api.types';
import endpoints from '../../../core/api/endpoints';
import { TransactionResponse } from '../types/ledger.types';

// GET /api/ledger/store/{storeId}?page=&size=
// VendorTransactionController returns PageResponse<TransactionResponse> directly,
// unwrapped (no ApiResponse envelope) — normalise a plain array too just in case.
export async function getStoreTransactions(
  storeId: number,
  page = 0,
  size = 20,
): Promise<PageResponse<TransactionResponse>> {
  const res = await axiosInstance.get<
    PageResponse<TransactionResponse> | TransactionResponse[]
  >(
    endpoints.ledger.store(storeId),
    { params: { page, size } },
  );

  const raw = res.data;

  if (!raw) {
    return { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, last: true };
  }

  // Backend returned a plain array instead of a paginated envelope
  if (Array.isArray(raw)) {
    return {
      content: raw,
      page: 0,
      size: raw.length,
      totalElements: raw.length,
      totalPages: 1,
      last: true,
    };
  }

  // Standard PageResponse — guard every field to prevent downstream crashes
  return {
    content:       raw.content       ?? [],
    page:          raw.page          ?? 0,
    size:          raw.size          ?? size,
    totalElements: raw.totalElements ?? 0,
    totalPages:    raw.totalPages    ?? 1,
    last:          raw.last          ?? true,
  };
}
