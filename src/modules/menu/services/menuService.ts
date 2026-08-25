import axiosInstance, { BASE_URL } from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import { getAccessToken } from '../../../core/storage/secureStorage';
import { uploadFile } from '../../../core/api/fileUpload';
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

// POST /api/menu/categories/{id}/image — multipart upload, field name "file".
// Uses expo-file-system's native uploadAsync — see fileUpload.ts for why
// fetch()+FormData()+Blob doesn't work in this app's RN environment.
export async function uploadCategoryImage(
  categoryId: number,
  localUri: string,
): Promise<CategoryResponse> {
  const token = await getAccessToken();
  const url = `${BASE_URL}${endpoints.menu.categoryImage(categoryId)}`;

  const res = await uploadFile(url, localUri, 'file', token);

  const body: ApiResponse<CategoryResponse> | null = (() => {
    try { return JSON.parse(res.body); } catch { return null; }
  })();

  if (res.status === 413) {
    throw new Error('That photo is too large for the server to accept — please pick a different one.');
  }
  if (res.status < 200 || res.status >= 300) {
    const message = body?.message || `HTTP ${res.status}`;
    const apiError = new Error(`[${res.status}] ${endpoints.menu.categoryImage(categoryId)} — ${message}`) as Error & { status?: number };
    apiError.status = res.status;
    throw apiError;
  }
  if (!body) {
    throw new Error('Malformed response from server.');
  }

  // The backend returns the same image path for every upload to this
  // category (keyed only by categoryId, not by file version), so re-uploading
  // a photo returns an unchanged imageUrl. RN's <Image> caches by URI, so
  // without a cache-busting suffix the old photo keeps showing after a
  // successful re-upload until the app restarts. Stamp a query param here,
  // at the moment we know the upload just succeeded, so the URI is
  // guaranteed fresh for the caller to render immediately.
  const data = body.data;
  return data.imageUrl
    ? { ...data, imageUrl: `${data.imageUrl}${data.imageUrl.includes('?') ? '&' : '?'}v=${Date.now()}` }
    : data;
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
