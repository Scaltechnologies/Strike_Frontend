// src/core/api/axiosInstance.ts

import axios from 'axios';
import { getAccessToken } from '../storage/secureStorage';

const BASE_URL = 'http://localhost:8080'; // Replace with real URL later

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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle errors ──────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;