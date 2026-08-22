// src/modules/ledger/types/ledger.types.ts
// Derived from: ledger-service DTOs in MASTER_BACKEND_DOCUMENTATION.md

// ── Transaction ────────────────────────────────────────────────────────

// CARD_PURCHASE  — subscription purchased by user
// REDEMPTION     — wallet balance spent at store
// REFUND         — amount refunded (defined in backend, not yet triggered)
// TOP_UP         — wallet topped up (defined in backend, not yet triggered)
export type TransactionType = 'CARD_PURCHASE' | 'REDEMPTION' | 'REFUND' | 'TOP_UP';

// status is null for rows created before the field existed — treat null the same as 'ACTIVE'.
// 'REVERSED' means a cancelled/duplicate purchase; excluded from revenue totals server-side,
// so it must never render as a normal credit here either.
export type TransactionStatus = 'ACTIVE' | 'REVERSED' | null;

// Response: GET /api/ledger/store/{storeId}  (content items inside PageResponse)
export interface TransactionResponse {
  id: number;
  storeId: number;
  customerId: number;
  subscriptionId: number;
  transactionType: TransactionType;
  amount: number;       // BigDecimal — serialised as number in JSON
  remarks: string | null;
  status: TransactionStatus;
  createdAt: string;    // ISO-8601 LocalDateTime
}

// NOTE: TransactionResponse does not include a customer name. The ledger-service
// stores only customerId (Long). Displaying customer names would require a separate
// call to user-service or admin-service and is out of scope for the vendor ledger view.
