import { useState, useCallback } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getCard,
  updateCard,
  deactivateCard,
  getCardPreview,
} from '../../modules/cards/services/cardService';
import { getCardAccent } from '../../modules/cards/cardVisuals';
import VegNonVegBadge from '../../modules/menu/components/VegNonVegBadge';
import type {
  CardDefinitionResponse,
  UpdateCardRequest,
  CardPreviewResponse,
} from '../../modules/cards/types/card.types';

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function CardDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardId = parseInt(id ?? '0', 10);

  const [card, setCard]       = useState<CardDefinitionResponse | null>(null);
  const [preview, setPreview] = useState<CardPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [toggling, setToggling] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());

  const toggleCategory = (categoryId: number) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  // Edit form state (initialised when entering edit mode)
  const [editName, setEditName]       = useState('');
  const [editDesc, setEditDesc]       = useState('');
  const [editPrice, setEditPrice]     = useState('');
  const [editWallet, setEditWallet]   = useState('');
  const [editDays, setEditDays]       = useState('');

  const loadCard = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    try {
      const [cardResult, previewResult] = await Promise.allSettled([
        getCard(cardId),
        getCardPreview(cardId),
      ]);
      if (cardResult.status === 'rejected') {
        Alert.alert('Error', cardResult.reason?.message ?? 'Failed to load card.', [
          { text: 'Go Back', onPress: () => router.back() },
        ]);
        return;
      }
      setCard(cardResult.value);
      if (previewResult.status === 'fulfilled') setPreview(previewResult.value);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useFocusEffect(useCallback(() => { loadCard(); }, [loadCard]));

  const enterEditMode = () => {
    if (!card) return;
    setEditName(card.name);
    setEditDesc(card.description ?? '');
    setEditPrice(String(card.cardPrice));
    setEditWallet(String(card.walletAmount));
    setEditDays(String(card.validityInDays));
    setEditing(true);
  };

  const handleSave = async () => {
    if (!card) return;
    const price  = parseFloat(editPrice)  || 0;
    const wallet = parseFloat(editWallet) || 0;
    const days   = parseInt(editDays, 10) || 0;

    if (!editName.trim()) { Alert.alert('Validation', 'Card name is required.'); return; }
    if (price <= 0)        { Alert.alert('Validation', 'Card price must be greater than 0.'); return; }
    if (wallet <= price)   { Alert.alert('Validation', 'Wallet value must exceed card price.'); return; }
    if (days <= 0)         { Alert.alert('Validation', 'Validity must be at least 1 day.'); return; }

    const payload: UpdateCardRequest = {
      name:           editName.trim(),
      description:    editDesc.trim() || undefined,
      cardPrice:      price,
      walletAmount:   wallet,
      validityInDays: days,
    };

    setSaving(true);
    try {
      const updated = await updateCard(card.id, payload);
      setCard(updated);
      setEditing(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = () => {
    if (!card) return;
    const action = card.isActive ? 'deactivate' : 'reactivate';
    const msg = card.isActive
      ? 'Deactivating this card will prevent new subscriptions. Existing subscriptions remain valid.'
      : 'Reactivating this card will allow new subscriptions.';

    Alert.alert(
      card.isActive ? 'Deactivate Card' : 'Reactivate Card',
      msg,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: card.isActive ? 'Deactivate' : 'Reactivate',
          style: card.isActive ? 'destructive' : 'default',
          onPress: async () => {
            setToggling(true);
            try {
              if (card.isActive) {
                await deactivateCard(card.id);
              } else {
                await updateCard(card.id, { isActive: true });
              }
              await loadCard();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? `Failed to ${action} card.`);
            } finally {
              setToggling(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={DS.primary} />
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Card not found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bonusAmt = card.walletAmount - card.cardPrice;
  const accent    = getCardAccent(card.id);
  const editWalletNum = parseFloat(editWallet) || 0;
  const editPriceNum  = parseFloat(editPrice)  || 0;
  const editBonus     = editWalletNum - editPriceNum;
  const editBonusValid = editWalletNum > editPriceNum;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (editing) { setEditing(false); return; }
            router.back();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={editing ? 'close' : 'arrow-back'} size={22} color={DS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {editing ? 'Edit Card' : card.name}
        </Text>
        {editing ? (
          <View style={styles.backBtn} />
        ) : (
          <TouchableOpacity
            style={styles.editHeaderBtn}
            onPress={enterEditMode}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={20} color={DS.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── View Mode ── */}
        {!editing && (
          <>
            {/* Status banner */}
            <View style={[styles.statusBanner, card.isActive ? styles.statusBannerActive : styles.statusBannerInactive]}>
              <View style={[styles.statusDot, { backgroundColor: card.isActive ? DS.success : DS.text3 }]} />
              <Text style={[styles.statusBannerText, { color: card.isActive ? DS.success : DS.text2 }]}>
                {card.isActive ? 'Active — accepting new subscriptions' : 'Inactive — not accepting subscriptions'}
              </Text>
            </View>

            {/* Pricing hero — flat solid fill (getCardAccent) matching this
                card's color in My Cards, for visual continuity */}
            <View style={[styles.heroCard, { backgroundColor: accent }]}>
              <View style={styles.heroRow}>
                <View style={styles.heroBlock}>
                  <Text style={styles.heroLabel}>CARD PRICE</Text>
                  <Text style={styles.heroPrice}>₹{card.cardPrice}</Text>
                </View>
                <View style={styles.heroArrow}>
                  <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.55)" />
                </View>
                <View style={styles.heroBlock}>
                  <Text style={styles.heroLabel}>WALLET VALUE</Text>
                  <Text style={[styles.heroPrice, styles.heroPriceAccent]}>₹{card.walletAmount}</Text>
                </View>
              </View>
              {bonusAmt > 0 && (
                <View style={styles.bonusPill}>
                  <Ionicons name="trending-up-outline" size={14} color="#fff" />
                  <Text style={styles.bonusPillText}>Customer saves ₹{bonusAmt}</Text>
                </View>
              )}
            </View>

            {/* Details card */}
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>CARD INFO</Text>
              <InfoRow label="Validity"    value={`${card.validityInDays} days`} />
              <View style={styles.infoDivider} />
              <InfoRow label="Categories"  value={`${card.categoryIds.length} selected`} />
              <View style={styles.infoDivider} />
              <InfoRow
                label="Created"
                value={new Date(card.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              />
              {card.description && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <Text style={[styles.infoValue, styles.infoValueDesc]}>{card.description}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Eligible menu — categories collapsed by default so a card with
                many categories reads as a short overview, not a wall of
                items; tap a category to see what's in it */}
            {preview && preview.eligibleMenus.length > 0 && (
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>ELIGIBLE MENU</Text>
                <Text style={styles.menuSummary}>
                  {preview.eligibleMenus.reduce((sum, c) => sum + c.items.length, 0)} items across{' '}
                  {preview.eligibleMenus.length} {preview.eligibleMenus.length === 1 ? 'category' : 'categories'}
                </Text>
                {preview.eligibleMenus.map((menuCat, mIdx) => {
                  const isOpen = expandedCats.has(menuCat.categoryId);
                  return (
                    <View key={menuCat.categoryId}>
                      {mIdx > 0 && <View style={styles.infoDivider} />}
                      <TouchableOpacity
                        style={styles.menuCatRow}
                        onPress={() => toggleCategory(menuCat.categoryId)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.menuCatLeft}>
                          <Ionicons
                            name={isOpen ? 'chevron-down' : 'chevron-forward'}
                            size={16}
                            color={DS.text3}
                          />
                          <Text style={styles.menuCatName}>{menuCat.categoryName}</Text>
                        </View>
                        <Text style={styles.menuCatCount}>{menuCat.items.length} items</Text>
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={styles.menuItemsWrap}>
                          {menuCat.items.map(item => (
                            <View key={item.itemId} style={styles.menuItemRow}>
                              <VegNonVegBadge type={item.itemType} size={13} />
                              <Text style={styles.menuItemName} numberOfLines={1}>{item.name}</Text>
                              <Text style={styles.menuItemPrice}>₹{item.price}</Text>
                              {item.availabilityStatus === 'OUT_OF_STOCK' && (
                                <View style={styles.oosBadge}>
                                  <Text style={styles.oosText}>OOS</Text>
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Toggle active */}
            <TouchableOpacity
              style={[styles.toggleBtn, card.isActive ? styles.toggleBtnDeactivate : styles.toggleBtnActivate]}
              onPress={handleToggleActive}
              disabled={toggling}
              activeOpacity={0.8}
            >
              {toggling ? (
                <ActivityIndicator size="small" color={card.isActive ? DS.primary : DS.success} />
              ) : (
                <>
                  <Ionicons
                    name={card.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={18}
                    color={card.isActive ? DS.primary : DS.success}
                  />
                  <Text style={[styles.toggleBtnText, { color: card.isActive ? DS.primary : DS.success }]}>
                    {card.isActive ? 'Deactivate Card' : 'Reactivate Card'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── Edit Mode ── */}
        {editing && (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>PRICING</Text>

              <View style={styles.pricingGrid}>
                <View style={styles.pricingField}>
                  <Text style={styles.fieldLabel}>Card Price (₹) *</Text>
                  <TextInput
                    style={styles.input}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="numeric"
                    placeholderTextColor={DS.text3}
                  />
                </View>
                <View style={styles.pricingField}>
                  <Text style={styles.fieldLabel}>Wallet Value (₹) *</Text>
                  <TextInput
                    style={[styles.input, editWalletNum > 0 && !editBonusValid && styles.inputError]}
                    value={editWallet}
                    onChangeText={setEditWallet}
                    keyboardType="numeric"
                    placeholderTextColor={DS.text3}
                  />
                </View>
              </View>

              {editPriceNum > 0 && editWalletNum > 0 && (
                <View style={[styles.bonusPreview, editBonusValid ? styles.bonusPreviewOk : styles.bonusPreviewErr]}>
                  <Ionicons
                    name={editBonusValid ? 'trending-up-outline' : 'warning-outline'}
                    size={15}
                    color={editBonusValid ? DS.success : DS.primary}
                  />
                  <Text style={[styles.bonusPreviewText, { color: editBonusValid ? DS.success : DS.primary }]}>
                    {editBonusValid
                      ? `Customer gets +₹${editBonus.toFixed(0)} bonus`
                      : 'Wallet value must exceed card price'}
                  </Text>
                </View>
              )}

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Validity (days) *</Text>
                <TextInput
                  style={styles.input}
                  value={editDays}
                  onChangeText={setEditDays}
                  keyboardType="numeric"
                  placeholderTextColor={DS.text3}
                />
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>CARD DETAILS</Text>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Card Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholderTextColor={DS.text3}
                />
              </View>

              <View style={styles.fieldWrapLast}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={editDesc}
                  onChangeText={setEditDesc}
                  placeholder="Optional description…"
                  placeholderTextColor={DS.text3}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Edit footer */}
      {editing && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setEditing(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: DS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: DS.bg, gap: 12 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: DS.surface,
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  backBtn:       { width: 36, alignItems: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: DS.text, flex: 1, textAlign: 'center' },
  editHeaderBtn: { width: 36, alignItems: 'center' },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  // Status banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1,
  },
  statusBannerActive:   { backgroundColor: DS.successSoft, borderColor: DS.success + '33' },
  statusBannerInactive: { backgroundColor: DS.bg, borderColor: DS.border },
  statusDot:            { width: 8, height: 8, borderRadius: 4 },
  statusBannerText:     { fontSize: 13, fontWeight: '600', flex: 1 },

  // Hero pricing card — flat solid fill (per-card accent, getCardAccent)
  heroCard: {
    borderRadius: 18, overflow: 'hidden',
    padding: 20, marginBottom: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  heroBlock:  { alignItems: 'center', flex: 1 },
  heroArrow:  { alignItems: 'center' },
  heroLabel:  { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.8, marginBottom: 6 },
  heroPrice:  { fontSize: 28, fontWeight: '900', color: '#fff' },
  heroPriceAccent: { color: '#FFE9B3' },
  bonusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  bonusPillText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Detail card
  detailCard: {
    backgroundColor: DS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: DS.border,
    padding: 16, marginBottom: 16,
  },
  detailCardTitle: {
    fontSize: 11, fontWeight: '700', color: DS.text3,
    letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingVertical: 11, gap: 16,
  },
  infoDivider: { height: 1, backgroundColor: DS.border },
  infoLabel:   { fontSize: 14, color: DS.text2 },
  infoValue:   { fontSize: 14, fontWeight: '600', color: DS.text, textAlign: 'right', flex: 1 },
  infoValueDesc: { fontWeight: '400', color: DS.text2 },

  // Toggle active button
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 15,
    borderWidth: 1.5,
  },
  toggleBtnDeactivate: { borderColor: DS.primary + '44', backgroundColor: DS.primarySoft },
  toggleBtnActivate:   { borderColor: DS.success   + '44', backgroundColor: DS.successSoft  },
  toggleBtnText:       { fontSize: 15, fontWeight: '700' },

  // Edit mode — Section card
  sectionCard: {
    backgroundColor: DS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: DS.border,
    padding: 16, marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: DS.text3,
    letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase',
  },
  pricingGrid:  { flexDirection: 'row', gap: 12, marginBottom: 14 },
  pricingField: { flex: 1 },

  bonusPreview:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 11, marginBottom: 14 },
  bonusPreviewOk:  { backgroundColor: DS.successSoft },
  bonusPreviewErr: { backgroundColor: DS.primarySoft },
  bonusPreviewText:{ fontSize: 13, fontWeight: '600', flex: 1 },

  fieldWrap:     { marginBottom: 14 },
  fieldWrapLast: { marginBottom: 0 },
  fieldLabel:    { fontSize: 12, fontWeight: '600', color: DS.text2, marginBottom: 7 },
  input: {
    backgroundColor: DS.bg, borderWidth: 1, borderColor: DS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: DS.text,
  },
  inputError:     { borderColor: DS.primary },
  inputMultiline: { height: 80, paddingTop: 12, textAlignVertical: 'top' },

  // Edit footer
  footer: {
    flexDirection: 'row', gap: 12,
    padding: 16, paddingBottom: 28,
    backgroundColor: DS.surface,
    borderTopWidth: 1, borderTopColor: DS.border,
  },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 15,
    borderWidth: 1.5, borderColor: DS.border,
  },
  cancelBtnText:   { fontSize: 15, fontWeight: '600', color: DS.text2 },
  saveBtn: {
    flex: 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: DS.primary, borderRadius: 14, paddingVertical: 15,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Eligible menu section
  menuSummary:  { fontSize: 12, color: DS.text3, marginTop: -6, marginBottom: 10 },
  menuCatRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  menuCatLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  menuCatName:  { fontSize: 14, fontWeight: '700', color: DS.text },
  menuCatCount: { fontSize: 12, color: DS.text3, fontWeight: '500' },
  menuItemsWrap: {
    borderLeftWidth: 2, borderLeftColor: DS.border,
    marginLeft: 7, paddingLeft: 13, marginBottom: 6,
  },
  menuItemRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  menuItemName: { flex: 1, fontSize: 13, color: DS.text2 },
  menuItemPrice:{ fontSize: 13, fontWeight: '600', color: DS.text2 },
  oosBadge:     { backgroundColor: '#FFFBEB', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  oosText:      { fontSize: 10, fontWeight: '700', color: DS.warning },

  // Error
  errorText:  { fontSize: 14, color: DS.text2 },
  retryBtn:   { backgroundColor: DS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
});
