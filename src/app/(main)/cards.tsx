import { useState, useCallback } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  StatusBar, FlatList, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyCards } from '../../modules/cards/services/cardService';
import { getCardAccent } from '../../modules/cards/cardVisuals';
import type { CardDefinitionResponse } from '../../modules/cards/types/card.types';

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

type FilterType = 'all' | 'active' | 'inactive';

// ─── Skeleton loader ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonTop}>
        <View style={[styles.skLine, { width: 40, height: 40, borderRadius: 12 }]} />
        <View style={[styles.skLine, { flex: 1, height: 16, marginLeft: 12 }]} />
        <View style={[styles.skLine, { width: 60, height: 22, borderRadius: 11 }]} />
      </View>
      <View style={[styles.skLine, { height: 52, borderRadius: 10, marginTop: 14 }]} />
      <View style={styles.skeletonFooter}>
        <View style={[styles.skLine, { width: 70, height: 22, borderRadius: 8 }]} />
        <View style={[styles.skLine, { width: 90, height: 22, borderRadius: 8 }]} />
      </View>
    </View>
  );
}

// ─── Card row ────────────────────────────────────────────────────────
// Flat, single-color card fill per card (getCardAccent) — solid, no
// gradient blend — so cards read as colorful but clean rather than busy.
function CardRow({ card, onPress }: { card: CardDefinitionResponse; onPress: () => void }) {
  const bonus    = card.walletAmount - card.cardPrice;
  const isActive = card.isActive;
  const accent   = getCardAccent(card.id);

  return (
    <TouchableOpacity style={styles.cardShadowWrap} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.card, { backgroundColor: accent }]}>
        {/* Name + status */}
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1} ellipsizeMode="tail">
            {card.name}
          </Text>
          <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
            <View style={[styles.badgeDot, { backgroundColor: isActive ? '#86EFAC' : 'rgba(255,255,255,0.55)' }]} />
            <Text style={styles.badgeText}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Pricing row */}
        <View style={styles.pricingRow}>
          <View style={styles.pricingBlock}>
            <Text style={styles.pricingLabel}>PRICE</Text>
            <Text style={styles.pricingValue}>₹{card.cardPrice}</Text>
          </View>
          <Ionicons name="arrow-forward" size={13} color="rgba(255,255,255,0.6)" />
          <View style={styles.pricingBlock}>
            <Text style={styles.pricingLabel}>WALLET</Text>
            <Text style={[styles.pricingValue, styles.pricingValueAccent]}>₹{card.walletAmount}</Text>
          </View>
          {bonus > 0 && (
            <>
              <Ionicons name="arrow-forward" size={13} color="rgba(255,255,255,0.6)" />
              <View style={styles.bonusPill}>
                <Text style={styles.bonusText}>+₹{bonus} bonus</Text>
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerChip}>
            <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.9)" />
            <Text style={styles.footerChipText}>{card.validityInDays} days</Text>
          </View>
          <View style={styles.footerChip}>
            <Ionicons name="list-outline" size={11} color="rgba(255,255,255,0.9)" />
            <Text style={styles.footerChipText}>
              {card.categoryIds.length} {card.categoryIds.length === 1 ? 'category' : 'categories'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.75)" style={{ marginLeft: 'auto' }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────
export default function CardsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [cards, setCards]           = useState<CardDefinitionResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<FilterType>('all');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getMyCards();
      setCards(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load cards.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = cards.filter(c => {
    if (filter === 'active')   return c.isActive;
    if (filter === 'inactive') return !c.isActive;
    return true;
  });
  const activeCount   = cards.filter(c => c.isActive).length;
  const inactiveCount = cards.filter(c => !c.isActive).length;

  const FILTERS: { key: FilterType; label: string; count: number }[] = [
    { key: 'all',      label: 'All',      count: cards.length  },
    { key: 'active',   label: 'Active',   count: activeCount   },
    { key: 'inactive', label: 'Inactive', count: inactiveCount },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={DS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cards</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/(main)/card-create')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={17} color="#fff" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      {!loading && !error && (
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
              {f.count > 0 && (
                <View style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, filter === f.key && styles.filterCountTextActive]}>
                    {f.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.listContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={44} color={DS.text3} />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()} activeOpacity={0.85}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              colors={[DS.primary]}
              tintColor={DS.primary}
            />
          }
          ListHeaderComponent={
            cards.length > 0 ? (
              <Text style={styles.listMeta}>
                {filtered.length} {filtered.length === 1 ? 'card' : 'cards'}
                {filter === 'all' ? ` · ${activeCount} active` : ''}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            cards.length === 0 ? (
              // True empty — no cards created yet
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="card-outline" size={36} color={DS.primary} />
                </View>
                <Text style={styles.emptyTitle}>No cards yet</Text>
                <Text style={styles.emptySub}>
                  Create your first loyalty card so customers can subscribe and redeem at your store.
                </Text>
                <TouchableOpacity
                  style={styles.emptyCreateBtn}
                  onPress={() => router.push('/(main)/card-create')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle-outline" size={17} color="#fff" />
                  <Text style={styles.emptyCreateBtnText}>Create First Card</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Filter empty — cards exist but none match filter
              <View style={styles.filterEmptyWrap}>
                <Ionicons name="filter-outline" size={32} color={DS.text3} />
                <Text style={styles.filterEmptyText}>
                  No {filter} cards
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <CardRow
              card={item}
              onPress={() =>
                router.push({ pathname: '/(main)/card-detail', params: { id: String(item.id) } })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: DS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: DS.surface,
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: DS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: DS.text, flex: 1, textAlign: 'center' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: DS.primary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  createBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Filter chips
  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: DS.surface,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: DS.border, backgroundColor: DS.bg,
  },
  filterChipActive:     { backgroundColor: DS.primary, borderColor: DS.primary },
  filterChipText:       { fontSize: 13, fontWeight: '600', color: DS.text2 },
  filterChipTextActive: { color: '#fff' },
  filterCount: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: DS.border, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCountActive:     { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText:       { fontSize: 10, fontWeight: '700', color: DS.text2 },
  filterCountTextActive: { color: '#fff' },

  // List
  listContent: { padding: 16, paddingBottom: 32 },
  listMeta:    { fontSize: 12, color: DS.text3, marginBottom: 12, marginLeft: 2 },

  // Card — modern neutral surface; per-card accent is a thin bar + icon
  // chip color (getCardAccent), not a full-bleed background.
  cardShadowWrap: {
    borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  card: {
    borderRadius: 16, padding: 18, overflow: 'hidden',
  },

  skeletonCard: {
    backgroundColor: DS.surface, borderWidth: 1, borderColor: DS.border,
    borderRadius: 16, padding: 16, marginBottom: 12,
  },
  skeletonTop:    { flexDirection: 'row', alignItems: 'center' },
  skeletonFooter: { flexDirection: 'row', gap: 8, marginTop: 14 },

  cardTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14, gap: 10,
  },
  cardName:  { fontSize: 17, fontWeight: '800', color: '#fff', flex: 1 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0,
  },
  badgeActive:   { backgroundColor: 'rgba(255,255,255,0.22)' },
  badgeInactive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  badgeDot:      { width: 6, height: 6, borderRadius: 3 },
  badgeText:     { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Pricing row
  pricingRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 12,
    padding: 12, marginBottom: 12, gap: 8,
  },
  pricingBlock:  { alignItems: 'center' },
  pricingLabel:  { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5, marginBottom: 3 },
  pricingValue:  { fontSize: 16, fontWeight: '800', color: '#fff' },
  pricingValueAccent: { color: '#FFE9B3' },
  bonusPill:     { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  bonusText:     { fontSize: 12, fontWeight: '700', color: '#FFE9B3' },

  // Footer chips
  cardFooter:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  footerChipText: { fontSize: 12, color: 'rgba(255,255,255,0.95)', fontWeight: '600' },

  // Empty — no cards at all
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingTop: 80, gap: 12,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: DS.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle:    { fontSize: 18, fontWeight: '800', color: DS.text },
  emptySub:      { fontSize: 14, color: DS.text2, textAlign: 'center', lineHeight: 21 },
  emptyCreateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: DS.primary, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 13, marginTop: 8,
  },
  emptyCreateBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Empty — filter returned zero
  filterEmptyWrap: {
    alignItems: 'center', paddingTop: 60, gap: 10,
  },
  filterEmptyText: { fontSize: 14, color: DS.text3, fontWeight: '500' },

  // Error
  errorTitle: { fontSize: 16, fontWeight: '700', color: DS.text },
  errorText:  { fontSize: 13, color: DS.text2, textAlign: 'center' },
  retryBtn:   { backgroundColor: DS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Skeleton
  skLine: { backgroundColor: '#E8EAED', borderRadius: 8 },
});
