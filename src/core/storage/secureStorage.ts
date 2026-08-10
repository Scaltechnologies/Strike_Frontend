// src/core/storage/secureStorage.ts

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthTokens } from '../../modules/auth/types/auth.types';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'auth_user',
} as const;

// expo-secure-store has no web implementation — calling it there throws
// "getValueWithKeyAsync is not a function". Fall back to localStorage on web
// only; native (iOS/Android) still goes through the OS keychain/keystore.
const isWeb = Platform.OS === 'web';

const setItem = (key: string, value: string): Promise<void> =>
  isWeb ? Promise.resolve(window.localStorage.setItem(key, value)) : SecureStore.setItemAsync(key, value);

const getItem = (key: string): Promise<string | null> =>
  isWeb ? Promise.resolve(window.localStorage.getItem(key)) : SecureStore.getItemAsync(key);

const deleteItem = (key: string): Promise<void> =>
  isWeb ? Promise.resolve(window.localStorage.removeItem(key)) : SecureStore.deleteItemAsync(key);

// ── Tokens ────────────────────────────────────────

export const saveTokens = async (tokens: AuthTokens): Promise<void> => {
  await setItem(KEYS.ACCESS_TOKEN, tokens.accessToken);
  await setItem(KEYS.REFRESH_TOKEN, tokens.refreshToken);
};

export const getAccessToken = async (): Promise<string | null> => {
  return await getItem(KEYS.ACCESS_TOKEN);
};

export const getRefreshToken = async (): Promise<string | null> => {
  return await getItem(KEYS.REFRESH_TOKEN);
};

export const clearTokens = async (): Promise<void> => {
  await deleteItem(KEYS.ACCESS_TOKEN);
  await deleteItem(KEYS.REFRESH_TOKEN);
};

// ── User ──────────────────────────────────────────

export const saveUser = async (user: object): Promise<void> => {
  await setItem(KEYS.USER, JSON.stringify(user));
};

export const getUser = async <T>(): Promise<T | null> => {
  const raw = await getItem(KEYS.USER);
  return raw ? (JSON.parse(raw) as T) : null;
};

export const clearUser = async (): Promise<void> => {
  await deleteItem(KEYS.USER);
};

// ── Clear All (Logout) ────────────────────────────

export const clearAll = async (): Promise<void> => {
  await clearTokens();
  await clearUser();
};