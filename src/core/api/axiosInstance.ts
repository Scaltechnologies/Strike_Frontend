// src/core/api/axiosInstance.ts

import axios, { InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearAll,
} from '../storage/secureStorage';
import { setMaintenance } from '../maintenance/maintenanceStore';
import { resetNotificationStore } from '../../modules/notifications/store/notificationStore';

const FALLBACK_BASE_URL = 'https://api.strikeapp.in';

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || FALLBACK_BASE_URL;

if (__DEV__ && !process.env.EXPO_PUBLIC_API_URL) {
  console.warn(
    `[axiosInstance] EXPO_PUBLIC_API_URL is not set — falling back to ${FALLBACK_BASE_URL}. ` +
      'Set it in .env or a gitignored .env.local.',
  );
}

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach Bearer token ─────────────────────────
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token) {
      // Axios v1: AxiosHeaders.set() is the correct API
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Track whether a refresh is already in flight so concurrent 401s don't
// trigger multiple refresh calls.
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function processQueue(newToken: string) {
  refreshQueue.forEach((resolve) => resolve(newToken));
  refreshQueue = [];
}

// ── Response interceptor — refresh on 401, surface errors ────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Backend-wide maintenance mode — surface it regardless of which
    // request triggered it. See MaintenanceGate for the cold-start check.
    if (error.response?.status === 503) {
      setMaintenance(true, error.response.data?.message);
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // ── 401 handling: try refresh, then retry once ──────────────────
    if (
      error.response?.status === 401 &&
      !originalRequest._retried &&
      !originalRequest.url?.includes('/api/auth/')
    ) {
      if (isRefreshing) {
        // Queue this request until the in-flight refresh resolves
        return new Promise((resolve, _reject) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.set('Authorization', `Bearer ${token}`);
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      originalRequest._retried = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('no refresh token');

        const res = await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        // Backend may return { token, refreshToken } or { accessToken, refreshToken }
        const data = res.data?.data ?? res.data;
        const newAccess: string = data.token ?? data.accessToken;
        const newRefresh: string = data.refreshToken;

        await saveTokens({ accessToken: newAccess, refreshToken: newRefresh });

        processQueue(newAccess);
        originalRequest.headers.set('Authorization', `Bearer ${newAccess}`);
        return axiosInstance(originalRequest);
      } catch {
        // Refresh failed — clear session and send user to login
        refreshQueue = [];
        resetNotificationStore();
        await clearAll();
        router.replace('/(auth)/login');
        return Promise.reject(new Error('Session expired. Please log in again.'));
      } finally {
        isRefreshing = false;
      }
    }

    // ── Shape all other errors as plain Error for consistent catch handling
    if (error.response) {
      const status = error.response.status;
      const url    = error.config?.url ?? 'unknown';
      const body   = error.response.data;
      const message =
        body?.message ||
        body?.error ||
        (typeof body === 'string' ? body : JSON.stringify(body)) ||
        `HTTP ${status}`;
      const apiError = new Error(`[${status}] ${url} — ${message}`) as Error & { status?: number; code?: string };
      apiError.status = status;
      // Stable machine-readable error code (e.g. card-service's PaymentErrorCode enum name —
      // INVALID_QR, TOO_MANY_ATTEMPTS, etc.) — callers that need to branch per-error-type should
      // check this instead of parsing `message` text.
      if (typeof body?.code === 'string') apiError.code = body.code;
      return Promise.reject(apiError);
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Check your connection and try again.'));
    }

    if (error.request) {
      // A GET never mutates anything, so it's always safe to retry a bare
      // connection failure (mobile networks routinely drop a request for a
      // moment during a WiFi/cellular handoff) — this is what "no response
      // from server" actually meant most of the time in practice, not a
      // dead backend. POST/PUT/PATCH/DELETE are NOT retried here since
      // silently re-sending a mutation could duplicate it.
      const method = (originalRequest?.method ?? '').toLowerCase();
      const retries = originalRequest?._networkRetries ?? 0;
      if (method === 'get' && retries < 2) {
        originalRequest._networkRetries = retries + 1;
        await new Promise(resolve => setTimeout(resolve, 400 * (retries + 1)));
        return axiosInstance(originalRequest);
      }

      return Promise.reject(
        new Error(
          `No response from server. Check BASE_URL (${BASE_URL}) and that the backend is running.`,
        ),
      );
    }

    return Promise.reject(new Error(error.message ?? 'Unknown error'));
  },
);

export default axiosInstance;
