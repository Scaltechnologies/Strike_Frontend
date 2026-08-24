// src/modules/cards/services/cardService.ts

import axiosInstance from '../../../core/api/axiosInstance';
import { ApiResponse, PageResponse } from '../../../core/types/api.types';
import endpoints from '../../../core/api/endpoints';
import {
  CardDefinitionResponse,
  CreateCardRequest,
  UpdateCardRequest,
  CardPreviewResponse,
  SubscriptionResponse,
} from '../types/card.types';

// ── Card CRUD ──────────────────────────────────────────────────────────

// GET /api/cards/my
// Returns all card definitions owned by the authenticated vendor.
export async function getMyCards(): Promise<CardDefinitionResponse[]> {
  const res = await axiosInstance.get<ApiResponse<CardDefinitionResponse[]>>(endpoints.card.my);
  return res.data.data ?? [];
}

// GET /api/cards/{id}
// Returns a single card definition. Works for both public and vendor contexts;
// vendor token is always sent by axiosInstance so this returns the vendor view.
export async function getCard(id: number): Promise<CardDefinitionResponse> {
  const res = await axiosInstance.get<ApiResponse<CardDefinitionResponse>>(
    endpoints.card.detail(id),
  );
  return res.data.data;
}

// GET /api/cards/{id}/preview
// Returns the card with fully expanded eligible menus (category + item details).
export async function getCardPreview(id: number): Promise<CardPreviewResponse> {
  const res = await axiosInstance.get<ApiResponse<CardPreviewResponse>>(
    endpoints.card.preview(id),
  );
  return res.data.data;
}

// POST /api/cards
// Creates a new card. Backend validates:
//   • storeId belongs to the authenticated vendor
//   • all categoryIds are ACTIVE and belong to the store
//   • eligibleMenuItemIds (if provided) belong to valid categories in the store
export async function createCard(payload: CreateCardRequest): Promise<CardDefinitionResponse> {
  const res = await axiosInstance.post<ApiResponse<CardDefinitionResponse>>(
    endpoints.card.create,
    payload,
  );
  return res.data.data;
}

// PUT /api/cards/{id}
// Full/partial update of an existing card. Backend re-validates category/item mappings
// if provided. Ownership check: card.vendorId must match authenticated vendor.
export async function updateCard(
  id: number,
  payload: UpdateCardRequest,
): Promise<CardDefinitionResponse> {
  const res = await axiosInstance.put<ApiResponse<CardDefinitionResponse>>(
    endpoints.card.detail(id),
    payload,
  );
  return res.data.data;
}

// DELETE /api/cards/{id}
// Sets isActive = false. Does NOT delete the record. Existing subscriptions remain valid.
export async function deactivateCard(id: number): Promise<void> {
  await axiosInstance.delete(endpoints.card.detail(id));
}

// ── Subscriptions (Vendor View) ────────────────────────────────────────

// GET /api/cards/subscriptions/store/{storeId}?page=&size=
// Returns all subscriptions for the vendor's store, paginated.
export async function getStoreSubscriptions(
  storeId: number,
  page = 0,
  size = 20,
): Promise<PageResponse<SubscriptionResponse>> {
  const res = await axiosInstance.get<ApiResponse<PageResponse<SubscriptionResponse>>>(
    endpoints.card.storeSubscriptions(storeId),
    { params: { page, size } },
  );
  return res.data.data;
}

// GET /api/cards/subscriptions/{subscriptionId}
// Returns a specific subscription. Accessible by VENDOR and ADMIN.
export async function getSubscription(subscriptionId: number): Promise<SubscriptionResponse> {
  const res = await axiosInstance.get<ApiResponse<SubscriptionResponse>>(
    endpoints.card.subscription(subscriptionId),
  );
  return res.data.data;
}

// Wallet-grid box count for a subscription: one box per day of the card's
// validity, derived from the subscription's own purchasedAt/expiresAt —
// never from the live CardDefinition.validityInDays, which the vendor may
// have since changed for new purchases. Falls back to 1 defensively so a
// bad/missing timestamp never divides a wallet amount by zero.
export function getSubscriptionValidityDays(sub: Pick<SubscriptionResponse, 'purchasedAt' | 'expiresAt'>): number {
  const start = new Date(sub.purchasedAt).getTime();
  const end = new Date(sub.expiresAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.max(1, Math.round((end - start) / 86400000));
}
