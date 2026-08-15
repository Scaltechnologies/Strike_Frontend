import { useState, useCallback } from 'react';
import {
  View, TouchableOpacity, FlatList, Modal, ScrollView,
  StyleSheet, StatusBar, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import TextInput from '../../../components/TextInput';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStoreTransactions } from '../../../modules/ledger/services/ledgerService';
import type { TransactionResponse, TransactionType } from '../../../modules/ledger/types/ledger.types';
import { getWithdrawalStats } from '../../../modules/wallet/services/walletService';
import axiosInstance from '../../../core/api/axiosInstance';
import endpoints from '../../../core/api/endpoints';
import { getUserMessage } from '../../../core/api/errorMessage';

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

function formatCurrency(n: number | null | undefined) {
  return '₹' + (n ?? 0).toLocaleString('en-IN');
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

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function TransactionDetailModal({ tx, onClose }: { tx: TransactionResponse | null; onClose: () => void }) {
  if (!tx) return null;
  const reversed = tx.status === 'REVERSED';
  const isCredit = tx.transactionType === 'CARD_PURCHASE';
  return (
    <Modal visible={!!tx} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailHeaderLabel}>{txLabel(tx.transactionType).toUpperCase()}</Text>
              <Text style={[
                styles.detailHeaderAmount,
                { color: reversed ? DS.text3 : isCredit ? DS.success : DS.primary },
                reversed && { textDecorationLine: 'line-through' },
              ]}>
                {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: reversed ? DS.bg : DS.successSoft }]}>
              <Ionicons
                name={reversed ? 'close-circle-outline' : 'checkmark-done-circle-outline'}
                size={12}
                color={reversed ? DS.text3 : DS.success}
              />
              <Text style={[styles.statusText, { color: reversed ? DS.text3 : DS.success }]}>
                {reversed ? 'Reversed' : 'Confirmed'}
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>DETAILS</Text>
              <DetailRow label="Description" value={tx.remarks ?? txLabel(tx.transactionType)} />
              <DetailRow label="Date" value={formatDate(tx.createdAt)} />
              <DetailRow label="Time" value={formatTime(tx.createdAt)} />
              <DetailRow label="Transaction ID" value={`#${tx.id}`} />
            </View>

            {reversed && (
              <View style={styles.detailNote}>
                <Ionicons name="information-circle-outline" size={16} color={DS.text2} />
                <Text style={styles.detailNoteText}>
                  This purchase was cancelled as a duplicate. It's kept here for your records but
                  is excluded from your revenue and wallet balance.
                </Text>
              </View>
            )}

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

export default function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [storeId, setStoreId]       = useState<number | null>(null);
  const [transactions, setTxs]      = useState<TransactionResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<Filter>('all');
  const [search, setSearch]         = useState('');
  const [walletBalance, setWalletBalance]     = useState<number | null>(null);
  const [walletError, setWalletError]         = useState<string | null>(null);
  const [selectedTx, setSelectedTx]           = useState<TransactionResponse | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    setWalletError(null);

    const statsPromise = getWithdrawalStats();

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
    } catch (e) {
      setError(getUserMessage(e, 'Failed to load transactions'));
    }

    try {
      const stats = await statsPromise;
      setWalletBalance(stats.availableBalance);
    } catch (e) {
      setWalletError(getUserMessage(e, 'Could not load wallet balance'));
    }

    setLoading(false);
    setRefreshing(false);
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

        {/* Wallet balance */}
        <TouchableOpacity
          style={styles.walletBanner}
          onPress={() => router.push('/(main)/wallet')}
          activeOpacity={0.8}
        >
          <View style={styles.walletIcon}>
            <Ionicons name="wallet-outline" size={18} color={DS.primary} />
          </View>
          <View style={styles.walletBody}>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletValue}>
              {walletError ? '—' : walletBalance === null ? '···' : formatCurrency(walletBalance)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={DS.text3} />
        </TouchableOpacity>

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
              const reversed = tx.status === 'REVERSED';
              const { bg, fg } = reversed ? { bg: DS.bg, fg: DS.text3 } : txIconBg(tx.transactionType);
              return (
                <TouchableOpacity
                  style={styles.txCard}
                  onPress={() => setSelectedTx(tx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.txRow}>
                    <View style={[styles.txIcon, { backgroundColor: bg }]}>
                      <Ionicons name={reversed ? 'close-outline' : txIconName(tx.transactionType)} size={18} color={fg} />
                    </View>
                    <View style={styles.txBody}>
                      <Text style={[styles.txLabel, reversed && { color: DS.text3 }]}>
                        {txLabel(tx.transactionType)}
                      </Text>
                      <Text style={styles.txSub} numberOfLines={1}>
                        {reversed ? 'Reversed — duplicate purchase, excluded from revenue' : (tx.remarks ?? txLabel(tx.transactionType))}
                      </Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={[
                        styles.txAmount,
                        reversed && { color: DS.text3, textDecorationLine: 'line-through' },
                        !reversed && tx.transactionType === 'CARD_PURCHASE' && { color: DS.success },
                        !reversed && tx.transactionType === 'REDEMPTION'    && { color: DS.primary },
                      ]}>
                        {tx.transactionType === 'CARD_PURCHASE' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </Text>
                      <Text style={styles.txTime}>{formatTime(tx.createdAt)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={DS.text3} style={{ marginLeft: 2 }} />
                  </View>
                </TouchableOpacity>
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

      <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
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

  walletBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: DS.primarySoft, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  walletIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  walletBody:  { flex: 1 },
  walletLabel: { fontSize: 12, color: DS.text2, fontWeight: '600' },
  walletValue: { fontSize: 18, color: DS.primary, fontWeight: '800', marginTop: 2 },

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
  filterBadge: {
    backgroundColor: DS.bg,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterBadgeActive:     { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterBadgeText:       { fontSize: 11, fontWeight: '700', color: DS.text2 },
  filterBadgeTextActive: { color: '#fff' },

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

  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
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
    marginBottom: 20,
  },
  detailHeaderLabel: { fontSize: 11, fontWeight: '700', color: DS.text3, letterSpacing: 0.8, marginBottom: 6 },
  detailHeaderAmount: { fontSize: 26, fontWeight: '900' },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

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

  detailNote: {
    flexDirection: 'row', gap: 8, backgroundColor: DS.bg, borderRadius: 12,
    padding: 12, marginBottom: 16, alignItems: 'flex-start',
  },
  detailNoteText: { flex: 1, fontSize: 12, color: DS.text2, lineHeight: 18 },

  detailCloseBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 15,
    borderWidth: 1.5, borderColor: DS.border, marginTop: 4,
  },
  detailCloseBtnText: { fontSize: 15, fontWeight: '700', color: DS.text2 },
});
