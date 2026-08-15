// src/modules/cards/types/card.types.ts
// Derived from: card-service DTOs in MASTER_BACKEND_DOCUMENTATION.md

// ── Enums ──────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'CANCELLED';

// ── Card Definition ────────────────────────────────────────────────────

// Response: GET /api/cards/my  |  GET /api/cards/{id}  |  POST /api/cards  |  PUT /api/cards/{id}
// bonusAmount = walletAmount - cardPrice (computed server-side)
// eligibleItems is populated only on create / update / single-get (not in list responses)
export interface CardDefinitionResponse {
  id: number;
  vendorId: number;
  storeId: number;
  name: string;
  description: string | null;
  cardPrice: number;
  walletAmount: number;
  bonusAmount: number;
  validityInDays: number;
  imageUrl: string | null;
  isActive: boolean;
  categoryIds: number[];
  eligibleMenuItemIds: number[];
  eligibleItems: EligibleItemInfo[];
  createdAt: string;
}

export interface EligibleItemInfo {
  id: number;
  name: string;
  price: number;
  itemType: 'VEG' | 'NON_VEG';
  categoryId: number;
}

// Request: POST /api/cards
// categoryIds: must all be ACTIVE categories belonging to the vendor's store
// eligibleMenuItemIds: optional; if provided all items must belong to valid categories
export interface CreateCardRequest {
  storeId: number;
  name: string;
  description?: string;
  cardPrice: number;
  walletAmount: number;
  validityInDays: number;
  imageUrl?: string;
  categoryIds: number[];           // min 1 required
  eligibleMenuItemIds?: number[];  // optional, min 1 if provided
}

// Request: PUT /api/cards/{id}
// All fields optional — only provided fields are updated
// Replaces category/item mappings if provided
export interface UpdateCardRequest {
  name?: string;
  description?: string;
  cardPrice?: number;
  walletAmount?: number;
  validityInDays?: number;
  imageUrl?: string;
  isActive?: boolean;
  categoryIds?: number[];
  eligibleMenuItemIds?: number[];
}

// ── Card Preview ───────────────────────────────────────────────────────

// Response: GET /api/cards/{id}/preview
export interface CardPreviewResponse {
  cardId: number;
  cardName: string;
  description: string | null;
  cardPrice: number;
  walletAmount: number;
  validityInDays: number;
  eligibleMenus: MenuCategoryPreview[];
}

export interface MenuCategoryPreview {
  categoryId: number;
  categoryName: string;
  items: MenuItemPreview[];
}

export interface MenuItemPreview {
  itemId: number;
  name: string;
  price: number;
  itemType: 'VEG' | 'NON_VEG';
  availabilityStatus: 'AVAILABLE' | 'OUT_OF_STOCK';
}

// ── Subscriptions (Vendor View) ────────────────────────────────────────

// Response: GET /api/cards/subscriptions/store/{storeId}  |  GET /api/cards/subscriptions/{id}
export interface SubscriptionResponse {
  id: number;
  userId: number;
  customerName?: string | null;
  cardDefinitionId: number;
  cardName: string;
  storeId: number;
  walletBalance: number;
  couponCode: string | null;
  originalAmount: number;
  discountApplied: number;
  finalAmount: number;
  status: SubscriptionStatus;
  purchasedAt: string;
  expiresAt: string;
  createdAt: string;
}
