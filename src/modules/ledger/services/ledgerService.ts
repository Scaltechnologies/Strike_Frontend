// src/modules/ledger/services/ledgerService.ts

import axiosInstance from '../../../core/api/axiosInstance';
import { ApiResponse, PageResponse } from '../../../core/types/api.types';
import endpoints from '../../../core/api/endpoints';
import { TransactionResponse } from '../types/ledger.types';

// GET /api/ledger/store/{storeId}?page=&size=
// Returns paginated transaction history for the vendor's store.
// Both CARD_PURCHASE and REDEMPTION records are included.
export async function getStoreTransactions(
  storeId: number,
  page = 0,
  size = 20,
): Promise<PageResponse<TransactionResponse>> {
  const res = await axiosInstance.get<ApiResponse<PageResponse<TransactionResponse>>>(
    endpoints.ledger.store(storeId),
    { params: { page, size } },
  );
  return res.data.data;
}
