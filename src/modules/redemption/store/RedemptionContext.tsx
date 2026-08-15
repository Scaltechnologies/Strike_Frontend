import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import axiosInstance from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import {
  fetchRedemptionQueue,
  fetchRedemptionHistory,
  confirmRedemption as apiApprove,
  rejectRedemption as apiReject,
} from '../services/redemptionService';
import type { RedemptionRequest } from '../services/redemptionService';

// ── State ────────────────────────────────────────────────────────────────

interface RedemptionState {
  storeId: number | null;
  storeName: string;
  storeAddress: string;
  storeLogoUrl: string | null;
  queue: RedemptionRequest[];
  history: RedemptionRequest[];
  // historyDegraded: true when the full history endpoint is unavailable (e.g.
  // Hibernate LazyInitializationException) and we fell back to queue-only data.
  historyDegraded: boolean;
  loadingQueue: boolean;
  loadingHistory: boolean;
  refreshingQueue: boolean;
  refreshingHistory: boolean;
  errorQueue: string | null;
  errorHistory: string | null;
}

const initialState: RedemptionState = {
  storeId: null,
  storeName: '',
  storeAddress: '',
  storeLogoUrl: null,
  queue: [],
  history: [],
  historyDegraded: false,
  loadingQueue: false,
  loadingHistory: false,
  refreshingQueue: false,
  refreshingHistory: false,
  errorQueue: null,
  errorHistory: null,
};

// ── Reducer ──────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_STORE'; id: number; name: string; address: string; logoUrl: string | null }
  | { type: 'QUEUE_LOADING'; refreshing: boolean }
  | { type: 'QUEUE_SUCCESS'; data: RedemptionRequest[] }
  | { type: 'QUEUE_ERROR'; error: string }
  | { type: 'HISTORY_LOADING'; refreshing: boolean }
  | { type: 'HISTORY_SUCCESS'; data: RedemptionRequest[]; degraded: boolean }
  | { type: 'HISTORY_ERROR'; error: string };

function reducer(state: RedemptionState, action: Action): RedemptionState {
  switch (action.type) {
    case 'SET_STORE':
      return { ...state, storeId: action.id, storeName: action.name, storeAddress: action.address, storeLogoUrl: action.logoUrl };
    case 'QUEUE_LOADING':
      return { ...state, loadingQueue: !action.refreshing, refreshingQueue: action.refreshing, errorQueue: null };
    case 'QUEUE_SUCCESS':
      return { ...state, queue: action.data, loadingQueue: false, refreshingQueue: false };
    case 'QUEUE_ERROR':
      return { ...state, errorQueue: action.error, loadingQueue: false, refreshingQueue: false };
    case 'HISTORY_LOADING':
      return {
        ...state,
        loadingHistory: !action.refreshing,
        refreshingHistory: action.refreshing,
        errorHistory: null,
        historyDegraded: false,
      };
    case 'HISTORY_SUCCESS':
      return {
        ...state,
        history: action.data,
        historyDegraded: action.degraded,
        loadingHistory: false,
        refreshingHistory: false,
      };
    case 'HISTORY_ERROR':
      return { ...state, errorHistory: action.error, loadingHistory: false, refreshingHistory: false };
    default:
      return state;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

// Returns true for Hibernate LazyInitializationException and similar
// backend session/proxy errors that the frontend cannot recover from
// by retrying the same request.
function isLazyInitError(message: string): boolean {
  return (
    message.includes('lazily initialize') ||
    message.includes('LazyInitialization') ||
    message.includes('could not initialize proxy') ||
    message.includes('no Session')
  );
}

// ── Context value ────────────────────────────────────────────────────────

interface RedemptionContextValue extends RedemptionState {
  ensureStore: () => Promise<number | null>;
  refreshStoreMeta: () => Promise<void>;
  // `silent` skips the loading/refreshing/error dispatches entirely — used by
  // background polling so a transient network blip doesn't flash an error
  // banner or spinner over data the vendor is actively looking at.
  loadQueue: (refresh?: boolean, silent?: boolean) => Promise<void>;
  loadHistory: (refresh?: boolean, silent?: boolean) => Promise<void>;
  loadAll: (refresh?: boolean, silent?: boolean) => Promise<void>;
  approveRedemption: (id: string) => Promise<void>;
  rejectRedemption: (id: string, reason?: string) => Promise<void>;
}

const RedemptionCtx = createContext<RedemptionContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────

export function RedemptionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Ref prevents stale closures; Promise ref prevents concurrent double-fetches.
  const storeIdRef = useRef<number | null>(null);
  const storePromiseRef = useRef<Promise<number | null> | null>(null);

  const ensureStore = useCallback(async (): Promise<number | null> => {
    if (storeIdRef.current != null) return storeIdRef.current;
    if (storePromiseRef.current) return storePromiseRef.current;

    storePromiseRef.current = (async () => {
      try {
        type SR = { success: boolean; data: { id: number; name: string; address: string; logoUrl: string | null } };
        const res = await axiosInstance.get<SR>(endpoints.store.my);
        const s = res.data.data;
        storeIdRef.current = s.id;
        dispatch({ type: 'SET_STORE', id: s.id, name: s.name ?? '', address: s.address ?? '', logoUrl: s.logoUrl ?? null });
        return s.id;
      } catch {
        return null;
      } finally {
        storePromiseRef.current = null;
      }
    })();

    return storePromiseRef.current;
  }, []);

  // Re-fetches store name/address/logoUrl regardless of cache — used after the
  // vendor edits store info or uploads a new banner from Store Settings, so the
  // header avatar elsewhere in the app (e.g. home.tsx) reflects the change
  // without requiring an app restart.
  const refreshStoreMeta = useCallback(async (): Promise<void> => {
    try {
      type SR = { success: boolean; data: { id: number; name: string; address: string; logoUrl: string | null } };
      const res = await axiosInstance.get<SR>(endpoints.store.my);
      const s = res.data.data;
      storeIdRef.current = s.id;
      dispatch({ type: 'SET_STORE', id: s.id, name: s.name ?? '', address: s.address ?? '', logoUrl: s.logoUrl ?? null });
    } catch {
      // Best-effort — the next ensureStore()/loadAll() call will retry.
    }
  }, []);

  const loadQueue = useCallback(async (refresh = false, silent = false) => {
    const sid = await ensureStore();
    if (sid == null) return;
    if (!silent) dispatch({ type: 'QUEUE_LOADING', refreshing: refresh });
    try {
      const data = await fetchRedemptionQueue(sid);
      dispatch({ type: 'QUEUE_SUCCESS', data });
    } catch (e: any) {
      if (!silent) dispatch({ type: 'QUEUE_ERROR', error: e?.message ?? 'Failed to load redemption queue' });
    }
  }, [ensureStore]);

  const loadHistory = useCallback(async (refresh = false, silent = false) => {
    const sid = await ensureStore();
    if (sid == null) return;
    if (!silent) dispatch({ type: 'HISTORY_LOADING', refreshing: refresh });
    try {
      const data = await fetchRedemptionHistory(sid);
      dispatch({ type: 'HISTORY_SUCCESS', data, degraded: false });
    } catch (historyErr: any) {
      const msg: string = historyErr?.message ?? '';

      // Hibernate LazyInitializationException — the backend's history endpoint
      // fails to eagerly load RedemptionRecord.items within a Hibernate session.
      // Fall back to the queue endpoint (PENDING items only) so the screen
      // remains usable until the backend is fixed with @Transactional / DTO projection.
      if (isLazyInitError(msg)) {
        try {
          const queueData = await fetchRedemptionQueue(sid);
          dispatch({ type: 'HISTORY_SUCCESS', data: queueData, degraded: true });
          return;
        } catch {
          // Queue fallback also failed — surface original history error
        }
      }

      if (!silent) dispatch({ type: 'HISTORY_ERROR', error: msg || 'Failed to load redemption history' });
    }
  }, [ensureStore]);

  const loadAll = useCallback(async (refresh = false, silent = false) => {
    await Promise.allSettled([loadQueue(refresh, silent), loadHistory(refresh, silent)]);
  }, [loadQueue, loadHistory]);

  // After approve/reject: always reload queue and history so stale items clear.
  // If the backend returns 400 "already COMPLETED/REJECTED", the item was already
  // processed (race condition or duplicate tap). Swallow that specific error — the
  // reload in `finally` will sync the UI to the real backend state automatically.
  const approveRedemption = useCallback(async (id: string) => {
    try {
      await apiApprove(id);
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      const alreadyDone =
        msg.includes('COMPLETED') ||
        msg.includes('REJECTED')  ||
        msg.includes('Only pending');
      if (!alreadyDone) throw e;
    } finally {
      await Promise.allSettled([loadQueue(), loadHistory()]);
    }
  }, [loadQueue, loadHistory]);

  const rejectRedemption = useCallback(async (id: string, reason?: string) => {
    try {
      await apiReject(id, reason);
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      const alreadyDone =
        msg.includes('COMPLETED') ||
        msg.includes('REJECTED')  ||
        msg.includes('Only pending');
      if (!alreadyDone) throw e;
    } finally {
      await Promise.allSettled([loadQueue(), loadHistory()]);
    }
  }, [loadQueue, loadHistory]);

  return (
    <RedemptionCtx.Provider value={{
      ...state,
      ensureStore,
      refreshStoreMeta,
      loadQueue,
      loadHistory,
      loadAll,
      approveRedemption,
      rejectRedemption,
    }}>
      {children}
    </RedemptionCtx.Provider>
  );
}

export function useRedemption(): RedemptionContextValue {
  const ctx = useContext(RedemptionCtx);
  if (!ctx) throw new Error('useRedemption must be used inside RedemptionProvider');
  return ctx;
}
