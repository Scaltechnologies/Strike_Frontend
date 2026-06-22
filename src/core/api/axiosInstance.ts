// src/core/api/axiosInstance.ts

import axios from 'axios';
import { getAccessToken } from '../storage/secureStorage';

const BASE_URL = 'http://192.168.88.32:8080';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor — attach token ────────────
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();

    console.log('ACCESS TOKEN =>', token);
    console.log('REQUEST URL =>', config.url);

    if (token) {
      // Axios v1 compatible
      if (config.headers?.set) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    console.log(
      'AUTH HEADER AFTER SET =>',
      config.headers?.Authorization ||
      config.headers?.get?.('Authorization')
    );

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle errors ──────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url ?? 'unknown';
      const body = error.response.data;

      const message =
        body?.message ||
        body?.error ||
        (typeof body === 'string'
          ? body
          : JSON.stringify(body)) ||
        `HTTP ${status}`;

      return Promise.reject(
        new Error(`[${status}] ${url} — ${message}`)
      );
    }

    if (error.request) {
      return Promise.reject(
        new Error(
          `No response from server. Check BASE_URL (${BASE_URL}) and that the backend is running.`
        )
      );
    }

    return Promise.reject(
      new Error(error.message ?? 'Unknown error')
    );
  }
);

export default axiosInstance;