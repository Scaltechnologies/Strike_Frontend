import axiosInstance from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import type { ApiResponse } from '../../../core/types/api.types';

export interface CategoryResponse {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  storeId: number;
}

export interface MenuItemResponse {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  itemType?: 'VEG' | 'NON_VEG';
  availabilityStatus: 'AVAILABLE' | 'OUT_OF_STOCK';
  categoryId: number;
  storeId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
}

export interface CreateMenuItemRequest {
  name: string;
  price: number;
  categoryId: number;
  description?: string;
  imageUrl?: string;
  itemType?: 'VEG' | 'NON_VEG';
  availabilityStatus?: 'AVAILABLE' | 'OUT_OF_STOCK';
}

// ── Categories ──────────────────────────────────────────────────────

export async function fetchCategories(): Promise<CategoryResponse[]> {
  const res = await axiosInstance.get<ApiResponse<CategoryResponse[]>>(endpoints.menu.categories);
  return res.data.data ?? [];
}

export async function createCategory(
  payload: CreateCategoryRequest,
): Promise<CategoryResponse> {
  const res = await axiosInstance.post<ApiResponse<CategoryResponse>>(
    endpoints.menu.categories,
    payload,
  );
  return res.data.data;
}

export async function updateCategory(
  id: number,
  payload: Partial<CreateCategoryRequest>,
): Promise<CategoryResponse> {
  const res = await axiosInstance.put<ApiResponse<CategoryResponse>>(
    endpoints.menu.category(id),
    payload,
  );
  return res.data.data;
}

export async function deleteCategory(id: number): Promise<void> {
  await axiosInstance.delete(endpoints.menu.category(id));
}

// ── Menu Items ──────────────────────────────────────────────────────

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
