// src/modules/menu/services/menuService.ts
// Menu ITEM operations only. Category reads live in categoryService.ts —
// there is deliberately no category CRUD here; see menu.types.ts.
//
// Item photo upload is deliberately not exposed here either — vendors no
// longer pick/upload an item image from this app (see ItemFormModal in
// menu.tsx). The backend route itself may still exist; this file just has
// no seam left that calls it.
//
// Approval: when Strike's admin has menu approval turned on, add / edit /
// delete don't apply straight away. The backend answers with the item as it
// WILL look and `pendingApproval: true`; the change goes live once an admin
// approves it. Turning an item in or out of stock always applies at once.

import axiosInstance from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import type { ApiResponse } from '../../../core/types/api.types';
import type { MenuItemResponse, CreateMenuItemRequest, MenuChange } from '../types/menu.types';

export type { MenuItemResponse, CreateMenuItemRequest, MenuChange };

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

/** Resolves to the pending change when removal needs approval (202), or null when it was removed (204). */
export async function deleteMenuItem(itemId: number): Promise<MenuItemResponse | null> {
  const res = await axiosInstance.delete<ApiResponse<MenuItemResponse> | ''>(endpoints.menu.item(itemId));
  return res.status === 202 && res.data ? (res.data as ApiResponse<MenuItemResponse>).data : null;
}

/** Open requests plus the ones decided in the last 30 days. Empty on a backend without approvals. */
export async function fetchMenuChanges(): Promise<MenuChange[]> {
  try {
    const res = await axiosInstance.get<ApiResponse<MenuChange[]>>(endpoints.menu.changes);
    return res.data.data ?? [];
  } catch {
    return [];
  }
}

/** Whether this user's menu changes need approval right now. */
export async function fetchApprovalRequired(): Promise<boolean> {
  try {
    const res = await axiosInstance.get<ApiResponse<{ approvalRequired: boolean }>>(endpoints.menu.changesPolicy);
    return !!res.data.data?.approvalRequired;
  } catch {
    return false;
  }
}

export async function withdrawMenuChange(requestId: number): Promise<void> {
  await axiosInstance.delete(endpoints.menu.change(requestId));
}
