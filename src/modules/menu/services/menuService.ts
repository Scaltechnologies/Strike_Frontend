// src/modules/menu/services/menuService.ts
// Menu ITEM operations only. Category reads live in categoryService.ts —
// there is deliberately no category CRUD here; see menu.types.ts.
//
// Item photo upload is deliberately not exposed here either — vendors no
// longer pick/upload an item image from this app (see ItemFormModal in
// menu.tsx). The backend route itself may still exist; this file just has
// no seam left that calls it.

import axiosInstance from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
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
