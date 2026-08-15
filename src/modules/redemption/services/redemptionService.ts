import axiosInstance from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';

// ─── Backend DTO types ──────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: string;
}

interface RedemptionItemBackend {
  menuItemId: number;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface RedemptionBackend {
  id: number;
  subscriptionId: number;
  cardName: string | null;
  userId: number;
  customerName: string;
  storeId: number;
  totalAmount: number;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'REVERSED';
  initiatedBy: string;
  items: RedemptionItemBackend[];
  createdAt: string;
  updatedAt?: string;
  processedAt?: string;
}

// ─── Frontend UI types ──────────────────────────────────────────────

export interface RedemptionItem {
  id: string;
  name: string;
  qty: number;
  unitPrice?: number;
  addOn?: string;
  addOnPrice?: number;
  category?: string;
}

// Statuses are exact backend values (lowercased). No invented statuses.
export type RedemptionStatus =
  | 'pending'
  | 'completed'
  | 'rejected'
  | 'failed'
  | 'reversed';

export interface RedemptionRequest {
  id: string;
  cardName: string;
  subscriptionId: number;
  customer: string;
  phone: string;
  cardType: string;
  timeAgo: string;
  orderedAt: string;
  processedAt?: string;
  // ISO-8601 strings kept for date comparisons (e.g. "confirmed today" filter)
  createdAtRaw: string;
  processedAtRaw?: string;
  items: RedemptionItem[];
  totalUnits: number;
  totalValue: number;
  addOnTotal: number;
  status: RedemptionStatus;
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatTimeAgo(iso: string): string {
  // Backend sends Java LocalDateTime without a timezone suffix.
  // Do NOT append 'Z' — JavaScript parses a timezone-naive ISO string as local
  // device time (IST on an Indian device), which matches the backend's clock.
  // Appending 'Z' would misinterpret IST as UTC, placing the timestamp 5:30h ahead.
  const date = new Date(iso);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 0) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function mapStatus(s: string): RedemptionStatus {
  switch (s) {
    case 'PENDING':   return 'pending';
    case 'COMPLETED': return 'completed';
    case 'REJECTED':  return 'rejected';
    case 'FAILED':    return 'failed';
    case 'REVERSED':  return 'reversed';
    default:          return 'pending';
  }
}

function mapToRedemptionRequest(r: RedemptionBackend): RedemptionRequest {
  const safeItems = r.items ?? [];
  const totalUnits = safeItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0);

  return {
    id:              String(r.id),
    cardName:        r.cardName ?? 'Card',
    subscriptionId:  r.subscriptionId,
    customer:        r.customerName ?? '',
    phone:           '',
    cardType:        'Card',
    timeAgo:         formatTimeAgo(r.createdAt),
    orderedAt:       formatDate(r.createdAt),
    processedAt:     r.processedAt ? formatDate(r.processedAt) : undefined,
    createdAtRaw:    r.createdAt,
    processedAtRaw:  r.processedAt,
    items:           safeItems.map(item => ({
      id:        String(item.menuItemId),
      name:      item.menuItemName ?? '',
      qty:       item.quantity ?? 0,
      unitPrice: item.unitPrice,
      category:  'Items',
    })),
    totalUnits,
    totalValue:  Number(r.totalAmount ?? 0),
    addOnTotal:  0,
    status:      mapStatus(r.status),
  };
}

// ─── Service functions ───────────────────────────────────────────────

export async function fetchRedemptionQueue(storeId: number): Promise<RedemptionRequest[]> {
  const res = await axiosInstance.get<ApiResponse<RedemptionBackend[]>>(
    endpoints.redemption.queue(storeId),
  );
  return (res.data.data ?? []).map(mapToRedemptionRequest);
}

export async function fetchRedemptionHistory(storeId: number): Promise<RedemptionRequest[]> {
  const res = await axiosInstance.get<ApiResponse<{ content: RedemptionBackend[] }>>(
    endpoints.redemption.history(storeId),
  );
  const content = res.data.data?.content ?? [];
  return content.map(mapToRedemptionRequest);
}

export async function fetchRedemptionById(id: string): Promise<RedemptionRequest> {
  const res = await axiosInstance.get<ApiResponse<RedemptionBackend>>(
    endpoints.redemption.detail(id),
  );
  return mapToRedemptionRequest(res.data.data);
}

export async function confirmRedemption(id: string): Promise<void> {
  await axiosInstance.post(endpoints.redemption.approve(id));
}

export async function rejectRedemption(id: string, reason?: string): Promise<void> {
  await axiosInstance.post(endpoints.redemption.reject(id), reason ? { reason } : undefined);
}
