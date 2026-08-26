// Mirrors card-service's VendorPayAtStoreResponse exactly (VendorPayAtStoreController.java).
// Deliberately excludes commission/rate — the backend keeps that admin-only.

export type PayAtStoreStatus =
  | 'PENDING'
  | 'AWAITING_VENDOR_CONFIRMATION'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export type VerificationMethod = 'QR' | 'CODE';

export interface PayAtStorePayment {
  paymentId: number;
  userId: number;
  storeId: number;
  cardName: string;
  amount: number;
  walletAmount: number;
  status: PayAtStoreStatus;
  createdAt: string;
  expiresAt: string;
  confirmedAt: string | null;
  confirmedByVendorId: number | null;
  confirmationMethod: VerificationMethod | null;
  subscriptionId: number | null;
}

// PaymentErrorCode enum names (card-service) relevant to the vendor verify/confirm flow —
// matched against err.code (see axiosInstance.ts's response interceptor).
export type PayAtStoreErrorCode =
  | 'INVALID_QR'
  | 'INVALID_PAYMENT_CODE'
  | 'TOO_MANY_ATTEMPTS'
  | 'WRONG_VENDOR'
  | 'PAYMENT_NOT_CONFIRMABLE'
  | 'PAYMENT_ALREADY_SUCCESSFUL'
  | 'PAYMENT_NOT_FOUND'
  | 'PAYMENT_EXPIRED'
  | 'PAY_AT_STORE_NOT_SUPPORTED';
