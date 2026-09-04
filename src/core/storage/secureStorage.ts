// src/core/storage/secureStorage.ts

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthTokens } from '../../modules/auth/types/auth.types';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'auth_user',
  PENDING_BANNER: 'pending_store_banner',
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

// ── Pending Store Banner ────────────────────────────
//
// A banner picked at signup can't be uploaded there and then: the vendor has
// no JWT and no Store row in vendor-service until an admin approves them
// (VendorAuthService.approveVendor -> syncVendorProfile), which happens in a
// later, unrelated app session — possibly days later. So the picked local
// file URI is persisted here at registration time, keyed to the mobile
// number, and consumed (uploaded, then cleared) the next time this vendor
// successfully authenticates with status ACTIVE, whichever session that is.
// Deliberately NOT cleared by clearAll()/logout — the vendor may log out and
// back in before being approved, and the pending banner should survive that.

interface PendingBanner {
  mobileNumber: string;
  uri: string;
}

export const savePendingBanner = async (mobileNumber: string, uri: string): Promise<void> => {
  await setItem(KEYS.PENDING_BANNER, JSON.stringify({ mobileNumber, uri }));
};

export const getPendingBanner = async (): Promise<PendingBanner | null> => {
  const raw = await getItem(KEYS.PENDING_BANNER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingBanner;
  } catch {
    return null;
  }
};

export const clearPendingBanner = async (): Promise<void> => {
  await deleteItem(KEYS.PENDING_BANNER);
};

// ── Clear All (Logout) ────────────────────────────

export const clearAll = async (): Promise<void> => {
  await clearTokens();
  await clearUser();
};