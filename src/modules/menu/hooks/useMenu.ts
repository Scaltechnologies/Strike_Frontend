import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  fetchCategories,
  fetchMenuItems,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  CategoryResponse,
  MenuItemResponse,
  CreateCategoryRequest,
  CreateMenuItemRequest,
} from '../services/menuService';

export type { CategoryResponse, MenuItemResponse, CreateCategoryRequest, CreateMenuItemRequest };

export interface UseMenuReturn {
  categories: CategoryResponse[];
  items: MenuItemResponse[];
  loading: boolean;
  refreshing: boolean;
  refresh: (isRefresh?: boolean) => Promise<void>;
  // Category CRUD
  // Category image upload needs a categoryId, so it's always a separate call
  // (setCategoryImage) made after the category itself already exists — never
  // bundled into addCategory/editCategory.
  addCategory: (name: string) => Promise<CategoryResponse>;
  editCategory: (id: number, name: string) => Promise<CategoryResponse>;
  setCategoryImage: (id: number, imageUri: string) => Promise<CategoryResponse>;
  removeCategory: (id: number) => Promise<void>;
  // Item CRUD
  toggleAvailability: (item: MenuItemResponse) => Promise<void>;
  addItem: (payload: CreateMenuItemRequest) => Promise<void>;
  editItem: (itemId: number, payload: Partial<CreateMenuItemRequest>) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
}

export function useMenu(): UseMenuReturn {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [items, setItems]           = useState<MenuItemResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [cats, menuItems] = await Promise.all([fetchCategories(), fetchMenuItems()]);
      setCategories(cats);
      setItems(menuItems);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to load menu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch is driven by the screen (useFocusEffect) rather than mount here,
  // so revisiting the Menu tab always picks up changes made elsewhere.

  // ── Category CRUD ──────────────────────────────────────────────────

  const addCategory = useCallback(async (name: string) => {
    const created = await createCategory({ name });
    setCategories(prev => [...prev, created]);
    return created;
  }, []);

  const editCategory = useCallback(async (id: number, name: string) => {
    const updated = await updateCategory(id, { name });
    setCategories(prev => prev.map(c => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const setCategoryImage = useCallback(async (id: number, imageUri: string) => {
    const updated = await uploadCategoryImage(id, imageUri);
    setCategories(prev => prev.map(c => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const removeCategory = useCallback(async (id: number) => {
    await deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── Item CRUD ──────────────────────────────────────────────────────

  const toggleAvailability = useCallback(async (item: MenuItemResponse) => {
    const next: 'AVAILABLE' | 'OUT_OF_STOCK' =
      item.availabilityStatus === 'AVAILABLE' ? 'OUT_OF_STOCK' : 'AVAILABLE';
    setItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, availabilityStatus: next } : i)),
    );
    try {
      await updateMenuItem(item.id, { availabilityStatus: next });
    } catch (err: any) {
      setItems(prev =>
        prev.map(i =>
          i.id === item.id ? { ...i, availabilityStatus: item.availabilityStatus } : i,
        ),
      );
      Alert.alert('Error', err?.message ?? 'Failed to update availability');
    }
  }, []);

  const addItem = useCallback(async (payload: CreateMenuItemRequest) => {
    const created = await createMenuItem(payload);
    setItems(prev => [...prev, created]);
  }, []);

  const editItem = useCallback(async (
    itemId: number,
    payload: Partial<CreateMenuItemRequest>,
  ) => {
    const updated = await updateMenuItem(itemId, payload);
    setItems(prev => prev.map(i => (i.id === itemId ? updated : i)));
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
    refresh,
    addCategory,
    editCategory,
    setCategoryImage,
    removeCategory,
    toggleAvailability,
    addItem,
    editItem,
    removeItem,
  };
}
