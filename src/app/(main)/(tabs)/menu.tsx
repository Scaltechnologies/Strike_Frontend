import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, TouchableOpacity, FlatList, StyleSheet,
  StatusBar, Switch, Image, Modal, ScrollView, Animated,
  Platform, KeyboardAvoidingView, Share, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Text from '../../../components/Text';
import TextInput from '../../../components/TextInput';
import { Ionicons } from '@expo/vector-icons';
import type { TextInput as RNTextInput } from 'react-native';
import {
  useMenu,
  CategoryResponse,
  MenuItemResponse,
  CreateMenuItemRequest,
} from '../../../modules/menu/hooks/useMenu';
import ItemImagePicker from '../../../modules/menu/components/ItemImagePicker';
import CategorySelectorSheet from '../../../modules/menu/components/CategorySelectorSheet';
import { getLastUsedCategoryId, setLastUsedCategoryId } from '../../../modules/menu/state/lastUsedCategory';
import { resolveMediaUrl } from '../../../core/api/mediaUrl';
import { getUserMessage } from '../../../core/api/errorMessage';
import { SkeletonBlock } from '../../../components/Skeleton';
import FadeIn from '../../../components/FadeIn';

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

// ── App Alert (replaces the OS-native Alert.alert with a themed,
//    animated dialog matching the rest of the screen) ───────────────────

type AlertButton = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
type AlertConfig = { title: string; message?: string; buttons: AlertButton[] };

function useAppAlert() {
  const [config, setConfig]   = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const alert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setConfig({ title, message, buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }] });
    setVisible(true);
  }, []);

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 70 }).start();
    }
  }, [visible, anim]);

  // Deferred with setTimeout so a button's onPress (which may itself call
  // `alert(...)` again, e.g. a "Delete" confirmation chained off an action
  // sheet) fires *after* this dialog has actually unmounted, instead of
  // being batched into the same render and skipping the close animation.
  const close = useCallback((onPress?: () => void) => {
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setVisible(false);
      setConfig(null);
      if (onPress) setTimeout(onPress, 0);
    });
  }, [anim]);

  const AlertView = useCallback(() => {
    if (!config) return null;
    const { title, message, buttons } = config;
    const isList = buttons.length > 2;
    const hasDestructive = buttons.some(b => b.style === 'destructive');
    const isAlarming = hasDestructive || /error|required/i.test(title);

    const iconName = hasDestructive ? 'trash-outline'
      : /error/i.test(title) ? 'close-circle'
      : /required/i.test(title) ? 'alert-circle'
      : 'information-circle';

    // Cancel-style buttons always render first (left/top) regardless of the
    // order they were declared in — keeps every dialog reading consistently.
    const rowButtons = [...buttons].sort(
      (a, b) => (a.style === 'cancel' ? 0 : 1) - (b.style === 'cancel' ? 0 : 1),
    );

    const dismiss = () => close(buttons.find(b => b.style === 'cancel')?.onPress);

    const overlayStyle = { opacity: anim };
    const cardStyle = {
      opacity: anim,
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
    };

    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
        <View style={alertStyles.wrap}>
          <Animated.View style={[StyleSheet.absoluteFill, alertStyles.overlay, overlayStyle]} />
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismiss} />

          <Animated.View style={[alertStyles.card, cardStyle]}>
            {!isList && (
              <View style={[alertStyles.iconWrap, { backgroundColor: isAlarming ? DS.errorSoft : DS.primarySoft }]}>
                <Ionicons name={iconName as any} size={22} color={isAlarming ? DS.error : DS.primary} />
              </View>
            )}
            <Text style={alertStyles.title}>{title}</Text>
            {!!message && <Text style={alertStyles.message}>{message}</Text>}

            {isList ? (
              <View style={alertStyles.listWrap}>
                {buttons.map((b, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[alertStyles.listItem, idx < buttons.length - 1 && alertStyles.listItemBorder]}
                    onPress={() => close(b.onPress)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      alertStyles.listItemText,
                      b.style === 'destructive' && { color: DS.error },
                      b.style === 'cancel' && { color: DS.text3, fontWeight: '600' },
                    ]}>
                      {b.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : buttons.length === 1 ? (
              <TouchableOpacity style={alertStyles.singleBtn} onPress={() => close(buttons[0].onPress)} activeOpacity={0.88}>
                <Text style={alertStyles.singleBtnText}>{buttons[0].text}</Text>
              </TouchableOpacity>
            ) : (
              <View style={alertStyles.row}>
                {rowButtons.map((b, idx) => {
                  const primary = b.style !== 'cancel';
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        alertStyles.rowBtn,
                        primary
                          ? (b.style === 'destructive' ? alertStyles.rowBtnDanger : alertStyles.rowBtnPrimary)
                          : alertStyles.rowBtnGhost,
                      ]}
                      onPress={() => close(b.onPress)}
                      activeOpacity={0.88}
                    >
                      <Text style={[alertStyles.rowBtnText, { color: primary ? '#fff' : DS.text2 }]}>
                        {b.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    );
  }, [config, visible, anim, close]);

  return { alert, AlertView };
}

const alertStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  overlay: { backgroundColor: 'rgba(10,10,12,0.55)' },
  card: {
    width: '100%', maxWidth: 340,
    backgroundColor: DS.surface, borderRadius: 22,
    paddingTop: 24, paddingHorizontal: 22, paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 28, elevation: 16,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title:   { fontSize: 17, fontWeight: '800', color: DS.text, textAlign: 'center' },
  message: {
    fontSize: 13.5, color: DS.text2, textAlign: 'center',
    lineHeight: 20, marginTop: 8,
  },

  row:     { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  rowBtn: {
    flex: 1, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  rowBtnPrimary: { backgroundColor: DS.primary },
  rowBtnDanger:  { backgroundColor: DS.error },
  rowBtnGhost:   { backgroundColor: DS.bg, borderWidth: 1, borderColor: DS.border },
  rowBtnText:    { fontSize: 14.5, fontWeight: '700' },

  singleBtn: {
    height: 46, borderRadius: 13, width: '100%',
    backgroundColor: DS.primary, alignItems: 'center', justifyContent: 'center',
    marginTop: 20,
  },
  singleBtnText: { fontSize: 14.5, fontWeight: '700', color: '#fff' },

  listWrap: { width: '100%', marginTop: 18 },
  listItem: { paddingVertical: 14, alignItems: 'center' },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: DS.border },
  listItemText: { fontSize: 15, fontWeight: '600', color: DS.text },
});

// ── Skeleton ──────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <SkeletonBlock w={52} h={52} radius={8} color={DS.bg} />
      <View style={styles.skeletonBody}>
        <SkeletonBlock w="70%" h={13} radius={6} color={DS.bg} />
        <View style={{ height: 7 }} />
        <SkeletonBlock w="45%" h={13} radius={6} color={DS.bg} />
      </View>
    </View>
  );
}

// ── Item Form Modal ───────────────────────────────────────────────────

interface ItemFormProps {
  visible: boolean;
  initial?: MenuItemResponse | null;
  categories: CategoryResponse[];
  defaultCategoryId?: number | null;
  onCreate: (data: CreateMenuItemRequest) => Promise<MenuItemResponse>;
  onEdit: (id: number, data: Partial<CreateMenuItemRequest>) => Promise<MenuItemResponse>;
  onSetImage: (id: number, imageUri: string) => Promise<MenuItemResponse>;
  onSaved: (message: string, categoryId: number) => void;
  onClose: () => void;
}

// Category context is never re-asked from scratch: it's always shown as a
// pre-filled "Curries ✓ · Change" summary (defaultCategoryId → last category
// the vendor used this session → first category), never a blank required
// picker. "Save & Add Another" keeps that category sticky across saves so
// adding several items to the same category is a single fast loop — see
// PART 11-13 of the redesign brief this screen implements.
function ItemFormModal({
  visible, initial, categories, defaultCategoryId, onCreate, onEdit, onSetImage, onSaved, onClose,
}: ItemFormProps) {
  const [name, setName]           = useState('');
  const [price, setPrice]         = useState('');
  const [desc, setDesc]           = useState('');
  const [image, setImage]         = useState(''); // existing remote imageUrl (edit mode)
  const [pickedUri, setPickedUri] = useState<string | null>(null); // freshly picked local uri
  const [categoryId, setCatId]    = useState<number | null>(null);
  const [itemType, setItemType]   = useState<'VEG' | 'NON_VEG' | undefined>(undefined);
  const [available, setAvailable] = useState(true);
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const nameRef = useRef<RNTextInput>(null);
  const { alert, AlertView } = useAppAlert();

  useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setPrice(initial?.price != null ? String(initial.price) : '');
      setDesc(initial?.description ?? '');
      setImage(initial?.imageUrl ?? '');
      setPickedUri(null);
      setCatId(initial?.categoryId ?? defaultCategoryId ?? getLastUsedCategoryId() ?? (categories[0]?.id ?? null));
      setItemType(initial?.itemType);
      setAvailable((initial?.availabilityStatus ?? 'AVAILABLE') === 'AVAILABLE');
      setSaving(false);
    }
  }, [visible, initial, categories, defaultCategoryId]);

  // Clears everything except the category (and re-focuses Name) so adding a
  // run of items to the same category — e.g. four curries in a row — never
  // makes the vendor touch the category field more than once.
  const resetForAnother = useCallback(() => {
    setName('');
    setPrice('');
    setDesc('');
    setImage('');
    setPickedUri(null);
    setItemType(undefined);
    setAvailable(true);
    requestAnimationFrame(() => nameRef.current?.focus());
  }, []);

  const doSave = async (addAnother: boolean) => {
    if (!name.trim()) { alert('Required', 'Item name is required.'); return; }
    if (!categoryId)  { alert('Required', 'Please select a category.'); return; }
    if (!itemType)    { alert('Required', 'Please select Veg or Non-Veg.'); return; }
    const parsedPrice = parseFloat(price);
    if (!parsedPrice || parsedPrice <= 0) {
      alert('Required', 'Enter a valid price.');
      return;
    }

    const payload: CreateMenuItemRequest = {
      name:               name.trim(),
      price:              parsedPrice,
      categoryId,
      description:        desc.trim() || undefined,
      itemType,
      availabilityStatus: available ? 'AVAILABLE' : 'OUT_OF_STOCK',
    };

    setSaving(true);
    try {
      const saved = initial ? await onEdit(initial.id, payload) : await onCreate(payload);

      if (pickedUri) {
        try {
          await onSetImage(saved.id, pickedUri);
        } catch (imgErr) {
          const reason = getUserMessage(imgErr, 'please try again');
          onSaved(`${initial ? 'Item updated' : 'Item added'} — but the photo failed to upload (${reason}). Try again from edit.`, categoryId);
          if (addAnother && !initial) { resetForAnother(); } else { onClose(); }
          return;
        }
      }

      onSaved(initial ? 'Item updated' : 'Item added', categoryId);
      if (addAnother && !initial) {
        resetForAnother();
      } else {
        onClose();
      }
    } catch (err) {
      alert('Error', getUserMessage(err, 'Failed to save item — please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === categoryId) ?? null;
  const previewImageUri = pickedUri ?? resolveMediaUrl(image);

  return (
    <>
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
            {/* Food photo */}
            <View style={styles.itemImageRow}>
              <ItemImagePicker uri={previewImageUri} onPick={setPickedUri} />
            </View>

            {/* Category — always a pre-filled summary, never a blank picker.
                Tapping it opens the shared CategorySelectorSheet; the vendor
                only ever touches this when they actually want to change it. */}
            <Text style={styles.fieldLabel}>Category *</Text>
            {categories.length === 0 ? (
              <View style={styles.catEmptyBox}>
                <Ionicons name="alert-circle-outline" size={16} color={DS.text3} />
                <Text style={styles.catEmptyText}>
                  No categories yet — add one from the Menu screen first.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.catSummaryRow}
                onPress={() => setCatPickerOpen(true)}
                activeOpacity={0.8}
              >
                {selectedCategory && resolveMediaUrl(selectedCategory.imageUrl) ? (
                  <Image source={{ uri: resolveMediaUrl(selectedCategory.imageUrl)! }} style={styles.catSummaryThumb} />
                ) : (
                  <View style={[styles.catSummaryThumb, styles.catChipThumbPlaceholder]}>
                    <Text style={styles.catChipThumbInitial}>
                      {(selectedCategory?.name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.catSummaryNameRow}>
                    <Text style={styles.catSummaryName} numberOfLines={1}>
                      {selectedCategory?.name ?? 'Select a category'}
                    </Text>
                    {!!selectedCategory && <Ionicons name="checkmark-circle" size={15} color={DS.success} />}
                  </View>
                </View>
                <View style={styles.changePill}>
                  <Text style={styles.changePillText}>Change</Text>
                  <Ionicons name="chevron-forward" size={13} color={DS.primary} />
                </View>
              </TouchableOpacity>
            )}

            {/* Item Type */}
            <Text style={styles.fieldLabel}>Item Type *</Text>
            <View style={styles.typeRow}>
              {(['VEG', 'NON_VEG'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, itemType === t && styles.typeBtnActive]}
                  onPress={() => setItemType(t)}
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
              ref={nameRef}
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

          {/* Buttons are outside ScrollView — always visible at the bottom of the sheet.
              Editing keeps the familiar Cancel + Save pair; adding a new item
              swaps in "Save & Add Another" so a run of items to one category
              never requires re-opening this sheet from scratch. */}
          {initial ? (
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => doSave(false)} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formActionsStack}>
              <TouchableOpacity style={styles.saveBtnFull} onPress={() => doSave(false)} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={styles.saveBtnText}>Save Item</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveAnotherBtn} onPress={() => doSave(true)} disabled={saving} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={16} color={DS.primary} />
                <Text style={styles.saveAnotherBtnText}>Save & Add Another</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <CategorySelectorSheet
      visible={catPickerOpen}
      categories={categories}
      selectedId={categoryId}
      onSelect={(id) => { setCatId(id); setCatPickerOpen(false); }}
      onClose={() => setCatPickerOpen(false)}
    />

    <AlertView />
    </>
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
        <LinearGradient
          colors={[DS.primary, DS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.detailHeader}
        >
          <View style={styles.sheetHandleLight} />

          <TouchableOpacity
            style={styles.detailCloseBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>

          <View style={styles.detailEyebrowRow}>
            {item.itemType && (
              <View style={styles.detailTypeChip}>
                <View style={[
                  styles.typeIndicator,
                  { backgroundColor: item.itemType === 'VEG' ? '#4ADE80' : '#FF8A80' },
                ]} />
                <Text style={styles.detailTypeChipText}>
                  {item.itemType === 'VEG' ? 'Veg' : 'Non-Veg'}
                </Text>
              </View>
            )}
            <Text style={styles.detailEyebrow} numberOfLines={1}>{catName}</Text>
          </View>

          <Text style={styles.detailHeaderName} numberOfLines={2}>{item.name}</Text>

          <View style={styles.detailHeaderBottomRow}>
            <Text style={styles.detailPriceBig}>₹{item.price}</Text>
            <View style={[
              styles.headerStatusChip,
              { backgroundColor: isAvail ? 'rgba(74,222,128,0.2)' : 'rgba(255,138,128,0.2)' },
            ]}>
              <View style={[styles.statusDot, { backgroundColor: isAvail ? '#4ADE80' : '#FF8A80' }]} />
              <Text style={[styles.headerStatusText, { color: isAvail ? '#4ADE80' : '#FF8A80' }]}>
                {isAvail ? 'Available' : 'Out of stock'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.detailBody}>
          {!!resolveMediaUrl(item.imageUrl) && (
            <Image source={{ uri: resolveMediaUrl(item.imageUrl)! }} style={styles.detailItemImage} resizeMode="cover" />
          )}
          {!!item.description && (
            <View style={styles.detailDescCard}>
              <Text style={styles.detailDesc}>{item.description}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.editBtnText}>Edit Item</Text>
          </TouchableOpacity>

          <View style={styles.detailSecondaryRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => Share.share({ message: `${item.name} – ₹${item.price}` })}
              activeOpacity={0.75}
            >
              <Ionicons name="share-outline" size={15} color={DS.text2} />
              <Text style={styles.secondaryBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, styles.secondaryBtnDanger]}
              onPress={onDelete}
              activeOpacity={0.75}
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

      {resolveMediaUrl(item.imageUrl) ? (
        <Image source={{ uri: resolveMediaUrl(item.imageUrl)! }} style={styles.rowImg} resizeMode="cover" />
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

// ── Floating Add Button ──────────────────────────────────────────────

function AddItemFab({ onPress, dimmed }: { onPress: () => void; dimmed?: boolean }) {
  const enter = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [enter]);

  const handlePressIn = () => {
    Animated.spring(press, { toValue: 0.88, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 9 }).start();
  };

  const rotate = enter.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '0deg'] });

  return (
    <Animated.View
      style={[
        styles.fabWrap,
        { opacity: Animated.multiply(enter, dimmed ? 0.55 : 1), transform: [{ scale: Animated.multiply(enter, press) }, { rotate }] },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.fab}
      >
        <LinearGradient
          colors={[DS.primary, DS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Category Story Row (circular avatars, à la Instagram/WhatsApp) ─────
// Read-only filter strip — categories are master data the vendor browses
// and selects, never creates or edits here (long-press-to-edit was removed
// along with vendor category management; see categoryService.ts).

function CategoryCircle({
  label, imageUri, icon, selected, onPress,
}: {
  label: string;
  imageUri?: string | null;
  icon?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const press = useRef(new Animated.Value(1)).current;
  const handlePressIn  = () => Animated.spring(press, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 6 }).start();
  const handlePressOut = () => Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 9 }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.85}
      style={styles.storyItem}
    >
      <Animated.View style={[styles.storyRing, selected && styles.storyRingActive, { transform: [{ scale: press }] }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.storyImg} />
        ) : (
          <View style={[styles.storyImg, styles.catChipThumbPlaceholder]}>
            {icon ? (
              <Ionicons name={icon as any} size={22} color={DS.primary} />
            ) : (
              <Text style={styles.storyImgInitial}>{label.charAt(0).toUpperCase()}</Text>
            )}
          </View>
        )}
      </Animated.View>
      <Text style={[styles.storyLabel, selected && styles.storyLabelActive]} numberOfLines={1}>
        {label}
      </Text>
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
    categories, items, loading, refreshing, loadError, refresh,
    toggleAvailability, addItem, editItem, removeItem, setItemImage,
  } = useMenu();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const [search, setSearch]            = useState('');
  const [availFilter, setAvailFilter]  = useState<AvailFilter>('all');
  const [selectedCatId, setSelCatId]   = useState<number | null>(null);
  const [itemFormVisible, setItemForm] = useState(false);
  const [editingItem, setEditingItem]  = useState<MenuItemResponse | null>(null);
  const [detailItem, setDetailItem]    = useState<MenuItemResponse | null>(null);

  const { show: showToast, ToastView } = useToast();
  const { alert, AlertView } = useAppAlert();

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

  // ── Item handlers ─────────────────────────────────────────────────
  // (No category handlers here — categories are read-only master data for
  // this app; see categoryService.ts.)

  const handleToggle = useCallback(async (item: MenuItemResponse) => {
    const wasAvail = item.availabilityStatus === 'AVAILABLE';
    try {
      await toggleAvailability(item);
      showToast(wasAvail ? 'Marked out of stock' : 'Marked available', wasAvail ? 'err' : 'ok');
    } catch (err) {
      alert('Error', getUserMessage(err, 'Failed to update availability'));
    }
  }, [toggleAvailability, showToast, alert]);

  const handleDelete = useCallback((item: MenuItemResponse) => {
    alert('Delete Item', `Remove "${item.name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await removeItem(item.id);
            setDetailItem(null);
            showToast('Item deleted', 'err');
          } catch (err: any) {
            alert('Error', err?.message ?? 'Failed to delete item');
          }
        },
      },
    ]);
  }, [removeItem, showToast, alert]);

  // ItemFormModal drives its own create/edit → image-upload sequence and
  // only reports back here once a save has fully gone through — same
  // contract as handleCategorySaved above. It also passes the categoryId
  // that was actually used, so it becomes this session's "last used"
  // category the next time Add Item opens without explicit context.
  const handleItemSaved = useCallback((message: string, categoryId: number) => {
    setLastUsedCategoryId(categoryId);
    showToast(message, 'ok');
  }, [showToast]);

  const openEditItem = useCallback((item: MenuItemResponse) => {
    setEditingItem(item);
    setDetailItem(null);
    setItemForm(true);
  }, []);

  // Category context is no longer a hard gate — the item form always shows
  // a pre-filled category (tapped filter chip → last used this session →
  // first category) with a "Change" affordance, so the vendor never has to
  // leave the form to pick one first. Only zero *available* categories
  // still blocks — and categories are Strike-managed master data now, so
  // there is no "Add Category" escape hatch to offer here anymore.
  const handleAddItemPress = useCallback(() => {
    if (loadError && categories.length === 0) {
      alert('Categories Unavailable', "Couldn't load categories — pull down to refresh and try again.");
      return;
    }
    if (categories.length === 0) {
      alert(
        'No Categories Yet',
        'Menu categories are managed by Strike. Please contact your administrator to have categories added before you add items.',
      );
      return;
    }
    setEditingItem(null);
    setItemForm(true);
  }, [categories.length, loadError, alert]);

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
        </View>

        {/* Category row — read-only master data. Strike admin owns what
            appears here; this screen only ever browses and filters by it. */}
        {loadError && categories.length === 0 ? (
          <View style={styles.categoryStateBox}>
            <Ionicons name="cloud-offline-outline" size={16} color={DS.error} />
            <Text style={styles.categoryStateText}>Couldn't load categories.</Text>
            <TouchableOpacity onPress={() => refresh()} style={styles.retryPill} activeOpacity={0.8}>
              <Text style={styles.retryPillText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !loading && categories.length === 0 ? (
          <View style={styles.categoryStateBox}>
            <Ionicons name="pricetags-outline" size={16} color={DS.text3} />
            <Text style={styles.categoryStateText}>
              No categories are available yet. Please contact your administrator.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storyRow}
            style={{ marginBottom: 12 }}
          >
            <CategoryCircle
              label="All"
              icon="apps"
              selected={selectedCatId === null}
              onPress={() => setSelCatId(null)}
            />

            {categories.map(cat => (
              <CategoryCircle
                key={cat.id}
                label={cat.name}
                imageUri={resolveMediaUrl(cat.imageUrl)}
                selected={selectedCatId === cat.id}
                onPress={() => setSelCatId(prev => (prev === cat.id ? null : cat.id))}
              />
            ))}
          </ScrollView>
        )}

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
          <FadeIn style={{ flex: 1 }}>
            <FlatList
              data={filtered}
              keyExtractor={i => String(i.id)}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => refresh(true)}
                  colors={[DS.primary]}
                  tintColor={DS.primary}
                />
              }
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
          </FadeIn>
        )}
      </View>

      {/* ── Modals ── */}
      <ItemFormModal
        visible={itemFormVisible}
        initial={editingItem}
        categories={categories}
        defaultCategoryId={selectedCatId}
        onCreate={addItem}
        onEdit={editItem}
        onSetImage={setItemImage}
        onSaved={handleItemSaved}
        onClose={() => { setItemForm(false); setEditingItem(null); }}
      />
      <DetailSheet
        item={detailItem}
        categories={categories}
        onClose={() => setDetailItem(null)}
        onEdit={() => detailItem && openEditItem(detailItem)}
        onDelete={() => detailItem && handleDelete(detailItem)}
      />

      <AddItemFab onPress={handleAddItemPress} dimmed={!!loadError && categories.length === 0} />

      <ToastView />
      <AlertView />
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

  // Floating add button
  fabWrap: { position: 'absolute', right: 20, bottom: 24, zIndex: 50 },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },

  // Category "story" row — circular avatars replacing the old pill bar
  catChipThumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: DS.primarySoft },
  catChipThumbInitial: { fontSize: 11, fontWeight: '800', color: DS.primary },

  // Read-only category state — no categories loaded yet, or failed to load
  categoryStateBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  categoryStateText: { flex: 1, fontSize: 12.5, color: DS.text2, lineHeight: 17, fontWeight: '500' },
  retryPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: DS.primary,
  },
  retryPillText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  storyRow: { flexDirection: 'row', gap: 14, paddingRight: 4 },
  storyItem: { alignItems: 'center', width: 64, gap: 6 },
  storyRing: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2.5, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  storyRingActive: { borderColor: DS.primary },
  storyImg: { width: 52, height: 52, borderRadius: 26, backgroundColor: DS.bg },
  storyImgInitial: { fontSize: 18, fontWeight: '800', color: DS.primary },
  storyLabel:       { fontSize: 11.5, fontWeight: '600', color: DS.text2, textAlign: 'center' },
  storyLabelActive: { color: DS.primary, fontWeight: '700' },

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
  skeletonBody:  { flex: 1 },

  // List
  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 100 },

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

  // Item photo
  itemImageRow: { marginBottom: 18 },

  // Category — item form summary row + "Change" pill (opens CategorySelectorSheet)
  fieldHint: { fontSize: 12, color: DS.text3, marginTop: -3, marginBottom: 10, lineHeight: 16 },
  catSummaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: DS.bg, borderRadius: 14, padding: 10,
    borderWidth: 1.5, borderColor: DS.border, marginBottom: 16,
  },
  catSummaryThumb: { width: 40, height: 40, borderRadius: 20, backgroundColor: DS.surface },
  catSummaryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catSummaryName: { fontSize: 14.5, fontWeight: '700', color: DS.text, flexShrink: 1 },
  changePill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20,
    backgroundColor: DS.primarySoft,
  },
  changePillText: { fontSize: 12.5, fontWeight: '700', color: DS.primary },
  catEmptyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: DS.bg, borderRadius: 12, borderWidth: 1, borderColor: DS.border,
    padding: 12, marginBottom: 16,
  },
  catEmptyText: { flex: 1, fontSize: 12.5, color: DS.text3, lineHeight: 17 },

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

  // New-item action stack — "Save Item" + "Save & Add Another"
  formActionsStack: { gap: 10, marginTop: 8 },
  saveBtnFull: {
    height: 52, borderRadius: 12,
    backgroundColor: DS.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveAnotherBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: DS.primarySoft, backgroundColor: DS.primarySoft,
  },
  saveAnotherBtnText: { fontSize: 14, color: DS.primary, fontWeight: '700' },

  // Detail sheet (no keyboard interaction needed — stays position:absolute)
  detailSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: DS.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 14,
  },

  // Gradient hero header — replaces the old photo/placeholder block
  detailHeader: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 26 },
  sheetHandleLight: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)', alignSelf: 'center', marginBottom: 18,
  },
  detailCloseBtn: {
    position: 'absolute', top: 14, right: 16,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  detailEyebrowRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingRight: 36,
  },
  detailTypeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  detailTypeChipText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  detailEyebrow: {
    fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase', letterSpacing: 0.6, flexShrink: 1,
  },
  detailHeaderName: {
    fontSize: 24, fontWeight: '800', color: '#fff',
    letterSpacing: -0.3, marginBottom: 16, paddingRight: 30,
  },
  detailHeaderBottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  detailPriceBig: { fontSize: 30, fontWeight: '800', color: '#fff' },
  headerStatusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  headerStatusText: { fontSize: 12, fontWeight: '700' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  // Body
  detailBody: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  detailItemImage: {
    width: '100%', height: 170, borderRadius: 16,
    backgroundColor: DS.bg, marginBottom: 18,
  },
  detailDescCard: {
    backgroundColor: DS.bg, borderRadius: 14, padding: 14,
    marginBottom: 18, borderLeftWidth: 3, borderLeftColor: DS.primary,
  },
  detailDesc: { fontSize: 14, color: DS.text2, lineHeight: 21 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary, borderRadius: 14, height: 52, marginBottom: 12,
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  editBtnText:        { fontSize: 15, fontWeight: '700', color: '#fff' },
  detailSecondaryRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 46, borderRadius: 12,
    borderWidth: 1, borderColor: DS.border, backgroundColor: DS.bg,
  },
  secondaryBtnDanger: { borderColor: DS.errorSoft, backgroundColor: DS.errorSoft },
  secondaryBtnText:   { fontSize: 13, fontWeight: '600', color: DS.text2 },
});
