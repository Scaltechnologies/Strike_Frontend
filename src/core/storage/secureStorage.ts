// src/core/storage/secureStorage.ts

import * as SecureStore from 'expo-secure-store';
import { AuthTokens } from '../../modules/auth/types/auth.types';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'auth_user',
} as const;

// ── Tokens ────────────────────────────────────────

export const saveTokens = async (tokens: AuthTokens): Promise<void> => {
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, tokens.accessToken);
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, tokens.refreshToken);
};

export const getAccessToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
};

export const getRefreshToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
};

export const clearTokens = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
};

// ── User ──────────────────────────────────────────

export const saveUser = async (user: object): Promise<void> => {
  await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
};

export const getUser = async <T>(): Promise<T | null> => {
  const raw = await SecureStore.getItemAsync(KEYS.USER);
  return raw ? (JSON.parse(raw) as T) : null;
};

export const clearUser = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(KEYS.USER);
};

// ── Clear All (Logout) ────────────────────────────

export const clearAll = async (): Promise<void> => {
  await clearTokens();
  await clearUser();
};