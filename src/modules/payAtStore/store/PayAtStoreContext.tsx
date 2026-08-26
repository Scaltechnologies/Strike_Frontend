import React, { createContext, useContext, useReducer, useCallback } from 'react';
import {
  fetchPending,
  fetchHistory,
  verifyQr as apiVerifyQr,
  verifyCode as apiVerifyCode,
  confirmPayment as apiConfirmPayment,
} from '../services/payAtStoreService';
import type { PayAtStorePayment } from '../types';

// ── State ────────────────────────────────────────────────────────────────

interface PayAtStoreState {
  pending: PayAtStorePayment[];
  history: PayAtStorePayment[];
  loadingPending: boolean;
  loadingHistory: boolean;
  refreshingPending: boolean;
  refreshingHistory: boolean;
  errorPending: string | null;
  errorHistory: string | null;
}

const initialState: PayAtStoreState = {
  pending: [],
  history: [],
  loadingPending: true,
  loadingHistory: true,
  refreshingPending: false,
  refreshingHistory: false,
  errorPending: null,
  errorHistory: null,
};

type Action =
  | { type: 'PENDING_LOADING'; refreshing: boolean }
  | { type: 'PENDING_SUCCESS'; data: PayAtStorePayment[] }
  | { type: 'PENDING_ERROR'; error: string }
  | { type: 'HISTORY_LOADING'; refreshing: boolean }
  | { type: 'HISTORY_SUCCESS'; data: PayAtStorePayment[] }
  | { type: 'HISTORY_ERROR'; error: string };

function reducer(state: PayAtStoreState, action: Action): PayAtStoreState {
  switch (action.type) {
    case 'PENDING_LOADING':
      return { ...state, loadingPending: !action.refreshing, refreshingPending: action.refreshing, errorPending: null };
    case 'PENDING_SUCCESS':
      return { ...state, pending: action.data, loadingPending: false, refreshingPending: false };
    case 'PENDING_ERROR':
      return { ...state, errorPending: action.error, loadingPending: false, refreshingPending: false };
    case 'HISTORY_LOADING':
      return { ...state, loadingHistory: !action.refreshing, refreshingHistory: action.refreshing, errorHistory: null };
    case 'HISTORY_SUCCESS':
      return { ...state, history: action.data, loadingHistory: false, refreshingHistory: false };
    case 'HISTORY_ERROR':
      return { ...state, errorHistory: action.error, loadingHistory: false, refreshingHistory: false };
    default:
      return state;
  }
}

// ── Context value ────────────────────────────────────────────────────────

interface PayAtStoreContextValue extends PayAtStoreState {
  loadPending: (refresh?: boolean, silent?: boolean) => Promise<void>;
  loadHistory: (refresh?: boolean, silent?: boolean) => Promise<void>;
  loadAll: (refresh?: boolean, silent?: boolean) => Promise<void>;
  verifyQr: (qrToken: string) => Promise<PayAtStorePayment>;
  verifyCode: (paymentId: number, code: string) => Promise<PayAtStorePayment>;
  // Reloads pending+history after — mirrors RedemptionContext's approve/reject pattern so a
  // stale pending row can never linger once the backend state has actually moved on.
  confirm: (paymentId: number) => Promise<PayAtStorePayment>;
}

const PayAtStoreCtx = createContext<PayAtStoreContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────

export function PayAtStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadPending = useCallback(async (refresh = false, silent = false) => {
    if (!silent) dispatch({ type: 'PENDING_LOADING', refreshing: refresh });
    try {
      const data = await fetchPending();
      dispatch({ type: 'PENDING_SUCCESS', data });
    } catch (e: any) {
      if (!silent) dispatch({ type: 'PENDING_ERROR', error: e?.message ?? 'Failed to load pending payments' });
    }
  }, []);

  const loadHistory = useCallback(async (refresh = false, silent = false) => {
    if (!silent) dispatch({ type: 'HISTORY_LOADING', refreshing: refresh });
    try {
      const data = await fetchHistory();
      dispatch({ type: 'HISTORY_SUCCESS', data: data.content ?? [] });
    } catch (e: any) {
      if (!silent) dispatch({ type: 'HISTORY_ERROR', error: e?.message ?? 'Failed to load payment history' });
    }
  }, []);

  const loadAll = useCallback(async (refresh = false, silent = false) => {
    await Promise.allSettled([loadPending(refresh, silent), loadHistory(refresh, silent)]);
  }, [loadPending, loadHistory]);

  const verifyQr = useCallback((qrToken: string) => apiVerifyQr(qrToken), []);
  const verifyCode = useCallback((paymentId: number, code: string) => apiVerifyCode(paymentId, code), []);

  const confirm = useCallback(async (paymentId: number) => {
    const result = await apiConfirmPayment(paymentId);
    await Promise.allSettled([loadPending(), loadHistory()]);
    return result;
  }, [loadPending, loadHistory]);

  return (
    <PayAtStoreCtx.Provider value={{ ...state, loadPending, loadHistory, loadAll, verifyQr, verifyCode, confirm }}>
      {children}
    </PayAtStoreCtx.Provider>
  );
}

export function usePayAtStore(): PayAtStoreContextValue {
  const ctx = useContext(PayAtStoreCtx);
  if (!ctx) throw new Error('usePayAtStore must be used inside PayAtStoreProvider');
  return ctx;
}
