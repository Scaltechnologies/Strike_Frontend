// src/modules/menu/types/menu.types.ts
//
// Category ownership: categories are global master data owned by Strike
// admin (managed via the separate admin panel, backed by SUPER_ADMIN-only
// endpoints this app never calls). This vendor frontend only ever READS
// them (see categoryService.ts) — there is deliberately no
// CreateCategoryRequest / UpdateCategoryRequest type here, because this app
// must never construct a category mutation payload.
//
// Categories carry no storeId — they are not scoped to this vendor's store
// or any other. A menu item still belongs to a store (see storeId on
// MenuItemResponse below) and separately references a global categoryId.

export interface CategoryResponse {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
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

export interface CreateMenuItemRequest {
  name: string;
  price: number;
  categoryId: number;
  description?: string;
  imageUrl?: string;
  itemType?: 'VEG' | 'NON_VEG';
  availabilityStatus?: 'AVAILABLE' | 'OUT_OF_STOCK';
}
