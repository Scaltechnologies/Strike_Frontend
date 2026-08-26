import axiosInstance from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import type { PayAtStorePayment } from '../types';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: string;
}

interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function fetchPending(): Promise<PayAtStorePayment[]> {
  const res = await axiosInstance.get<ApiResponse<PayAtStorePayment[]>>(
    endpoints.payAtStore.pending,
  );
  return res.data.data ?? [];
}

export async function fetchHistory(page = 0, size = 20): Promise<PageResponse<PayAtStorePayment>> {
  const res = await axiosInstance.get<ApiResponse<PageResponse<PayAtStorePayment>>>(
    endpoints.payAtStore.history,
    { params: { page, size } },
  );
  return res.data.data;
}

// qrToken must already have any "STRIKE-PAY-STORE:" prefix stripped — the backend hashes and
// matches only the raw token (see PaymentServiceImpl#verifyQr / the QR create response).
export async function verifyQr(qrToken: string): Promise<PayAtStorePayment> {
  const res = await axiosInstance.post<ApiResponse<PayAtStorePayment>>(
    endpoints.payAtStore.verifyQr,
    { qrToken },
  );
  return res.data.data;
}

export async function verifyCode(paymentId: number, code: string): Promise<PayAtStorePayment> {
  const res = await axiosInstance.post<ApiResponse<PayAtStorePayment>>(
    endpoints.payAtStore.verifyCode,
    { paymentId, code },
  );
  return res.data.data;
}

// Idempotent server-side — safe to call again if a network response was lost after a first
// attempt actually landed (see PaymentServiceImpl#confirmPayAtStore's early-return on SUCCESS).
export async function confirmPayment(paymentId: number): Promise<PayAtStorePayment> {
  const res = await axiosInstance.post<ApiResponse<PayAtStorePayment>>(
    endpoints.payAtStore.confirm(paymentId),
  );
  return res.data.data;
}
