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

interface RedemptionQueueResponse {
  id: number;
  subscriptionId: number;
  userId: number;
  customerName: string;
  storeId: number;
  totalAmount: number;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'FAILED' | 'REVERSED';
  initiatedBy: string;
  items: RedemptionItemBackend[];
  createdAt: string;
}

// ─── Frontend UI types (shape matched by home.tsx) ──────────────────

export interface RedemptionItem {
  id: string;
  name: string;
  qty: number;
  addOn?: string;
  addOnPrice?: number;
  category?: string;
}

export interface RedemptionRequest {
  id: string;
  cardId: string;
  customer: string;
  customerHandle: string;
  phone: string;
  cardType: string;
  timeAgo: string;
  orderedAt: string;
  items: RedemptionItem[];
  totalUnits: number;
  totalValue: number;
  addOnTotal: number;
  status: 'pending' | 'accepted';
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatTimeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
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

function mapToRedemptionRequest(r: RedemptionQueueResponse): RedemptionRequest {
  const totalUnits = r.items.reduce((sum, item) => sum + item.quantity, 0);
  const handle = '@' + r.customerName.toLowerCase().replace(/\s+/g, '_');

  return {
    id: String(r.id),
    cardId: '#' + r.subscriptionId,
    customer: r.customerName,
    customerHandle: handle,
    phone: '',
    cardType: 'Card',
    timeAgo: formatTimeAgo(r.createdAt),
    orderedAt: formatDate(r.createdAt),
    items: r.items.map(item => ({
      id: String(item.menuItemId),
      name: item.menuItemName,
      qty: item.quantity,
      category: 'Items',
    })),
    totalUnits,
    totalValue: Number(r.totalAmount),
    addOnTotal: 0,
    status: r.status === 'PENDING' ? 'pending' : 'accepted',
  };
}

// ─── Service functions ───────────────────────────────────────────────

export async function fetchRedemptionQueue(storeId: number): Promise<RedemptionRequest[]> {
  const res = await axiosInstance.get<ApiResponse<RedemptionQueueResponse[]>>(
    endpoints.redemption.queue(storeId),
  );
  return (res.data.data ?? []).map(mapToRedemptionRequest);
}

export async function confirmRedemption(id: string): Promise<void> {
  await axiosInstance.post(endpoints.redemption.approve(id));
}

export async function rejectRedemption(id: string, reason?: string): Promise<void> {
  await axiosInstance.post(endpoints.redemption.reject(id), reason ? { reason } : undefined);
}

export async function fetchRedemptionHistory(storeId: number): Promise<RedemptionRequest[]> {
  const res = await axiosInstance.get<ApiResponse<RedemptionQueueResponse[]>>(
    endpoints.redemption.history(storeId),
  );
  return (res.data.data ?? []).map(mapToRedemptionRequest);
}
