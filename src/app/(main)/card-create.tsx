import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createCard } from '../../modules/cards/services/cardService';
import { getMyStore } from '../../modules/store/services/storeService';
import { fetchCategories, fetchMenuItems } from '../../modules/menu/services/menuService';
import type { CreateCardRequest } from '../../modules/cards/types/card.types';
import type { CategoryResponse, MenuItemResponse } from '../../modules/menu/services/menuService';

const DS = {
  bg: '#F6F7FA', surface: '#FFFFFF', border: '#EAECEF',
  primary: '#CC2200', primarySoft: '#FFF0EE',
  success: '#16A34A', successSoft: '#F0FDF4',
  warning: '#D97706',
  text: '#1A1A1A', text2: '#5A6272', text3: '#9BA3AF',
};

type Step = 1 | 2 | 3 | 4;
const STEP_LABELS = ['Details', 'Categories', 'Items', 'Review'];

function Stepper({ current }: { current: Step }) {
  return (
    <View style={ss.stepper}>
      {STEP_LABELS.map((label, idx) => {
        const num    = idx + 1;
        const done   = num < current;
        const active = num === current;
        const isLast = idx === STEP_LABELS.length - 1;
        return (
          <View key={num} style={[ss.stepUnit, !isLast && { flex: 1 }]}>
            <View style={ss.stepDotRow}>
              <View style={[ss.stepDot, done && ss.dotDone, active && ss.dotActive]}>
                {done
                  ? <Ionicons name="checkmark" size={10} color="#fff" />
                  : <Text style={[ss.dotNum, (done || active) && { color: '#fff' }]}>{num}</Text>
                }
              </View>
              {!isLast && <View style={[ss.stepLine, done && ss.lineDone]} />}
            </View>
            <Text style={[ss.stepLabel, active && ss.stepLabelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function CardCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — card details
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [cardPrice, setCardPrice] = useState('');
  const [walletAmt, setWalletAmt] = useState('');
  const [validity, setValidity]   = useState('');
  const [imageUrl, setImageUrl]   = useState('');

  // Step 2 — categories
  const [selectedCatIds, setSelCatIds] = useState<number[]>([]);

  // Step 3 — eligible items
  const [selectedItemIds, setSelItemIds] = useState<number[]>([]);
  const [itemSearch, setItemSearch]       = useState('');
  const [allItems, setAllItems]           = useState<MenuItemResponse[]>([]);
  const [loadingItems, setLoadingItems]   = useState(false);

  // Loaded once at mount
  const [storeId, setStoreId]         = useState<number | null>(null);
  const [categories, setCategories]   = useState<CategoryResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError]     = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  // ── Derived ────────────────────────────────────────────────────────
  const price   = parseFloat(cardPrice) || 0;
  const wallet  = parseFloat(walletAmt) || 0;
  const days    = parseInt(validity, 10) || 0;
  const bonus   = wallet - price;
  const bonusOk = wallet > price;

  const step1Ok = name.trim().length > 0 && price > 0 && bonusOk && days > 0;
  const step2Ok = selectedCatIds.length > 0;
  const step3Ok = selectedItemIds.length > 0;

  // Items in selected categories
  const catItems = allItems.filter(i => selectedCatIds.includes(i.categoryId));
  const searchLow = itemSearch.toLowerCase();
  const visibleItems = searchLow
    ? catItems.filter(i => i.name.toLowerCase().includes(searchLow))
    : catItems;
  const groupedItems = selectedCatIds
    .map(cId => ({
      cat: categories.find(c => c.id === cId)!,
      items: visibleItems.filter(i => i.categoryId === cId),
    }))
    .filter(g => g.cat && g.items.length > 0);

  // ── Data loading ───────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      // Run in parallel; store failure blocks the form (storeId required), category
      // failure is handled gracefully (Step 2 shows empty state).
      const [storeResult, catsResult] = await Promise.allSettled([
        getMyStore(),
        fetchCategories(),
      ]);

      if (storeResult.status === 'rejected') {
        const raw: string = storeResult.reason?.message ?? 'Failed to load store';
        const is500 = raw.includes('[500]');
        setDataError(
          is500
            ? 'Store not found — your store profile may not be set up yet, or there is a server error.\n\nTip: Go to Profile and verify your store is active, then retry.'
            : raw,
        );
        return;
      }
      setStoreId(storeResult.value.id);
      if (catsResult.status === 'fulfilled') {
        setCategories(catsResult.value.filter(c => c.status === 'ACTIVE'));
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const loadItems = useCallback(async () => {
    if (allItems.length > 0) return;
    setLoadingItems(true);
    try {
      const items = await fetchMenuItems();
      setAllItems(items);
    } catch (err: any) {
      Alert.alert('Failed to load items', err?.message ?? 'Please retry.', [
        { text: 'Retry', onPress: loadItems },
        { text: 'Skip', onPress: () => setStep(4) },
      ]);
    } finally {
      setLoadingItems(false);
    }
  }, [allItems.length]);

  // ── Navigation ─────────────────────────────────────────────────────
  const goNext = () => {
    if (step === 1) {
      if (!step1Ok) return;
      setStep(2);
    } else if (step === 2) {
      if (!step2Ok) return;
      // Drop items that belong to now-deselected categories
      setSelItemIds(prev =>
        prev.filter(id => {
          const item = allItems.find(i => i.id === id);
          return item && selectedCatIds.includes(item.categoryId);
        }),
      );
      loadItems();
      setStep(3);
    } else if (step === 3) {
      if (!step3Ok) return;
      setStep(4);
    }
  };

  const goBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!storeId || submitting) return;
    const payload: CreateCardRequest = {
      storeId,
      name:               name.trim(),
      description:        description.trim() || undefined,
      cardPrice:          price,
      walletAmount:       wallet,
      validityInDays:     days,
      imageUrl:           imageUrl.trim() || undefined,
      categoryIds:        selectedCatIds,
      eligibleMenuItemIds: selectedItemIds.length > 0 ? selectedItemIds : undefined,
    };
    setSubmitting(true);
    try {
      const created = await createCard(payload);
      Alert.alert(
        'Card Created!',
        `"${created.name}" is now live. Customers can subscribe and redeem.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to create card.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / Error guard ──────────────────────────────────────────
  if (loadingData) {
    return (
      <View style={ss.center}>
        <ActivityIndicator size="large" color={DS.primary} />
        <Text style={ss.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (dataError) {
    const isStoreError = dataError.includes('store') || dataError.includes('[500]');
    return (
      <View style={ss.center}>
        <Ionicons
          name={isStoreError ? 'storefront-outline' : 'wifi-outline'}
          size={40}
          color={DS.text3}
        />
        <Text style={ss.errorTitle}>
          {isStoreError ? 'Store Unavailable' : 'Could not load'}
        </Text>
        <Text style={ss.errorBody}>{dataError}</Text>
        <TouchableOpacity style={ss.retryBtn} onPress={loadInitialData}>
          <Text style={ss.retryText}>Retry</Text>
        </TouchableOpacity>
        {isStoreError && (
          <TouchableOpacity
            style={ss.secondaryBtn}
            onPress={() => router.push('/(main)/profile')}
          >
            <Ionicons name="person-outline" size={15} color={DS.text2} />
            <Text style={ss.secondaryBtnText}>Go to Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── Step content ───────────────────────────────────────────────────
  const renderContent = () => {
    // ── Step 1: Details ──
    if (step === 1) {
      return (
        <>
          <View style={ss.sCard}>
            <Text style={ss.sTitle}>PRICING</Text>
            <View style={ss.row}>
              <View style={{ flex: 1 }}>
                <Text style={ss.label}>Card Price (₹) *</Text>
                <TextInput
                  style={ss.input}
                  value={cardPrice}
                  onChangeText={setCardPrice}
                  placeholder="499"
                  placeholderTextColor={DS.text3}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ss.label}>Wallet Value (₹) *</Text>
                <TextInput
                  style={[ss.input, wallet > 0 && !bonusOk && ss.inputErr]}
                  value={walletAmt}
                  onChangeText={setWalletAmt}
                  placeholder="600"
                  placeholderTextColor={DS.text3}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {price > 0 && wallet > 0 && (
              <View style={[ss.bonusBanner, bonusOk ? ss.bonusOk : ss.bonusErr]}>
                <Ionicons
                  name={bonusOk ? 'trending-up-outline' : 'warning-outline'}
                  size={15}
                  color={bonusOk ? DS.success : DS.primary}
                />
                <Text style={[ss.bonusText, { color: bonusOk ? DS.success : DS.primary }]}>
                  {bonusOk
                    ? `Customer gets +₹${bonus.toFixed(0)} bonus value`
                    : 'Wallet value must exceed card price'}
                </Text>
              </View>
            )}

            <View style={ss.field}>
              <Text style={ss.label}>Validity (days) *</Text>
              <TextInput
                style={ss.input}
                value={validity}
                onChangeText={setValidity}
                placeholder="30"
                placeholderTextColor={DS.text3}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={ss.sCard}>
            <Text style={ss.sTitle}>CARD DETAILS</Text>
            <View style={ss.field}>
              <Text style={ss.label}>Card Name *</Text>
              <TextInput
                style={ss.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Breakfast Special"
                placeholderTextColor={DS.text3}
              />
            </View>
            <View style={ss.field}>
              <Text style={ss.label}>Description</Text>
              <TextInput
                style={[ss.input, ss.inputMulti]}
                value={description}
                onChangeText={setDesc}
                placeholder="What does this card include?"
                placeholderTextColor={DS.text3}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            <View>
              <Text style={ss.label}>Image URL (optional)</Text>
              <TextInput
                style={ss.input}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://…"
                placeholderTextColor={DS.text3}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>
        </>
      );
    }

    // ── Step 2: Categories ──
    if (step === 2) {
      return (
        <View style={ss.sCard}>
          <Text style={ss.sTitle}>SELECT CATEGORIES *</Text>
          <Text style={ss.hint}>
            Choose the menu categories customers can redeem with this card.
          </Text>

          {categories.length === 0 ? (
            <View style={ss.emptyBox}>
              <Ionicons name="alert-circle-outline" size={20} color={DS.text3} />
              <Text style={ss.emptyText}>
                No active categories. Add categories in Menu first.
              </Text>
            </View>
          ) : (
            <>
              <View style={ss.chipGrid}>
                {categories.map(cat => {
                  const sel = selectedCatIds.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[ss.chip, sel && ss.chipSel]}
                      onPress={() =>
                        setSelCatIds(prev =>
                          prev.includes(cat.id)
                            ? prev.filter(id => id !== cat.id)
                            : [...prev, cat.id],
                        )
                      }
                      activeOpacity={0.75}
                    >
                      {sel && <Ionicons name="checkmark-circle" size={14} color="#fff" />}
                      <Text style={[ss.chipText, sel && ss.chipTextSel]}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedCatIds.length > 0 && (
                <Text style={ss.selNote}>
                  {selectedCatIds.length}{' '}
                  {selectedCatIds.length === 1 ? 'category' : 'categories'} selected
                </Text>
              )}
            </>
          )}
        </View>
      );
    }

    // ── Step 3: Eligible Items ──
    if (step === 3) {
      if (loadingItems) {
        return (
          <View style={ss.center}>
            <ActivityIndicator size="large" color={DS.primary} />
            <Text style={ss.loadingText}>Loading menu items…</Text>
          </View>
        );
      }

      if (catItems.length === 0) {
        return (
          <View style={ss.emptyBox}>
            <Ionicons name="restaurant-outline" size={32} color={DS.text3} />
            <Text style={ss.emptyTitle}>No items in selected categories</Text>
            <Text style={ss.emptyText}>
              Go back and add menu items to these categories first, or choose different categories.
            </Text>
          </View>
        );
      }

      return (
        <>
          <View style={ss.sCard}>
            <View style={ss.searchBar}>
              <Ionicons name="search-outline" size={15} color={DS.text3} />
              <TextInput
                style={ss.searchInput}
                value={itemSearch}
                onChangeText={setItemSearch}
                placeholder="Search items…"
                placeholderTextColor={DS.text3}
              />
              {itemSearch.length > 0 && (
                <TouchableOpacity onPress={() => setItemSearch('')}>
                  <Ionicons name="close-circle" size={15} color={DS.text3} />
                </TouchableOpacity>
              )}
            </View>

            <View style={ss.countRow}>
              <View style={ss.countBadge}>
                <Ionicons name="checkmark-circle" size={14} color={DS.primary} />
                <Text style={ss.countText}>
                  {selectedItemIds.length} item{selectedItemIds.length !== 1 ? 's' : ''} selected
                </Text>
              </View>
              <View style={ss.globalBtns}>
                <TouchableOpacity
                  style={ss.actionBtn}
                  onPress={() => setSelItemIds(catItems.map(i => i.id))}
                >
                  <Text style={ss.actionBtnText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ss.actionBtn, { borderColor: DS.border }]}
                  onPress={() => setSelItemIds([])}
                >
                  <Text style={[ss.actionBtnText, { color: DS.text3 }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectedItemIds.length === 0 && (
              <Text style={ss.selectHint}>Select at least 1 item to continue</Text>
            )}
          </View>

          {groupedItems.length === 0 && searchLow ? (
            <View style={ss.emptyBox}>
              <Text style={ss.emptyText}>No items match "{itemSearch}"</Text>
            </View>
          ) : (
            groupedItems.map(group => (
              <View key={group.cat.id} style={ss.sCard}>
                <View style={ss.catHeader}>
                  <Text style={ss.catName}>{group.cat.name.toUpperCase()}</Text>
                  <View style={ss.catActions}>
                    <TouchableOpacity
                      onPress={() => {
                        const ids = group.items.map(i => i.id);
                        setSelItemIds(prev => Array.from(new Set([...prev, ...ids])));
                      }}
                    >
                      <Text style={ss.catActionText}>All</Text>
                    </TouchableOpacity>
                    <Text style={{ color: DS.text3, marginHorizontal: 4 }}>·</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const ids = group.items.map(i => i.id);
                        setSelItemIds(prev => prev.filter(id => !ids.includes(id)));
                      }}
                    >
                      <Text style={[ss.catActionText, { color: DS.text3 }]}>None</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {group.items.map((item, idx) => {
                  const sel    = selectedItemIds.includes(item.id);
                  const isLast = idx === group.items.length - 1;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[ss.itemRow, !isLast && ss.itemBorder]}
                      onPress={() =>
                        setSelItemIds(prev =>
                          prev.includes(item.id)
                            ? prev.filter(id => id !== item.id)
                            : [...prev, item.id],
                        )
                      }
                      activeOpacity={0.75}
                    >
                      <View style={[ss.checkbox, sel && ss.checkboxSel]}>
                        {sel && <Ionicons name="checkmark" size={11} color="#fff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ss.itemName} numberOfLines={1}>{item.name}</Text>
                        <View style={ss.itemMeta}>
                          <Text style={ss.itemPrice}>₹{item.price}</Text>
                          {item.itemType === 'VEG' && (
                            <Text style={[ss.itemTag, { color: DS.success }]}>Veg</Text>
                          )}
                          {item.itemType === 'NON_VEG' && (
                            <Text style={[ss.itemTag, { color: DS.primary }]}>Non-Veg</Text>
                          )}
                          {item.availabilityStatus === 'OUT_OF_STOCK' && (
                            <Text style={[ss.itemTag, { color: DS.warning }]}>OOS</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </>
      );
    }

    // ── Step 4: Review ──
    const selCatNames = selectedCatIds
      .map(id => categories.find(c => c.id === id)?.name ?? `#${id}`)
      .join(', ');
    const selItemDetails = allItems.filter(i => selectedItemIds.includes(i.id));

    return (
      <>
        <View style={ss.reviewHero}>
          <Text style={ss.reviewName}>{name.trim()}</Text>
          {description.trim() ? (
            <Text style={ss.reviewDesc}>{description.trim()}</Text>
          ) : null}
        </View>

        <View style={ss.sCard}>
          <Text style={ss.sTitle}>PRICING</Text>
          <View style={ss.pricingRow}>
            <View style={ss.pBlock}>
              <Text style={ss.pLabel}>PAY</Text>
              <Text style={ss.pValue}>₹{price}</Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color={DS.text3} />
            <View style={ss.pBlock}>
              <Text style={ss.pLabel}>WALLET</Text>
              <Text style={[ss.pValue, { color: DS.primary }]}>₹{wallet}</Text>
            </View>
            {bonus > 0 && (
              <>
                <Ionicons name="arrow-forward" size={14} color={DS.text3} />
                <View style={ss.reviewBonusPill}>
                  <Text style={ss.reviewBonusText}>+₹{bonus.toFixed(0)} bonus</Text>
                </View>
              </>
            )}
          </View>
          <View style={ss.reviewMeta}>
            <Text style={ss.reviewMetaLabel}>Validity</Text>
            <Text style={ss.reviewMetaValue}>{days} days</Text>
          </View>
        </View>

        <View style={ss.sCard}>
          <Text style={ss.sTitle}>CATEGORIES</Text>
          <Text style={ss.reviewMetaValue}>{selCatNames}</Text>
        </View>

        <View style={ss.sCard}>
          <Text style={ss.sTitle}>ELIGIBLE ITEMS</Text>
          <Text style={[ss.reviewMetaValue, { color: DS.success, marginBottom: selItemDetails.length > 0 ? 10 : 0 }]}>
            {selItemDetails.length} item{selItemDetails.length !== 1 ? 's' : ''} selected
          </Text>
          {selItemDetails.slice(0, 8).map((item, idx) => (
            <View
              key={item.id}
              style={[ss.previewItem, idx < Math.min(selItemDetails.length, 8) - 1 && ss.itemBorder]}
            >
              <Text style={ss.previewItemName} numberOfLines={1}>{item.name}</Text>
              <Text style={ss.previewItemPrice}>₹{item.price}</Text>
            </View>
          ))}
          {selItemDetails.length > 8 && (
            <Text style={ss.moreItems}>+{selItemDetails.length - 8} more items</Text>
          )}
        </View>
      </>
    );
  };

  const canGoNext = step === 1 ? step1Ok : step === 2 ? step2Ok : step === 3 ? step3Ok : false;

  return (
    <KeyboardAvoidingView
      style={ss.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />

      {/* Header */}
      <View style={[ss.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity
          style={ss.headerBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={DS.text} />
        </TouchableOpacity>
        <Text style={ss.headerTitle}>Create Card</Text>
        <View style={ss.headerBtn} />
      </View>

      {/* Progress stepper */}
      <Stepper current={step} />

      {/* Content */}
      <ScrollView
        style={ss.scroll}
        contentContainerStyle={ss.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer navigation */}
      <View style={ss.footer}>
        {step > 1 && (
          <TouchableOpacity style={ss.backBtn} onPress={goBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={15} color={DS.text2} />
            <Text style={ss.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}

        {step < 4 ? (
          <TouchableOpacity
            style={[ss.nextBtn, !canGoNext && ss.nextBtnOff]}
            onPress={goNext}
            disabled={!canGoNext}
            activeOpacity={0.85}
          >
            <Text style={ss.nextBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={15} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[ss.nextBtn, submitting && ss.nextBtnOff]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="card-outline" size={16} color="#fff" />
                <Text style={ss.nextBtnText}>Create Card</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const ss = StyleSheet.create({
  root:   { flex: 1, backgroundColor: DS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: DS.bg, gap: 12 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: DS.surface, paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  headerBtn:   { width: 36, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: DS.text, flex: 1, textAlign: 'center' },

  // Stepper
  stepper: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: DS.surface,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  stepUnit:   { alignItems: 'center' },
  stepDotRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: DS.border, alignItems: 'center', justifyContent: 'center',
  },
  dotDone:          { backgroundColor: DS.success },
  dotActive:        { backgroundColor: DS.primary },
  dotNum:           { fontSize: 11, fontWeight: '700', color: DS.text3 },
  stepLine:         { flex: 1, height: 2, backgroundColor: DS.border, marginHorizontal: 3 },
  lineDone:         { backgroundColor: DS.success },
  stepLabel:        { fontSize: 10, fontWeight: '600', color: DS.text3, marginTop: 5, textAlign: 'center' },
  stepLabelActive:  { color: DS.primary, fontWeight: '700' },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  // Section card
  sCard: {
    backgroundColor: DS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: DS.border,
    padding: 16, marginBottom: 14,
  },
  sTitle: {
    fontSize: 11, fontWeight: '700', color: DS.text3,
    letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase',
  },
  hint:  { fontSize: 13, color: DS.text2, marginBottom: 14, lineHeight: 19 },
  row:   { flexDirection: 'row', gap: 12, marginBottom: 14 },
  field: { marginBottom: 14 },

  // Inputs
  label: { fontSize: 12, fontWeight: '600', color: DS.text2, marginBottom: 7 },
  input: {
    backgroundColor: DS.bg, borderWidth: 1, borderColor: DS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: DS.text,
  },
  inputErr:   { borderColor: DS.primary },
  inputMulti: { height: 80, paddingTop: 12, textAlignVertical: 'top' },

  // Bonus banner
  bonusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 14 },
  bonusOk:     { backgroundColor: DS.successSoft },
  bonusErr:    { backgroundColor: DS.primarySoft },
  bonusText:   { fontSize: 13, fontWeight: '600', flex: 1 },

  // Category chips
  chipGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: DS.border, backgroundColor: DS.bg,
  },
  chipSel:     { backgroundColor: DS.primary, borderColor: DS.primary },
  chipText:    { fontSize: 14, color: DS.text2, fontWeight: '500' },
  chipTextSel: { color: '#fff', fontWeight: '700' },
  selNote:     { fontSize: 12, color: DS.text3, marginTop: 12 },

  // Step 3 — search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: DS.bg, borderRadius: 10, borderWidth: 1, borderColor: DS.border,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: DS.text, padding: 0 },

  // Step 3 — count row
  countRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countText:  { fontSize: 13, fontWeight: '700', color: DS.primary },
  globalBtns: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: DS.primary,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: DS.primary },
  selectHint:    { fontSize: 12, color: DS.text3, marginTop: 8 },

  // Step 3 — category group header
  catHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  catName:       { fontSize: 11, fontWeight: '700', color: DS.text3, letterSpacing: 0.5 },
  catActions:    { flexDirection: 'row', alignItems: 'center' },
  catActionText: { fontSize: 13, fontWeight: '600', color: DS.primary },

  // Step 3 — item rows
  itemRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: DS.border },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: DS.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxSel: { backgroundColor: DS.primary, borderColor: DS.primary },
  itemName:    { fontSize: 14, fontWeight: '600', color: DS.text, marginBottom: 3 },
  itemMeta:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemPrice:   { fontSize: 13, fontWeight: '700', color: DS.text2 },
  itemTag:     { fontSize: 11, fontWeight: '600' },

  // Step 4 — Review
  reviewHero: {
    backgroundColor: DS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: DS.border,
    padding: 20, marginBottom: 14, alignItems: 'center',
  },
  reviewName:       { fontSize: 20, fontWeight: '800', color: DS.text, textAlign: 'center' },
  reviewDesc:       { fontSize: 13, color: DS.text2, textAlign: 'center', marginTop: 6 },
  pricingRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  pBlock:           { alignItems: 'center' },
  pLabel:           { fontSize: 9, fontWeight: '700', color: DS.text3, letterSpacing: 0.5, marginBottom: 2 },
  pValue:           { fontSize: 18, fontWeight: '800', color: DS.text },
  reviewBonusPill:  { backgroundColor: DS.primarySoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  reviewBonusText:  { fontSize: 12, fontWeight: '700', color: DS.primary },
  reviewMeta:       { flexDirection: 'row', justifyContent: 'space-between' },
  reviewMetaLabel:  { fontSize: 14, color: DS.text2 },
  reviewMetaValue:  { fontSize: 14, fontWeight: '600', color: DS.text },
  previewItem:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, alignItems: 'center' },
  previewItemName:  { fontSize: 13, color: DS.text, flex: 1 },
  previewItemPrice: { fontSize: 13, fontWeight: '600', color: DS.text2 },
  moreItems:        { fontSize: 12, color: DS.text3, marginTop: 6 },

  // Empty states
  emptyBox:   { alignItems: 'center', padding: 24, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: DS.text2 },
  emptyText:  { fontSize: 13, color: DS.text3, textAlign: 'center', lineHeight: 19 },

  // Error / loading
  errorTitle:       { fontSize: 16, fontWeight: '700', color: DS.text },
  errorBody:        { fontSize: 13, color: DS.text2, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
  retryBtn:         { backgroundColor: DS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText:        { fontSize: 14, fontWeight: '700', color: '#fff' },
  secondaryBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11, borderWidth: 1.5, borderColor: DS.border },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: DS.text2 },
  loadingText:      { fontSize: 14, color: DS.text2 },

  // Footer
  footer: {
    flexDirection: 'row', gap: 10,
    padding: 16, paddingBottom: 28,
    backgroundColor: DS.surface, borderTopWidth: 1, borderTopColor: DS.border,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: DS.border,
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: DS.text2 },
  nextBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary, borderRadius: 14, paddingVertical: 15,
  },
  nextBtnOff:  { opacity: 0.4 },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
