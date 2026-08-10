import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, StatusBar, TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyCoupons } from '../../modules/coupon/services/couponService';
import type { CouponResponse } from '../../modules/coupon/types/coupon.types';

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  primarySoft: '#FFF0EE',
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

type Filter = 'all' | 'active' | 'expired' | 'inactive';

function isExpired(coupon: CouponResponse) {
  return new Date(coupon.validUntil).getTime() < Date.now();
}

function couponState(coupon: CouponResponse): 'active' | 'expired' | 'inactive' {
  if (!coupon.isActive) return 'inactive';
  if (isExpired(coupon)) return 'expired';
  return 'active';
}

function stateStyle(state: 'active' | 'expired' | 'inactive') {
  if (state === 'active')   return { bg: DS.successSoft, fg: DS.success, label: 'Active' };
  if (state === 'expired')  return { bg: DS.warningSoft, fg: DS.warning, label: 'Expired' };
  return { bg: DS.errorSoft, fg: DS.error, label: 'Inactive' };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDiscount(c: CouponResponse) {
  if (c.discountType === 'PERCENTAGE') {
    const cap = c.maxDiscountAmount != null ? ` (up to ₹${c.maxDiscountAmount})` : '';
    return `${c.discountValue}% off${cap}`;
  }
  return `₹${c.discountValue} off`;
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8EAED' }} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ width: '60%', height: 13, borderRadius: 6, backgroundColor: '#E8EAED' }} />
          <View style={{ width: '40%', height: 10, borderRadius: 6, backgroundColor: '#E8EAED' }} />
        </View>
        <View style={{ width: 60, height: 22, borderRadius: 11, backgroundColor: '#E8EAED' }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, height: 10, borderRadius: 6, backgroundColor: '#E8EAED' }} />
        <View style={{ flex: 1, height: 10, borderRadius: 6, backgroundColor: '#E8EAED' }} />
      </View>
    </View>
  );
}

function CouponCard({ item }: { item: CouponResponse }) {
  const sc = stateStyle(couponState(item));
  const usage = item.maxUses != null ? `${item.usedCount} / ${item.maxUses} used` : `${item.usedCount} used (unlimited)`;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Ionicons name="pricetag-outline" size={20} color={DS.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardCode} numberOfLines={1}>{item.code}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{item.title}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <View style={[styles.dot, { backgroundColor: sc.fg }]} />
          <Text style={[styles.statusText, { color: sc.fg }]}>{sc.label}</Text>
        </View>
      </View>

      <View style={styles.discountRow}>
        <Text style={styles.discountText}>{formatDiscount(item)}</Text>
        {item.minPurchaseAmount != null && (
          <Text style={styles.discountCaveat}>Min. purchase ₹{item.minPurchaseAmount}</Text>
        )}
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="people-outline" size={13} color={DS.text3} />
          <Text style={styles.metaLabel}>Usage</Text>
          <Text style={styles.metaValue}>{usage}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={DS.text3} />
          <Text style={styles.metaLabel}>Valid Until</Text>
          <Text style={[styles.metaValue, isExpired(item) && { color: DS.warning }]}>
            {formatDate(item.validUntil)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function MyCouponsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [coupons, setCoupons]       = useState<CouponResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<Filter>('all');
  const [search, setSearch]         = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const list = await getMyCoupons();
      setCoupons(list);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load coupons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = coupons.filter(c => {
    const matchFilter = filter === 'all' || couponState(c) === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || c.code.toLowerCase().includes(q)
      || c.title.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const countFor = (f: Filter) =>
    f === 'all' ? coupons.length : coupons.filter(c => couponState(c) === f).length;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'active',   label: 'Active'   },
    { key: 'expired',  label: 'Expired'  },
    { key: 'inactive', label: 'Inactive' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={DS.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.pageTitle}>My Coupons</Text>
            <Text style={styles.pageSubtitle}>{coupons.length} total</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={15} color={DS.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by code or title…"
            placeholderTextColor={DS.text3}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={15} color={DS.text3} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
              <Text style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
                {countFor(f.key)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            colors={[DS.primary]}
            tintColor={DS.primary}
          />
        }
        renderItem={({ item }) => <CouponCard item={item} />}
        ListHeaderComponent={loading ? (
          <View style={{ paddingTop: 8 }}>
            {Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </View>
        ) : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              {error ? (
                <>
                  <Ionicons name="cloud-offline-outline" size={48} color={DS.text3} />
                  <Text style={styles.emptyTitle}>Could not load coupons</Text>
                  <Text style={styles.emptyDesc}>{error}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons name="pricetag-outline" size={48} color={DS.text3} />
                  <Text style={styles.emptyTitle}>No coupons found</Text>
                  <Text style={styles.emptyDesc}>
                    {search ? 'Try a different search' : 'Coupons created for you by the admin will appear here'}
                  </Text>
                </>
              )}
            </View>
          ) : null
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.bg },

  header: {
    backgroundColor: DS.surface, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: DS.bg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: DS.border,
  },
  headerText:   { flex: 1 },
  pageTitle:    { fontSize: 20, fontWeight: '800', color: DS.text },
  pageSubtitle: { fontSize: 13, color: DS.text3, marginTop: 2 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: DS.bg, borderRadius: 12, borderWidth: 1, borderColor: DS.border,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: DS.text, padding: 0 },

  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: DS.border, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  filterChipActive:  { backgroundColor: DS.primary, borderColor: DS.primary },
  filterText:        { fontSize: 13, fontWeight: '600', color: DS.text2 },
  filterTextActive:  { color: '#fff' },
  filterCount:       { fontSize: 12, fontWeight: '700', color: DS.text3 },
  filterCountActive: { color: 'rgba(255,255,255,0.8)' },

  listContent: { paddingHorizontal: 16, paddingTop: 16, flexGrow: 1 },

  card: {
    backgroundColor: DS.surface, borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: DS.border,
  },
  cardTop:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: DS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardCode: { fontSize: 15, fontWeight: '700', color: DS.text, letterSpacing: 0.3 },
  cardSub:  { fontSize: 12, color: DS.text3, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5,
  },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  discountRow: { marginBottom: 12 },
  discountText: { fontSize: 14, fontWeight: '700', color: DS.primary },
  discountCaveat: { fontSize: 11, color: DS.text3, marginTop: 2 },

  cardMeta:   { flexDirection: 'row', alignItems: 'center' },
  metaItem:   { flex: 1, alignItems: 'center', gap: 3 },
  metaLabel:  { fontSize: 10, color: DS.text3, fontWeight: '500' },
  metaValue:  { fontSize: 13, fontWeight: '700', color: DS.text },
  metaDivider:{ width: 1, height: 32, backgroundColor: DS.border },

  emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: DS.text2 },
  emptyDesc:  { fontSize: 13, color: DS.text3, textAlign: 'center' },
  retryBtn:   { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: DS.primary },
  retryText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
});
