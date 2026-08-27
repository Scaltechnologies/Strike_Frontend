// src/modules/menu/services/categoryService.ts
// Read-only category access for the vendor frontend. Categories are
// conceptually master data owned by Strike admin — vendors browse and
// select them, they never create/edit/delete/re-image them here. See the
// "Category ownership" note in menu.types.ts for the full contract.
//
// CURRENT backend: GET /api/menu/categories still returns this vendor's
// store-scoped categories (there is no dedicated admin/global read route
// yet), so "active only" is filtered client-side using the `status` field
// the response already carries. TARGET backend: a global, admin-managed
// category list — most likely `GET /api/categories?active=true` — that
// this function is the single seam to repoint to once that ships.

import axiosInstance from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import type { ApiResponse } from '../../../core/types/api.types';
import type { CategoryResponse } from '../types/menu.types';

export async function fetchActiveCategories(): Promise<CategoryResponse[]> {
  const res = await axiosInstance.get<ApiResponse<CategoryResponse[]>>(endpoints.menu.categories);
  const categories = res.data.data ?? [];
  return categories.filter(c => c.status === 'ACTIVE');
}
