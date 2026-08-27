// src/modules/menu/services/menuService.ts
// Menu ITEM operations only. Category reads live in categoryService.ts —
// there is deliberately no category CRUD here; see menu.types.ts.

import axiosInstance, { BASE_URL } from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import { getAccessToken } from '../../../core/storage/secureStorage';
import { uploadFile } from '../../../core/api/fileUpload';
import type { ApiResponse } from '../../../core/types/api.types';
import type { MenuItemResponse, CreateMenuItemRequest } from '../types/menu.types';

export type { MenuItemResponse, CreateMenuItemRequest };

export async function fetchMenuItems(): Promise<MenuItemResponse[]> {
  const res = await axiosInstance.get<ApiResponse<MenuItemResponse[]>>(endpoints.menu.items);
  return res.data.data ?? [];
}

export async function createMenuItem(
  payload: CreateMenuItemRequest,
): Promise<MenuItemResponse> {
  const res = await axiosInstance.post<ApiResponse<MenuItemResponse>>(
    endpoints.menu.items,
    payload,
  );
  return res.data.data;
}

export async function updateMenuItem(
  itemId: number,
  payload: Partial<CreateMenuItemRequest> & { availabilityStatus?: 'AVAILABLE' | 'OUT_OF_STOCK' },
): Promise<MenuItemResponse> {
  const res = await axiosInstance.put<ApiResponse<MenuItemResponse>>(
    endpoints.menu.item(itemId),
    payload,
  );
  return res.data.data;
}

export async function deleteMenuItem(itemId: number): Promise<void> {
  await axiosInstance.delete(endpoints.menu.item(itemId));
}

// POST /api/menu/items/{id}/image — confirmed live on vendor-service (see
// endpoints.ts). Still handled leniently on failure: the item itself already
// saved successfully via createMenuItem/updateMenuItem, so a failed photo
// upload is "photo unavailable for now", not a reason to fail the whole save.
export async function uploadMenuItemImage(
  itemId: number,
  localUri: string,
): Promise<MenuItemResponse> {
  const token = await getAccessToken();
  const url = `${BASE_URL}${endpoints.menu.itemImage(itemId)}`;

  const res = await uploadFile(url, localUri, 'file', token);

  const body: ApiResponse<MenuItemResponse> | null = (() => {
    try { return JSON.parse(res.body); } catch { return null; }
  })();

  if (res.status === 413) {
    throw new Error('That photo is too large for the server to accept — please pick a different one.');
  }
  if (res.status < 200 || res.status >= 300) {
    const message = body?.message || `HTTP ${res.status}`;
    const apiError = new Error(`[${res.status}] ${endpoints.menu.itemImage(itemId)} — ${message}`) as Error & { status?: number };
    apiError.status = res.status;
    throw apiError;
  }
  if (!body) {
    throw new Error('Malformed response from server.');
  }

  const data = body.data;
  return data.imageUrl
    ? { ...data, imageUrl: `${data.imageUrl}${data.imageUrl.includes('?') ? '&' : '?'}v=${Date.now()}` }
    : data;
}
