import { useState, useCallback } from 'react';
import {
  View, TouchableOpacity, FlatList, Modal, ScrollView,
  StyleSheet, StatusBar, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStoreSubscriptions } from '../../modules/cards/services/cardService';
import type { SubscriptionResponse, SubscriptionStatus } from '../../modules/cards/types/card.types';
import axiosInstance from '../../core/api/axiosInstance';
import endpoints from '../../core/api/endpoints';
import { getUserMessage } from '../../core/api/errorMessage';

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

type Filter = 'all' | SubscriptionStatus;

function statusStyle(s: SubscriptionStatus) {
  if (s === 'ACTIVE')     return { bg: DS.successSoft, fg: DS.success };
  if (s === 'EXPIRED')    return { bg: DS.warningSoft, fg: DS.warning };
  if (s === 'EXHAUSTED')  return { bg: DS.primarySoft, fg: DS.primary };
  if (s === 'CANCELLED')  return { bg: DS.errorSoft,   fg: DS.error   };
  return { bg: DS.bg, fg: DS.text3 };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function daysUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

// One label + color per subscription state, so the vendor can tell at a glance whether
// a card needs attention — urgency escalates as an ACTIVE card nears its expiry date.
function expiryInfo(item: SubscriptionResponse) {
  if (item.status === 'CANCELLED') {
    return { label: 'Cancelled', color: DS.text3, urgent: false };
  }
  if (item.status === 'EXHAUSTED') {
    return { label: 'Balance exhausted', color: DS.primary, urgent: false };
  }
  const days = daysUntil(item.expiresAt);
  if (item.status === 'EXPIRED' || days < 0) {
    return { label: days < 0 ? `Expired ${Math.abs(days)}d ago` : 'Expired', color: DS.error, urgent: true };
  }
  if (days === 0) return { label: 'Expires today', color: DS.error, urgent: true };
  if (days <= 3)  return { label: `${days} day${days === 1 ? '' : 's'} left`, color: DS.error, urgent: true };
  if (days <= 7)  return { label: `${days} days left`, color: DS.warning, urgent: true };
  return { label: `${days} days left`, color: DS.text2, urgent: false };
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

function SubscriptionCard({ item, onPress }: { item: SubscriptionResponse; onPress: () => void }) {
  const sc = statusStyle(item.status);
  const exp = expiryInfo(item);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Ionicons name="card-outline" size={20} color={DS.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.cardName}</Text>
          <Text style={styles.cardSub}>{item.customerName ?? 'Customer'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <View style={[styles.dot, { backgroundColor: sc.fg }]} />
          <Text style={[styles.statusText, { color: sc.fg }]}>{item.status}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={DS.text3} style={{ marginLeft: 2 }} />
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="wallet-outline" size={13} color={DS.text3} />
          <Text style={styles.metaLabel}>Balance</Text>
          <Text style={[styles.metaValue, { color: DS.success }]}>{formatCurrency(item.walletBalance)}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={DS.text3} />
          <Text style={styles.metaLabel}>Purchased</Text>
          <Text style={styles.metaValue}>{formatDate(item.purchasedAt)}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Ionicons name={exp.urgent ? 'alert-circle-outline' : 'time-outline'} size={13} color={exp.urgent ? exp.color : DS.text3} />
          <Text style={styles.metaLabel}>Expires</Text>
          <Text style={[styles.metaValue, { color: exp.color, fontWeight: exp.urgent ? '800' : '700' }]}>
            {exp.label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function SubscriptionDetailModal({ item, onClose }: { item: SubscriptionResponse | null; onClose: () => void }) {
  if (!item) return null;
  const sc = statusStyle(item.status);
  const exp = expiryInfo(item);
  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailHeaderLabel}>{item.cardName.toUpperCase()}</Text>
              <Text style={styles.detailHeaderAmount}>{formatCurrency(item.walletBalance)}</Text>
              <Text style={styles.detailHeaderSub}>Remaining balance</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <View style={[styles.dot, { backgroundColor: sc.fg }]} />
              <Text style={[styles.statusText, { color: sc.fg }]}>{item.status}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[styles.expiryBanner, { backgroundColor: exp.urgent ? exp.color + '18' : DS.bg }]}>
              <Ionicons name={exp.urgent ? 'alert-circle' : 'time-outline'} size={18} color={exp.color} />
              <Text style={[styles.expiryBannerText, { color: exp.color }]}>{exp.label}</Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>CUSTOMER</Text>
              <DetailRow label="Name" value={item.customerName ?? 'Customer'} />
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>PURCHASE INFO</Text>
              <DetailRow label="Card Price" value={formatCurrency(item.originalAmount)} />
              {item.discountApplied > 0 && (
                <DetailRow label="Discount" value={`− ${formatCurrency(item.discountApplied)}`} valueColor={DS.success} />
              )}
              {!!item.couponCode && <DetailRow label="Coupon Used" value={item.couponCode} />}
              <DetailRow label="Amount Paid" value={formatCurrency(item.finalAmount)} valueColor={DS.text} />
              <DetailRow label="Purchased On" value={formatDate(item.purchasedAt)} />
              <DetailRow
                label="Expires On"
                value={formatDate(item.expiresAt)}
                valueColor={exp.urgent ? exp.color : undefined}
              />
              <DetailRow label="Subscription ID" value={`#${item.id}`} />
            </View>

            <TouchableOpacity style={styles.detailCloseBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.detailCloseBtnText}>Close</Text>
            </TouchableOpacity>
            <View style={{ height: 12 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function StoreSubscriptionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [storeId, setStoreId]       = useState<number | null>(null);
  const [subs, setSubs]             = useState<SubscriptionResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<Filter>('all');
  const [search, setSearch]         = useState('');
  const [selectedSub, setSelectedSub] = useState<SubscriptionResponse | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      let sid = storeId;
      if (!sid) {
        type SR = { success: boolean; data: { id: number }; message?: string; timestamp: string };
        const res = await axiosInstance.get<SR>(endpoints.store.my);
        sid = res.data.data.id;
        setStoreId(sid);
      }
      const page = await getStoreSubscriptions(sid, 0, 50);
      setSubs(page.content ?? []);
    } catch (e: any) {
      setError(getUserMessage(e, 'Could not load subscriptions right now. Please try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = subs.filter(s => {
    const matchFilter = filter === 'all' || s.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || s.cardName.toLowerCase().includes(q)
      || String(s.id).includes(q)
      || String(s.userId).includes(q);
    return matchFilter && matchSearch;
  });

  const countFor = (f: Filter) =>
    f === 'all' ? subs.length : subs.filter(s => s.status === f).length;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',       label: 'All'       },
    { key: 'ACTIVE',    label: 'Active'    },
    { key: 'EXPIRED',   label: 'Expired'   },
    { key: 'CANCELLED', label: 'Cancelled' },
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
            <Text style={styles.pageTitle}>Store Subscriptions</Text>
            <Text style={styles.pageSubtitle}>{subs.length} total</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={15} color={DS.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by card, sub ID, user…"
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
        renderItem={({ item }) => <SubscriptionCard item={item} onPress={() => setSelectedSub(item)} />}
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
                  <Text style={styles.emptyTitle}>Could not load subscriptions</Text>
                  <Text style={styles.emptyDesc}>{error}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons name="people-outline" size={48} color={DS.text3} />
                  <Text style={styles.emptyTitle}>No subscriptions found</Text>
                  <Text style={styles.emptyDesc}>
                    {search ? 'Try a different search' : 'Subscriptions will appear here'}
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

      <SubscriptionDetailModal item={selectedSub} onClose={() => setSelectedSub(null)} />
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
  cardName: { fontSize: 15, fontWeight: '700', color: DS.text },
  cardSub:  { fontSize: 12, color: DS.text3, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5,
  },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

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

  // Detail modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: DS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36,
    maxHeight: '88%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: DS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },

  detailHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 16, gap: 12,
  },
  detailHeaderLabel:  { fontSize: 11, fontWeight: '700', color: DS.text3, letterSpacing: 0.8, marginBottom: 6 },
  detailHeaderAmount: { fontSize: 26, fontWeight: '900', color: DS.text },
  detailHeaderSub:    { fontSize: 12, color: DS.text3, marginTop: 2 },

  expiryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  expiryBannerText: { fontSize: 13, fontWeight: '700' },

  detailCard: {
    backgroundColor: DS.bg, borderRadius: 16, borderWidth: 1, borderColor: DS.border,
    padding: 16, marginBottom: 14,
  },
  detailCardTitle: {
    fontSize: 11, fontWeight: '700', color: DS.text3,
    letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 8, gap: 16,
  },
  detailLabel: { fontSize: 13, color: DS.text2 },
  detailValue: { fontSize: 13, fontWeight: '600', color: DS.text, textAlign: 'right', flex: 1 },

  detailCloseBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 15,
    borderWidth: 1.5, borderColor: DS.border, marginTop: 4,
  },
  detailCloseBtnText: { fontSize: 15, fontWeight: '700', color: DS.text2 },
});
