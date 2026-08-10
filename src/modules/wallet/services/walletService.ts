// src/modules/wallet/services/walletService.ts
// These 3 endpoints proxy straight through to admin-service and are NOT wrapped in
// the usual ApiResponse<T> envelope — read res.data directly.

import axiosInstance from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import {
  WithdrawalStats,
  WithdrawalRequestResponse,
  CreateWithdrawalRequest,
} from '../types/wallet.types';

// GET /api/vendor/withdrawals/stats
export async function getWithdrawalStats(): Promise<WithdrawalStats> {
  const res = await axiosInstance.get<WithdrawalStats>(endpoints.withdrawal.stats);
  return res.data;
}

// GET /api/vendor/withdrawals — most recent 50, newest first. Server ignores paging params.
export async function getWithdrawals(): Promise<WithdrawalRequestResponse[]> {
  const res = await axiosInstance.get<WithdrawalRequestResponse[]>(endpoints.withdrawal.my);
  return res.data ?? [];
}

// POST /api/vendor/withdrawals
// Backend rejects with 400 if a PENDING request already exists for this vendor.
export async function requestWithdrawal(
  payload: CreateWithdrawalRequest,
): Promise<WithdrawalRequestResponse> {
  const res = await axiosInstance.post<WithdrawalRequestResponse>(endpoints.withdrawal.my, payload);
  return res.data;
}
