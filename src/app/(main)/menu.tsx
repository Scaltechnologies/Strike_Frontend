import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  StatusBar, Switch, Image, Alert, Modal, ScrollView, Animated,
  Platform, Keyboard, KeyboardAvoidingView, Share, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useMenu,
  CategoryResponse,
  MenuItemResponse,
  CreateMenuItemRequest,
} from '../../modules/menu/hooks/useMenu';

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  primaryDark: '#991A00',
  primarySoft: '#FFF0EE',
  accent:      '#C17B2F',
  accentSoft:  '#FEF6EC',
  success:     '#16A34A',
  successSoft: '#F0FDF4',
  warning:     '#D97706',
  warningSoft: '#FFFBEB',
  error:       '#DC2626',
  errorSoft:   '#FFF1F1',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

const HEADER_BG = '#FFF3EE';
type AvailFilter = 'all' | 'AVAILABLE' | 'OUT_OF_STOCK';

// ── Toast ─────────────────────────────────────────────────────────────

function useToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg]   = useState('');
  const [kind, setKind] = useState<'ok' | 'err'>('ok');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: 'ok' | 'err' = 'ok') => {
    setMsg(message);
    setKind(type);
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    }, 2400);
  }, [opacity]);

  const ToastView = useCallback(() => (
    <Animated.View style={[styles.toast, { opacity }]}>
      <View style={[styles.toastDot, { backgroundColor: kind === 'ok' ? DS.success : DS.error }]} />
      <Text style={styles.toastText}>{msg}</Text>
    </Animated.View>
  ), [opacity, msg, kind]);

  return { show, ToastView };
}

// ── Skeleton ──────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonThumb} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '45%', marginTop: 7 }]} />
      </View>
    </View>
  );
}

// ── Category Form Modal ───────────────────────────────────────────────

interface CatFormProps {
  visible: boolean;
  initial?: CategoryResponse | null;
  onSave: (name: string) => void;
  onClose: () => void;
  saving: boolean;
}

function CategoryFormModal({ visible, initial, onSave, onClose, saving }: CatFormProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) setName(initial?.name ?? '');
  }, [visible, initial]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/*
       * Layout: full-screen overlay → KAV (flex:1, justifyContent:'flex-end',
       * behavior='padding') → sheet as a normal flex child.
       *
       * When the keyboard opens, KAV adds paddingBottom = keyboardHeight.
       * Because the sheet is a flex-end child of KAV, its bottom edge stays
       * pinned exactly at the keyboard's top edge — on both iOS and Android.
       *
       * Tappable veil sits behind the KAV via absoluteFill so it dismisses
       * the modal when the user taps outside the sheet.
       */}
      <TouchableOpacity
        style={[StyleSheet.absoluteFill, styles.veil]}
        activeOpacity={1}
        onPress={onClose}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavContainer}
      >
        <View style={styles.catFormSheet}>
          <Text style={styles.catFormTitle}>
            {initial ? 'Rename Category' : 'New Category'}
          </Text>
          <TextInput
            style={styles.catFormInput}
            value={name}
            onChangeText={setName}
            placeholder="Category name"
            placeholderTextColor={DS.text3}
            autoFocus
            maxLength={60}
          />
          <View style={styles.catFormActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (!name.trim() || saving) && { opacity: 0.45 }]}
              onPress={() => name.trim() && onSave(name.trim())}
              disabled={!name.trim() || saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Item Form Modal ───────────────────────────────────────────────────

interface ItemFormProps {
  visible: boolean;
  initial?: MenuItemResponse | null;
  categories: CategoryResponse[];
  onSave: (data: CreateMenuItemRequest) => void;
  onClose: () => void;
}

function ItemFormModal({ visible, initial, categories, onSave, onClose }: ItemFormProps) {
  const [name, setName]           = useState('');
  const [price, setPrice]         = useState('');
  const [desc, setDesc]           = useState('');
  const [image, setImage]         = useState('');
  const [categoryId, setCatId]    = useState<number | null>(null);
  const [itemType, setItemType]   = useState<'VEG' | 'NON_VEG' | undefined>(undefined);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setPrice(initial?.price != null ? String(initial.price) : '');
      setDesc(initial?.description ?? '');
      setImage(initial?.imageUrl ?? '');
      setCatId(initial?.categoryId ?? (categories[0]?.id ?? null));
      setItemType(initial?.itemType);
      setAvailable((initial?.availabilityStatus ?? 'AVAILABLE') === 'AVAILABLE');
    }
  }, [visible, initial, categories]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Required', 'Item name is required.'); return; }
    if (!categoryId)  { Alert.alert('Required', 'Please select a category.'); return; }
    const parsedPrice = parseFloat(price);
    if (!parsedPrice || parsedPrice <= 0) {
      Alert.alert('Required', 'Enter a valid price.');
      return;
    }
    onSave({
      name:               name.trim(),
      price:              parsedPrice,
      categoryId,
      description:        desc.trim() || undefined,
      imageUrl:           image.trim() || undefined,
      itemType,
      availabilityStatus: available ? 'AVAILABLE' : 'OUT_OF_STOCK',
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/*
       * Non-interactive veil — user must tap Cancel to close (no accidental
       * dismiss while filling the form).
       */}
      <View style={[StyleSheet.absoluteFill, styles.veil]} pointerEvents="none" />

      {/*
       * KAV (flex:1, justifyContent:'flex-end', behavior='padding'):
       * - fills the screen so flex math works correctly
       * - sheet is a normal flow child aligned to flex-end
       * - when keyboard appears, KAV adds paddingBottom = keyboardHeight,
       *   pushing the sheet bottom to sit exactly above the keyboard
       * - works reliably on both iOS and Android inside a Modal
       */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavContainer}
      >
        <View style={styles.formSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{initial ? 'Edit Item' : 'New Item'}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={DS.text2} />
            </TouchableOpacity>
          </View>

          {/*
           * ScrollView must have flex:1 so it expands to fill the sheet
           * height that remains after the fixed header and buttons.
           * This makes every field reachable by scrolling while keyboard is open.
           */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {/* Category */}
            <Text style={styles.fieldLabel}>Category *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCatId(cat.id)}
                    style={[styles.catPill, categoryId === cat.id && styles.catPillActive]}
                  >
                    <Text style={[styles.catPillText, categoryId === cat.id && styles.catPillTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Item Type */}
            <Text style={styles.fieldLabel}>Item Type</Text>
            <View style={styles.typeRow}>
              {(['VEG', 'NON_VEG'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, itemType === t && styles.typeBtnActive]}
                  onPress={() => setItemType(prev => (prev === t ? undefined : t))}
                >
                  <View style={[
                    styles.typeIndicator,
                    { backgroundColor: t === 'VEG' ? DS.success : DS.error },
                  ]} />
                  <Text style={[styles.typeBtnText, itemType === t && { color: DS.primary, fontWeight: '700' }]}>
                    {t === 'VEG' ? 'Veg' : 'Non-Veg'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name */}
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Paneer Butter Masala"
              placeholderTextColor={DS.text3}
              returnKeyType="next"
            />

            {/* Price */}
            <Text style={styles.fieldLabel}>Price (₹) *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="120"
              placeholderTextColor={DS.text3}
              returnKeyType="next"
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={desc}
              onChangeText={setDesc}
              placeholder="Short description…"
              placeholderTextColor={DS.text3}
              multiline
            />

            {/* Image URL */}
            <Text style={styles.fieldLabel}>Image URL</Text>
            <TextInput
              style={styles.input}
              value={image}
              onChangeText={setImage}
              placeholder="https://…"
              placeholderTextColor={DS.text3}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

            {/* Availability */}
            <View style={styles.toggleRow}>
              <Text style={styles.fieldLabel}>Available now</Text>
              <Switch
                value={available}
                onValueChange={setAvailable}
                trackColor={{ false: DS.border, true: DS.primary }}
                thumbColor="#fff"
                ios_backgroundColor={DS.border}
              />
            </View>
          </ScrollView>

          {/* Buttons are outside ScrollView — always visible at the bottom of the sheet */}
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{initial ? 'Save Changes' : 'Add Item'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Detail Bottom Sheet ───────────────────────────────────────────────

function DetailSheet({
  item, categories, onClose, onEdit, onDelete,
}: {
  item: MenuItemResponse | null;
  categories: CategoryResponse[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { width: SW } = useWindowDimensions();
  if (!item) return null;

  const catName = categories.find(c => c.id === item.categoryId)?.name ?? 'Uncategorized';
  const isAvail = item.availabilityStatus === 'AVAILABLE';

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={[StyleSheet.absoluteFill, styles.veil]}
        onPress={onClose}
        activeOpacity={1}
      />
      <View style={styles.detailSheet}>
        <View style={styles.sheetHandle} />

        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={[styles.detailImg, { width: SW - 32 }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.detailImg, styles.detailImgPlaceholder, { width: SW - 32 }]}>
            <Ionicons name="restaurant-outline" size={40} color={DS.text3} />
          </View>
        )}

        <View style={styles.detailBody}>
          <View style={styles.detailTopRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                {item.itemType && (
                  <View style={[
                    styles.typeIndicator,
                    { backgroundColor: item.itemType === 'VEG' ? DS.success : DS.error },
                  ]} />
                )}
                <Text style={styles.detailName} numberOfLines={2}>{item.name}</Text>
              </View>
              <Text style={styles.detailCat}>{catName}</Text>
            </View>
            <Text style={styles.detailPrice}>₹{item.price}</Text>
          </View>

          <View style={[styles.statusChip, { backgroundColor: isAvail ? DS.successSoft : DS.errorSoft }]}>
            <View style={[styles.statusDot, { backgroundColor: isAvail ? DS.success : DS.error }]} />
            <Text style={[styles.statusText, { color: isAvail ? DS.success : DS.error }]}>
              {isAvail ? 'Available' : 'Out of stock'}
            </Text>
          </View>

          {!!item.description && <Text style={styles.detailDesc}>{item.description}</Text>}

          <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.editBtnText}>Edit Item</Text>
          </TouchableOpacity>

          <View style={styles.detailSecondaryRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => Share.share({ message: `${item.name} – ₹${item.price}` })}
            >
              <Ionicons name="share-outline" size={15} color={DS.text2} />
              <Text style={styles.secondaryBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: DS.errorSoft, backgroundColor: DS.errorSoft }]}
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={15} color={DS.error} />
              <Text style={[styles.secondaryBtnText, { color: DS.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Menu Item Row ─────────────────────────────────────────────────────

function MenuRow({
  item, categories, onToggle, onPress,
}: {
  item: MenuItemResponse;
  categories: CategoryResponse[];
  onToggle: () => void;
  onPress: () => void;
}) {
  const catName = categories.find(c => c.id === item.categoryId)?.name ?? '';
  const isAvail = item.availabilityStatus === 'AVAILABLE';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.row, !isAvail && styles.rowInactive]}
    >
      {!isAvail && <View style={styles.inactiveStrip} />}

      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.rowImg} resizeMode="cover" />
      ) : (
        <View style={[styles.rowImg, styles.rowImgPlaceholder]}>
          <Text style={styles.rowImgInitial}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.rowInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          {item.itemType && (
            <View style={[
              styles.typeIndicatorSm,
              { backgroundColor: item.itemType === 'VEG' ? DS.success : DS.error },
            ]} />
          )}
          <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={styles.rowPrice}>₹{item.price}</Text>
          {!!catName && <Text style={styles.rowDot}>·</Text>}
          {!!catName && <Text style={styles.rowCat}>{catName}</Text>}
        </View>
      </View>

      <Switch
        value={isAvail}
        onValueChange={onToggle}
        trackColor={{ false: DS.border, true: DS.primary }}
        thumbColor="#fff"
        ios_backgroundColor={DS.border}
      />
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────

const AVAIL_FILTERS: { key: AvailFilter; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'AVAILABLE',    label: 'Active' },
  { key: 'OUT_OF_STOCK', label: 'Inactive' },
];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const {
    categories, items, loading,
    addCategory, editCategory, removeCategory,
    toggleAvailability, addItem, editItem, removeItem,
  } = useMenu();

  const [search, setSearch]            = useState('');
  const [availFilter, setAvailFilter]  = useState<AvailFilter>('all');
  const [selectedCatId, setSelCatId]   = useState<number | null>(null);
  const [itemFormVisible, setItemForm] = useState(false);
  const [editingItem, setEditingItem]  = useState<MenuItemResponse | null>(null);
  const [detailItem, setDetailItem]    = useState<MenuItemResponse | null>(null);
  const [catFormVisible, setCatForm]   = useState(false);
  const [editingCat, setEditingCat]    = useState<CategoryResponse | null>(null);
  const [catSaving, setCatSaving]      = useState(false);

  const { show: showToast, ToastView } = useToast();

  // ── Derived ──────────────────────────────────────────────────────

  const counts = useMemo(() => ({
    all:          items.length,
    AVAILABLE:    items.filter(i => i.availabilityStatus === 'AVAILABLE').length,
    OUT_OF_STOCK: items.filter(i => i.availabilityStatus === 'OUT_OF_STOCK').length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter(i => {
      const matchSearch =
        !q
        || i.name.toLowerCase().includes(q)
        || (i.description ?? '').toLowerCase().includes(q);
      const matchAvail = availFilter === 'all' || i.availabilityStatus === availFilter;
      const matchCat   = selectedCatId === null || i.categoryId === selectedCatId;
      return matchSearch && matchAvail && matchCat;
    });
  }, [items, search, availFilter, selectedCatId]);

  // ── Category handlers ─────────────────────────────────────────────

  const handleSaveCat = useCallback(async (name: string) => {
    setCatSaving(true);
    try {
      if (editingCat) {
        await editCategory(editingCat.id, name);
        showToast('Category renamed', 'ok');
      } else {
        await addCategory(name);
        showToast('Category added', 'ok');
      }
      setCatForm(false);
      setEditingCat(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save category');
    } finally {
      setCatSaving(false);
    }
  }, [editingCat, editCategory, addCategory, showToast]);

  const handleCatLongPress = useCallback((cat: CategoryResponse) => {
    Alert.alert(cat.name, undefined, [
      { text: 'Rename', onPress: () => { setEditingCat(cat); setCatForm(true); } },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => Alert.alert(
          'Delete Category',
          `Delete "${cat.name}"? Items in this category may be affected.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete', style: 'destructive',
              onPress: async () => {
                try {
                  await removeCategory(cat.id);
                  if (selectedCatId === cat.id) setSelCatId(null);
                  showToast('Category deleted', 'err');
                } catch (err: any) {
                  Alert.alert('Error', err?.message ?? 'Failed to delete category');
                }
              },
            },
          ],
        ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [removeCategory, selectedCatId, showToast]);

  // ── Item handlers ─────────────────────────────────────────────────

  const handleToggle = useCallback(async (item: MenuItemResponse) => {
    const wasAvail = item.availabilityStatus === 'AVAILABLE';
    await toggleAvailability(item);
    showToast(wasAvail ? 'Marked out of stock' : 'Marked available', wasAvail ? 'err' : 'ok');
  }, [toggleAvailability, showToast]);

  const handleDelete = useCallback((item: MenuItemResponse) => {
    Alert.alert('Delete Item', `Remove "${item.name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await removeItem(item.id);
            setDetailItem(null);
            showToast('Item deleted', 'err');
          } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Failed to delete item');
          }
        },
      },
    ]);
  }, [removeItem, showToast]);

  const handleSaveItem = useCallback(async (data: CreateMenuItemRequest) => {
    try {
      if (editingItem) {
        await editItem(editingItem.id, data);
        showToast('Item updated', 'ok');
      } else {
        await addItem(data);
        showToast('Item added', 'ok');
      }
      setItemForm(false);
      setEditingItem(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save item');
    }
  }, [editingItem, editItem, addItem, showToast]);

  const openEditItem = useCallback((item: MenuItemResponse) => {
    setEditingItem(item);
    setDetailItem(null);
    setItemForm(true);
  }, []);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={HEADER_BG} />

      {/* ── Header (warm background) ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Menu</Text>
            <Text style={styles.pageSubtitle}>{items.length} Items</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setEditingItem(null); setItemForm(true); }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catChipsRow}
          style={{ marginBottom: 12 }}
        >
          <TouchableOpacity
            onPress={() => setSelCatId(null)}
            style={[styles.catChip, selectedCatId === null && styles.catChipActive]}
          >
            <Text style={[styles.catChipText, selectedCatId === null && styles.catChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelCatId(prev => (prev === cat.id ? null : cat.id))}
              onLongPress={() => handleCatLongPress(cat)}
              style={[styles.catChip, selectedCatId === cat.id && styles.catChipActive]}
            >
              <Text style={[styles.catChipText, selectedCatId === cat.id && styles.catChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.catAddBtn}
            onPress={() => { setEditingCat(null); setCatForm(true); }}
          >
            <Ionicons name="add" size={14} color={DS.primary} />
          </TouchableOpacity>
        </ScrollView>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={DS.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by Item Name"
            placeholderTextColor={DS.text3}
            style={styles.searchInput}
          />
          {!!search && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color={DS.text3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Body (white card, rounded top) ── */}
      <View style={styles.body}>

        {/* Availability filter — 3 equal-width pills */}
        <View style={styles.filterRow}>
          {AVAIL_FILTERS.map(f => {
            const count =
              f.key === 'all'       ? counts.all          :
              f.key === 'AVAILABLE' ? counts.AVAILABLE    :
                                      counts.OUT_OF_STOCK;
            const active = availFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setAvailFilter(f.key)}
                style={[styles.filterTab, active && styles.filterTabActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                  {f.label}
                </Text>
                <Text style={[styles.filterTabCount, active && styles.filterTabCountActive]}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {loading ? (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {[1, 2, 3, 4].map(k => <SkeletonRow key={k} />)}
          </ScrollView>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={i => String(i.id)}
            renderItem={({ item }) => (
              <MenuRow
                item={item}
                categories={categories}
                onToggle={() => handleToggle(item)}
                onPress={() => setDetailItem(item)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="restaurant-outline" size={44} color={DS.border} />
                <Text style={styles.emptyTitle}>
                  {items.length === 0 ? 'No Menu Items Yet' : 'No items match filters'}
                </Text>
                {items.length === 0 && (
                  <Text style={styles.emptyHint}>Tap + to add your first item.</Text>
                )}
              </View>
            }
            contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      {/* ── Modals ── */}
      <CategoryFormModal
        visible={catFormVisible}
        initial={editingCat}
        onSave={handleSaveCat}
        onClose={() => { setCatForm(false); setEditingCat(null); }}
        saving={catSaving}
      />
      <ItemFormModal
        visible={itemFormVisible}
        initial={editingItem}
        categories={categories}
        onSave={handleSaveItem}
        onClose={() => { setItemForm(false); setEditingItem(null); }}
      />
      <DetailSheet
        item={detailItem}
        categories={categories}
        onClose={() => setDetailItem(null)}
        onEdit={() => detailItem && openEditItem(detailItem)}
        onDelete={() => detailItem && handleDelete(detailItem)}
      />

      <ToastView />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: HEADER_BG },

  // Header
  header: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  pageTitle:    { fontSize: 28, fontWeight: '800', color: DS.text },
  pageSubtitle: { fontSize: 13, color: DS.text2, marginTop: 2, fontWeight: '500' },
  addBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: DS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  // Category chips
  catChipsRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: DS.border,
    backgroundColor: DS.surface,
  },
  catChipActive:     { backgroundColor: DS.primary, borderColor: DS.primary },
  catChipText:       { fontSize: 13, color: DS.text2, fontWeight: '500' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  catAddBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: DS.primary,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: DS.primarySoft,
  },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DS.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: DS.text, padding: 0 },

  // Body card
  body: {
    flex: 1, backgroundColor: DS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  // Filter pills
  filterRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  filterTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, paddingVertical: 9,
    borderRadius: 22, borderWidth: 1.5, borderColor: DS.border,
    backgroundColor: DS.bg,
  },
  filterTabActive:      { backgroundColor: DS.primary, borderColor: DS.primary },
  filterTabText:        { fontSize: 13, fontWeight: '600', color: DS.text2 },
  filterTabTextActive:  { color: '#fff' },
  filterTabCount:       { fontSize: 12, fontWeight: '700', color: DS.text3 },
  filterTabCountActive: { color: 'rgba(255,255,255,0.85)' },

  // Skeleton
  skeletonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: DS.surface, borderRadius: 12, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: DS.border,
  },
  skeletonThumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: DS.bg },
  skeletonBody:  { flex: 1 },
  skeletonLine:  { height: 13, borderRadius: 6, backgroundColor: DS.bg, width: '70%' },

  // List
  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 32 },

  // Item row
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: DS.surface, borderRadius: 14, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: DS.border, overflow: 'hidden',
  },
  rowInactive: { opacity: 0.5 },
  inactiveStrip: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: DS.error, borderRadius: 2,
  },
  rowImg:            { width: 56, height: 56, borderRadius: 10, backgroundColor: DS.bg, flexShrink: 0 },
  rowImgPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: DS.primarySoft },
  rowImgInitial:     { fontSize: 22, fontWeight: '800', color: DS.primary },
  rowInfo:  { flex: 1, minWidth: 0 },
  rowName:  { fontSize: 15, fontWeight: '700', color: DS.text },
  rowPrice: { fontSize: 13, fontWeight: '600', color: DS.text2 },
  rowDot:   { fontSize: 13, color: DS.text3 },
  rowCat:   { fontSize: 12, color: DS.text3, fontWeight: '500' },

  typeIndicator:   { width: 10, height: 10, borderRadius: 2 },
  typeIndicatorSm: { width: 8,  height: 8,  borderRadius: 1 },

  // Empty
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8,
  },
  emptyTitle: { fontSize: 15, color: DS.text3, fontWeight: '600' },
  emptyHint:  { fontSize: 13, color: DS.text3 },

  // Toast
  toast: {
    position: 'absolute', bottom: 28, alignSelf: 'center',
    backgroundColor: DS.surface, borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: DS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, zIndex: 100,
  },
  toastDot:  { width: 7, height: 7, borderRadius: 4 },
  toastText: { fontSize: 13, color: DS.text, fontWeight: '500' },

  // Shared modal backdrop
  veil: { backgroundColor: 'rgba(0,0,0,0.45)' },

  // KAV container used by both item and category form modals.
  // iOS:     behavior='padding' — adds paddingBottom = keyboardHeight.
  // Android: behavior='height' — sets explicit height = windowH - keyboardH.
  //          Requires softwareKeyboardLayoutMode:'resize' in app.json so the
  //          Android window actually shrinks when the keyboard opens.
  kavContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // Sheet handle
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: DS.border, alignSelf: 'center', marginBottom: 16,
  },

  // Close button
  closeBtn: {
    width: 30, height: 30, borderRadius: 8,
    borderWidth: 1, borderColor: DS.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Item form sheet — normal flow child of KAV (NOT position:absolute).
  // height:'85%' gives the sheet a definite size so ScrollView(flex:1) inside
  // can measure itself and fill the space. maxHeight alone does NOT work because
  // it is a constraint, not a measured height — flex:1 children collapse inside it.
  formSheet: {
    height: '85%',
    backgroundColor: DS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: DS.border,
  },
  formHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  formTitle:  { fontSize: 18, fontWeight: '700', color: DS.text },
  fieldLabel: {
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7,
    color: DS.text3, marginBottom: 6, fontWeight: '600',
  },
  input: {
    backgroundColor: DS.bg, borderWidth: 1, borderColor: DS.border,
    borderRadius: 10, color: DS.text, fontSize: 14,
    paddingHorizontal: 12, paddingVertical: 11, marginBottom: 14,
  },
  inputMultiline: { height: 72, textAlignVertical: 'top', paddingTop: 10 },
  typeRow:        { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: DS.border, backgroundColor: DS.bg,
  },
  typeBtnActive: { borderColor: DS.primary, backgroundColor: DS.primarySoft },
  typeBtnText:   { fontSize: 14, color: DS.text2, fontWeight: '500' },
  catPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: DS.border, backgroundColor: DS.bg,
  },
  catPillActive:     { backgroundColor: DS.primary, borderColor: DS.primary },
  catPillText:       { fontSize: 13, color: DS.text2, fontWeight: '500' },
  catPillTextActive: { color: '#fff', fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14, paddingVertical: 4,
  },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 12,
    borderWidth: 1, borderColor: DS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15, color: DS.text2, fontWeight: '500' },
  saveBtn: {
    flex: 2, height: 50, borderRadius: 12,
    backgroundColor: DS.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },

  // Category form sheet — same layout contract as formSheet
  catFormSheet: {
    maxHeight: '90%',
    backgroundColor: DS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: DS.border,
  },
  catFormTitle: { fontSize: 18, fontWeight: '700', color: DS.text, marginBottom: 16 },
  catFormInput: {
    backgroundColor: DS.bg, borderWidth: 1.5, borderColor: DS.border,
    borderRadius: 12, color: DS.text, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 16,
  },
  catFormActions: { flexDirection: 'row', gap: 10 },

  // Detail sheet (no keyboard interaction needed — stays position:absolute)
  detailSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: DS.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingBottom: 32, paddingTop: 12,
    borderTopWidth: 1, borderColor: DS.border,
  },
  detailImg: {
    alignSelf: 'center', height: 170, borderRadius: 12,
    backgroundColor: DS.bg, marginBottom: 16, marginHorizontal: 16,
  },
  detailImgPlaceholder: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: DS.primarySoft,
  },
  detailBody:   { paddingHorizontal: 20 },
  detailTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  detailName:   { fontSize: 20, fontWeight: '800', color: DS.text, letterSpacing: -0.3 },
  detailCat:    { fontSize: 13, color: DS.text3, fontWeight: '500', marginTop: 3 },
  detailPrice:  { fontSize: 22, fontWeight: '700', color: DS.primary, flexShrink: 0 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 6, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, marginBottom: 12,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 13, fontWeight: '600' },
  detailDesc: { fontSize: 14, color: DS.text2, lineHeight: 20, marginBottom: 14 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: DS.primary, borderRadius: 12, height: 50, marginBottom: 10,
  },
  editBtnText:        { fontSize: 15, fontWeight: '700', color: '#fff' },
  detailSecondaryRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, height: 42, borderRadius: 10,
    borderWidth: 1, borderColor: DS.border, backgroundColor: DS.bg,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600', color: DS.text2 },
});
