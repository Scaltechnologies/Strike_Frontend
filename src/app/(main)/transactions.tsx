import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStoreTransactions } from '../../modules/ledger/services/ledgerService';
import type { TransactionResponse, TransactionType } from '../../modules/ledger/types/ledger.types';
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

type Filter = 'all' | TransactionType;

function formatCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function txLabel(type: TransactionType) {
  if (type === 'CARD_PURCHASE') return 'Card Purchase';
  if (type === 'REDEMPTION')    return 'Redemption';
  if (type === 'REFUND')        return 'Refund';
  if (type === 'TOP_UP')        return 'Top-Up';
  return type;
}

function txIconName(type: TransactionType): keyof typeof import('@expo/vector-icons').Ionicons.glyphMap {
  if (type === 'CARD_PURCHASE') return 'card-outline';
  if (type === 'REDEMPTION')    return 'arrow-up-outline';
  if (type === 'REFUND')        return 'refresh-outline';
  return 'add-circle-outline';
}

function txIconBg(type: TransactionType) {
  if (type === 'CARD_PURCHASE') return { bg: DS.successSoft, fg: DS.success };
  if (type === 'REDEMPTION')    return { bg: DS.primarySoft, fg: DS.primary };
  return { bg: '#F0F6FF', fg: '#3B82F6' };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function groupByDate(txs: TransactionResponse[]) {
  const map = new Map<string, TransactionResponse[]>();
  for (const tx of txs) {
    const key = formatDate(tx.createdAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return map;
}

function SkeletonRow() {
  return (
    <View style={styles.txCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8EAED' }} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ width: '55%', height: 12, borderRadius: 6, backgroundColor: '#E8EAED' }} />
          <View style={{ width: '35%', height: 10, borderRadius: 6, backgroundColor: '#E8EAED' }} />
        </View>
        <View style={{ width: 56, height: 14, borderRadius: 6, backgroundColor: '#E8EAED' }} />
      </View>
    </View>
  );
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const [storeId, setStoreId]       = useState<number | null>(null);
  const [transactions, setTxs]      = useState<TransactionResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<Filter>('all');
  const [search, setSearch]         = useState('');

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
      const page = await getStoreTransactions(sid, 0, 50);
      setTxs(page.content ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = transactions.filter(tx => {
    const matchFilter = filter === 'all' || tx.transactionType === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || tx.transactionType.toLowerCase().includes(q)
      || String(tx.subscriptionId).includes(q)
      || String(tx.id).includes(q);
    return matchFilter && matchSearch;
  });

  const grouped = groupByDate(filtered);
  const dateKeys = Array.from(grouped.keys());

  type ListItem =
    | { kind: 'header'; date: string; key: string }
    | { kind: 'tx'; tx: TransactionResponse; key: string };

  const listData: ListItem[] = dateKeys.flatMap(date => [
    { kind: 'header' as const, date, key: `h-${date}` },
    ...grouped.get(date)!.map(tx => ({ kind: 'tx' as const, tx, key: `tx-${tx.id}` })),
  ]);

  const totalCount    = transactions.length;
  const purchaseCount = transactions.filter(t => t.transactionType === 'CARD_PURCHASE').length;
  const redeemedCount = transactions.filter(t => t.transactionType === 'REDEMPTION').length;

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: 'all',           label: 'All',      count: totalCount    },
    { key: 'CARD_PURCHASE', label: 'Purchases', count: purchaseCount },
    { key: 'REDEMPTION',    label: 'Redeemed', count: redeemedCount  },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.bg} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Transactions</Text>
            <Text style={styles.pageSubtitle}>{totalCount} total</Text>
          </View>
          <View style={styles.headerBadges}>
            <View style={styles.successBadge}>
              <Ionicons name="card-outline" size={13} color={DS.success} />
              <Text style={[styles.badgeText, { color: DS.success }]}>{purchaseCount}</Text>
            </View>
            <View style={styles.primaryBadge}>
              <Ionicons name="arrow-up-outline" size={13} color={DS.primary} />
              <Text style={[styles.badgeText, { color: DS.primary }]}>{redeemedCount}</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={15} color={DS.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by sub ID or type…"
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
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
              <View style={[styles.filterBadge, filter === f.key && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, filter === f.key && styles.filterBadgeTextActive]}>
                  {f.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Body */}
      <View style={styles.sheet}>
        {loading ? (
          <View style={styles.listContent}>
            {Array(6).fill(0).map((_, i) => <SkeletonRow key={i} />)}
          </View>
        ) : error ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="cloud-offline-outline" size={48} color={DS.text3} />
            <Text style={styles.emptyTitle}>Could not load transactions</Text>
            <Text style={styles.emptyDesc}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={item => item.key}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(true)}
                colors={[DS.primary]}
                tintColor={DS.primary}
              />
            }
            renderItem={({ item }) => {
              if (item.kind === 'header') {
                return (
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>{item.date}</Text>
                    <View style={styles.dateHeaderLine} />
                  </View>
                );
              }
              const tx = item.tx;
              const { bg, fg } = txIconBg(tx.transactionType);
              return (
                <View style={styles.txCard}>
                  <View style={styles.txRow}>
                    <View style={[styles.txIcon, { backgroundColor: bg }]}>
                      <Ionicons name={txIconName(tx.transactionType)} size={18} color={fg} />
                    </View>
                    <View style={styles.txBody}>
                      <Text style={styles.txLabel}>{txLabel(tx.transactionType)}</Text>
                      <Text style={styles.txSub}>Sub #{tx.subscriptionId}</Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={[
                        styles.txAmount,
                        tx.transactionType === 'CARD_PURCHASE' && { color: DS.success },
                        tx.transactionType === 'REDEMPTION'    && { color: DS.primary },
                      ]}>
                        {tx.transactionType === 'CARD_PURCHASE' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </Text>
                      <Text style={styles.txTime}>{formatTime(tx.createdAt)}</Text>
                    </View>
                  </View>
                  {!!tx.remarks && (
                    <Text style={styles.txRemarks} numberOfLines={1}>{tx.remarks}</Text>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="receipt-outline" size={48} color={DS.text3} />
                <Text style={styles.emptyTitle}>No transactions found</Text>
                <Text style={styles.emptyDesc}>
                  {search ? 'Try a different search' : 'Transactions will appear here'}
                </Text>
              </View>
            }
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: DS.bg },
  sheet: { flex: 1, backgroundColor: DS.bg },

  header: {
    backgroundColor: DS.surface, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  pageTitle:    { fontSize: 24, fontWeight: '800', color: DS.text },
  pageSubtitle: { fontSize: 13, color: DS.text3, marginTop: 2 },
  headerBadges: { flexDirection: 'row', gap: 8 },
  successBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: DS.successSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  primaryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: DS.primarySoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  badgeText: { fontSize: 13, fontWeight: '700' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: DS.bg, borderRadius: 12, borderWidth: 1, borderColor: DS.border,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: DS.text, padding: 0 },

  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: DS.border, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  filterChipActive:     { backgroundColor: DS.primary, borderColor: DS.primary },
  filterChipText:       { fontSize: 13, fontWeight: '600', color: DS.text2 },
  filterChipTextActive: { color: '#fff' },
  filterBadge:          { backgroundColor: DS.bg, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  filterBadgeActive:    { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterBadgeText:      { fontSize: 11, fontWeight: '700', color: DS.text3 },
  filterBadgeTextActive:{ color: '#fff' },

  listContent: { paddingHorizontal: 16, paddingTop: 16, flexGrow: 1 },

  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 8 },
  dateHeaderText: { fontSize: 13, fontWeight: '700', color: DS.text2, flexShrink: 0 },
  dateHeaderLine: { flex: 1, height: 1, backgroundColor: DS.border },

  txCard: {
    backgroundColor: DS.surface, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: DS.border,
  },
  txRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txBody:   { flex: 1 },
  txLabel:  { fontSize: 14, fontWeight: '700', color: DS.text },
  txSub:    { fontSize: 12, color: DS.text3, marginTop: 2 },
  txRight:  { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: '800', color: DS.text },
  txTime:   { fontSize: 11, color: DS.text3, marginTop: 3 },
  txRemarks:{ fontSize: 12, color: DS.text2, marginTop: 8, marginLeft: 56, fontStyle: 'italic' },

  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: DS.text2 },
  emptyDesc:  { fontSize: 13, color: DS.text3, textAlign: 'center' },
  retryBtn:   { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: DS.primary },
  retryText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
});
