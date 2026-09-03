import { useState, useCallback } from 'react';
import { fetchActiveCategories } from '../services/categoryService';
import {
  fetchMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../services/menuService';
import { getUserMessage } from '../../../core/api/errorMessage';
import type {
  CategoryResponse,
  MenuItemResponse,
  CreateMenuItemRequest,
} from '../types/menu.types';

export type { CategoryResponse, MenuItemResponse, CreateMenuItemRequest };

export interface UseMenuReturn {
  categories: CategoryResponse[];
  items: MenuItemResponse[];
  loading: boolean;
  refreshing: boolean;
  // Set only when the most recent load attempt failed outright (not when a
  // background refresh fails but we still have a previously-loaded list —
  // stale-but-present data is kept and shown rather than wiped).
  loadError: string | null;
  refresh: (isRefresh?: boolean) => Promise<void>;
  // Item CRUD — category mutations do not exist here by design: categories
  // are read-only master data for the vendor app (see categoryService.ts).
  toggleAvailability: (item: MenuItemResponse) => Promise<void>;
  addItem: (payload: CreateMenuItemRequest) => Promise<MenuItemResponse>;
  editItem: (itemId: number, payload: Partial<CreateMenuItemRequest>) => Promise<MenuItemResponse>;
  removeItem: (itemId: number) => Promise<void>;
}

export function useMenu(): UseMenuReturn {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [items, setItems]           = useState<MenuItemResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError]   = useState<string | null>(null);

  const refresh = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [cats, menuItems] = await Promise.all([fetchActiveCategories(), fetchMenuItems()]);
      setCategories(cats);
      setItems(menuItems);
      setLoadError(null);
    } catch (err) {
      setLoadError(getUserMessage(err, "Couldn't load your menu."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
    setItems(prev => [...prev, created]);
    return created;
  }, []);

  const editItem = useCallback(async (
    itemId: number,
    payload: Partial<CreateMenuItemRequest>,
  ) => {
    const updated = await updateMenuItem(itemId, payload);
    setItems(prev => prev.map(i => (i.id === itemId ? updated : i)));
    return updated;
  }, []);

  const removeItem = useCallback(async (itemId: number) => {
    await deleteMenuItem(itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  return {
    categories,
    items,
    loading,
    refreshing,
    loadError,
    refresh,
    toggleAvailability,
    addItem,
    editItem,
    removeItem,
  };
}
