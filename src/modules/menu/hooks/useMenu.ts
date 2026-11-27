import { useState, useCallback } from 'react';
import { fetchActiveCategories } from '../services/categoryService';
import {
  fetchMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  fetchMenuChanges,
  fetchApprovalRequired,
  withdrawMenuChange,
} from '../services/menuService';
import { getUserMessage } from '../../../core/api/errorMessage';
import type {
  CategoryResponse,
  MenuItemResponse,
  CreateMenuItemRequest,
  MenuChange,
} from '../types/menu.types';

export type { CategoryResponse, MenuItemResponse, CreateMenuItemRequest, MenuChange };

export interface UseMenuReturn {
  categories: CategoryResponse[];
  items: MenuItemResponse[];
  /** This store's menu change requests: open ones plus those decided in the last 30 days. */
  changes: MenuChange[];
  /** True when menu changes currently need Strike's approval before going live. */
  approvalRequired: boolean;
  loading: boolean;
  refreshing: boolean;
  // Set only when the most recent load attempt failed outright (not when a
  // background refresh fails but we still have a previously-loaded list —
  // stale-but-present data is kept and shown rather than wiped).
  loadError: string | null;
  refresh: (isRefresh?: boolean) => Promise<void>;
  // Item CRUD — category mutations do not exist here by design: categories
  // are read-only master data for the vendor app (see categoryService.ts).
  // add / edit / remove resolve with `pendingApproval: true` when the change
  // was sent to Strike for approval rather than applied.
  toggleAvailability: (item: MenuItemResponse) => Promise<void>;
  addItem: (payload: CreateMenuItemRequest) => Promise<MenuItemResponse>;
  editItem: (itemId: number, payload: Partial<CreateMenuItemRequest>) => Promise<MenuItemResponse>;
  removeItem: (itemId: number) => Promise<{ pendingApproval: boolean }>;
  withdrawChange: (requestId: number) => Promise<void>;
}

export function useMenu(): UseMenuReturn {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [items, setItems]           = useState<MenuItemResponse[]>([]);
  const [changes, setChanges]       = useState<MenuChange[]>([]);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError]   = useState<string | null>(null);

  const loadChanges = useCallback(async () => {
    // Never fails the screen: a backend without approvals just returns nothing here.
    const [list, required] = await Promise.all([fetchMenuChanges(), fetchApprovalRequired()]);
    setChanges(list);
    setApprovalRequired(required);
  }, []);

  const refresh = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [cats, menuItems] = await Promise.all([fetchActiveCategories(), fetchMenuItems(), loadChanges()]);
      setCategories(cats);
      setItems(menuItems);
      setLoadError(null);
    } catch (err) {
      setLoadError(getUserMessage(err, "Couldn't load your menu."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadChanges]);

  // Fetch is driven by the screen (useFocusEffect) rather than mount here,
  // so revisiting the Menu tab always picks up changes made elsewhere.

  // ── Item CRUD ──────────────────────────────────────────────────────

  const toggleAvailability = useCallback(async (item: MenuItemResponse) => {
    const next: 'AVAILABLE' | 'OUT_OF_STOCK' =
      item.availabilityStatus === 'AVAILABLE' ? 'OUT_OF_STOCK' : 'AVAILABLE';
    setItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, availabilityStatus: next } : i)),
    );
    try {
      await updateMenuItem(item.id, { availabilityStatus: next });
    } catch (err) {
      setItems(prev =>
        prev.map(i =>
          i.id === item.id ? { ...i, availabilityStatus: item.availabilityStatus } : i,
        ),
      );
      throw err;
    }
  }, []);

  const addItem = useCallback(async (payload: CreateMenuItemRequest) => {
    const created = await createMenuItem(payload);
    if (created?.pendingApproval) {
      // Not on the menu yet — it shows under "Waiting for approval" until Strike approves it.
      void loadChanges();
    } else {
      setItems(prev => [...prev, created]);
    }
    return created;
  }, [loadChanges]);

  const editItem = useCallback(async (
    itemId: number,
    payload: Partial<CreateMenuItemRequest>,
  ) => {
    const updated = await updateMenuItem(itemId, payload);
    if (updated?.pendingApproval) {
      // The live item keeps its current details; only stock may have changed at once.
      setItems(prev => prev.map(i => (i.id === itemId
        ? { ...i, availabilityStatus: updated.availabilityStatus ?? i.availabilityStatus, pendingChange: updated.pendingChange }
        : i)));
      void loadChanges();
    } else {
      setItems(prev => prev.map(i => (i.id === itemId ? { ...updated, pendingChange: i.pendingChange } : i)));
    }
    return updated;
  }, [loadChanges]);

  const removeItem = useCallback(async (itemId: number) => {
    const pending = await deleteMenuItem(itemId);
    if (pending?.pendingApproval) {
      setItems(prev => prev.map(i => (i.id === itemId ? { ...i, pendingChange: pending.pendingChange } : i)));
      void loadChanges();
      return { pendingApproval: true };
    }
    setItems(prev => prev.filter(i => i.id !== itemId));
    return { pendingApproval: false };
  }, [loadChanges]);

  const withdrawChange = useCallback(async (requestId: number) => {
    await withdrawMenuChange(requestId);
    setItems(prev => prev.map(i => (i.pendingChange?.id === requestId ? { ...i, pendingChange: undefined } : i)));
    setChanges(prev => prev.map(c => (c.id === requestId ? { ...c, status: 'WITHDRAWN' } : c)));
  }, []);

  return {
    categories,
    items,
    changes,
    approvalRequired,
    loading,
    refreshing,
    loadError,
    refresh,
    toggleAvailability,
    addItem,
    editItem,
    removeItem,
    withdrawChange,
  };
}
