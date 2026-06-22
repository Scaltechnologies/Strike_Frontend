import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, StatusBar, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchRedemptionHistory,
} from '../../modules/redemption/services/redemptionService';
import type { RedemptionRequest } from '../../modules/redemption/services/redemptionService';
import axiosInstance from '../../core/api/axiosInstance';
import endpoints from '../../core/api/endpoints';

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  primarySoft: '#FFF0EE',
  success:     '#16A34A',
  successSoft: '#F0FDF4',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

type Filter = 'all' | 'accepted' | 'pending';

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8EAED' }} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ width: '55%', height: 13, borderRadius: 6, backgroundColor: '#E8EAED' }} />
          <View style={{ width: '40%', height: 10, borderRadius: 6, backgroundColor: '#E8EAED' }} />
        </View>
        <View style={{ width: 70, height: 22, borderRadius: 11, backgroundColor: '#E8EAED' }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {Array(3).fill(0).map((_, i) => (
          <View key={i} style={{ width: 70, height: 24, borderRadius: 8, backgroundColor: '#E8EAED' }} />
        ))}
      </View>
    </View>
  );
}

function RedemptionCard({ item }: { item: RedemptionRequest }) {
  const isAccepted = item.status === 'accepted';
  const displayItems = item.items.slice(0, 2);
  const extra = item.items.length - 2;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, isAccepted ? styles.cardIconAccepted : styles.cardIconPending]}>
          <Ionicons
            name={isAccepted ? 'checkmark-circle-outline' : 'time-outline'}
            size={20}
            color={isAccepted ? DS.success : DS.primary}
          />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardCustomer} numberOfLines={1}>{item.customer}</Text>
          <Text style={styles.cardSub}>{item.cardId} · {item.timeAgo}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isAccepted ? DS.successSoft : DS.primarySoft }]}>
          <Text style={[styles.statusText, { color: isAccepted ? DS.success : DS.primary }]}>
            {isAccepted ? 'Completed' : 'Pending'}
          </Text>
        </View>
      </View>

      {/* Items chips */}
      <View style={styles.itemsRow}>
        {displayItems.map(it => (
          <View key={it.id} style={styles.itemChip}>
            <Text style={styles.itemChipText} numberOfLines={1}>
              {it.qty > 1 ? `${it.qty}× ` : ''}{it.name}
            </Text>
          </View>
        ))}
        {extra > 0 && (
          <View style={[styles.itemChip, styles.itemChipMore]}>
            <Text style={[styles.itemChipText, { color: DS.text2 }]}>+{extra} more</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerDate}>{item.orderedAt}</Text>
        <Text style={styles.footerAmount}>₹{item.totalValue.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );
}

export default function RedemptionHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [storeId, setStoreId]       = useState<number | null>(null);
  const [history, setHistory]       = useState<RedemptionRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<Filter>('all');

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
      const data = await fetchRedemptionHistory(sid);
      setHistory(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = history.filter(r =>
    filter === 'all' || r.status === filter
  );

  const countFor = (f: Filter) =>
    f === 'all' ? history.length : history.filter(r => r.status === f).length;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',      label: 'All'       },
    { key: 'accepted', label: 'Completed' },
    { key: 'pending',  label: 'Pending'   },
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
            <Text style={styles.pageTitle}>Redemption History</Text>
            <Text style={styles.pageSubtitle}>{history.length} total</Text>
          </View>
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
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            colors={[DS.primary]}
            tintColor={DS.primary}
          />
        }
        renderItem={({ item }) => <RedemptionCard item={item} />}
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
                  <Text style={styles.emptyTitle}>Could not load history</Text>
                  <Text style={styles.emptyDesc}>{error}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons name="receipt-outline" size={48} color={DS.text3} />
                  <Text style={styles.emptyTitle}>No redemptions found</Text>
                  <Text style={styles.emptyDesc}>
                    {filter !== 'all' ? 'Try a different filter' : 'Redemption history will appear here'}
                  </Text>
                </>
              )}
            </View>
          ) : null
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
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

  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: DS.border, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
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
    alignItems: 'center', justifyContent: 'center',
  },
  cardIconAccepted: { backgroundColor: DS.successSoft },
  cardIconPending:  { backgroundColor: DS.primarySoft },
  cardBody:     { flex: 1 },
  cardCustomer: { fontSize: 15, fontWeight: '700', color: DS.text },
  cardSub:      { fontSize: 12, color: DS.text3, marginTop: 2 },
  statusBadge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusText: { fontSize: 12, fontWeight: '700' },

  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  itemChip: {
    backgroundColor: DS.bg, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: DS.border, maxWidth: 140,
  },
  itemChipMore:    { borderStyle: 'dashed' },
  itemChipText:    { fontSize: 12, color: DS.text2, fontWeight: '500' },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: DS.border, paddingTop: 10,
  },
  footerDate:   { fontSize: 12, color: DS.text3 },
  footerAmount: { fontSize: 15, fontWeight: '800', color: DS.text },

  emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: DS.text2 },
  emptyDesc:  { fontSize: 13, color: DS.text3, textAlign: 'center' },
  retryBtn:   { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: DS.primary },
  retryText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
});
