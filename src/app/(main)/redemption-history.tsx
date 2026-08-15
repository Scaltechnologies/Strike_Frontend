import { useState, useCallback } from 'react';
import {
  View, TouchableOpacity, FlatList, Modal,
  StyleSheet, StatusBar, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRedemption } from '../../modules/redemption/store/RedemptionContext';
import type {
  RedemptionRequest,
  RedemptionStatus,
} from '../../modules/redemption/services/redemptionService';

// ─── Design tokens ───────────────────────────────────────────────────
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
  errorSoft:   '#FEF2F2',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

const DARK = {
  bg:    '#1C1209',
  text:  '#FFFFFF',
  text2: '#D4B896',
  text3: '#9B7E5E',
};

// No push/WebSocket infra exists yet for redemption requests, so we poll
// at this interval as the pragmatic stand-in for live updates.
const QUEUE_POLL_INTERVAL_MS = 15000;

// ─── Helpers ─────────────────────────────────────────────────────────
type FilterKey = 'all' | 'pending' | 'completed' | 'rejected';

function statusMeta(status: RedemptionStatus) {
  switch (status) {
    case 'pending':
      return { label: 'Pending',  color: DS.warning, bg: DS.warningSoft, icon: 'time-outline' as const };
    case 'completed':
      return { label: 'Approved', color: DS.success, bg: DS.successSoft, icon: 'checkmark-circle-outline' as const };
    case 'rejected':
      return { label: 'Rejected', color: DS.error,   bg: DS.errorSoft,   icon: 'close-circle-outline' as const };
    case 'failed':
      return { label: 'Failed',   color: DS.error,   bg: DS.errorSoft,   icon: 'alert-circle-outline' as const };
    case 'reversed':
      return { label: 'Reversed', color: DS.text3,   bg: DS.bg,          icon: 'refresh-outline' as const };
    default:
      return { label: 'Unknown',  color: DS.text3,   bg: DS.bg,          icon: 'help-circle-outline' as const };
  }
}

function matchesFilter(status: RedemptionStatus, filter: FilterKey): boolean {
  if (filter === 'all')       return true;
  if (filter === 'pending')   return status === 'pending';
  if (filter === 'completed') return status === 'completed';
  if (filter === 'rejected')  return status === 'rejected' || status === 'failed' || status === 'reversed';
  return true;
}

// ─── Skeleton ────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8EAED' }} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ width: '55%', height: 13, borderRadius: 6, backgroundColor: '#E8EAED' }} />
          <View style={{ width: '35%', height: 10, borderRadius: 6, backgroundColor: '#E8EAED' }} />
        </View>
        <View style={{ width: 72, height: 24, borderRadius: 12, backgroundColor: '#E8EAED' }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {[80, 90, 60].map((w, i) => (
          <View key={i} style={{ width: w, height: 24, borderRadius: 8, backgroundColor: '#E8EAED' }} />
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: '#EAECEF', marginBottom: 10 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: '30%', height: 10, borderRadius: 6, backgroundColor: '#E8EAED' }} />
        <View style={{ width: '20%', height: 10, borderRadius: 6, backgroundColor: '#E8EAED' }} />
      </View>
    </View>
  );
}

// ─── Redemption Card ──────────────────────────────────────────────────
function RedemptionCard({ item, onApprove, onReject }: {
  item: RedemptionRequest;
  onApprove: (item: RedemptionRequest) => void;
  onReject: (item: RedemptionRequest) => void;
}) {
  const router = useRouter();
  const meta = statusMeta(item.status);
  const isPending = item.status === 'pending';
  const visibleItems = item.items.slice(0, 3);
  const extra = item.items.length - 3;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(main)/redemption-detail', params: { id: item.id } })}
      activeOpacity={0.8}
    >
      {/* Header row */}
      <View style={styles.cardTop}>
        <View style={[styles.cardAvatar, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardCustomer} numberOfLines={1}>{item.customer}</Text>
          <Text style={styles.cardSub}>{item.cardName} · {item.timeAgo}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Item chips */}
      <View style={styles.itemsRow}>
        {visibleItems.map(it => (
          <View key={it.id} style={styles.itemChip}>
            <Text style={styles.itemChipText} numberOfLines={1}>
              {it.qty > 1 ? `${it.qty}× ` : ''}{it.name}
            </Text>
          </View>
        ))}
        {extra > 0 && (
          <View style={[styles.itemChip, { borderStyle: 'dashed' }]}>
            <Text style={[styles.itemChipText, { color: DS.text2 }]}>+{extra} more</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.footerDate}>{item.orderedAt}</Text>
        <Text style={styles.footerAmount}>₹{item.totalValue.toLocaleString('en-IN')}</Text>
      </View>

      {/* Inline actions for pending */}
      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.rejectActionBtn}
            onPress={() => onReject(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={15} color={DS.primary} />
            <Text style={styles.rejectActionText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approveActionBtn}
            onPress={() => onApprove(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={15} color="#fff" />
            <Text style={styles.approveActionText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Approve Modal ────────────────────────────────────────────────────
function ApproveModal({ item, visible, onClose, onConfirm }: {
  item: RedemptionRequest | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <View style={[styles.modalIconCircle, { backgroundColor: DS.successSoft, borderColor: '#A3D9B4' }]}>
            <Ionicons name="shield-checkmark-outline" size={36} color={DS.success} />
          </View>

          <Text style={styles.modalTitle}>Approve Redemption?</Text>
          <Text style={styles.modalSubtitle}>
            The customer will be allowed to consume this benefit.{'\n'}This action cannot be undone.
          </Text>

          <View style={styles.modalSummary}>
            {[
              { label: 'Customer',    value: item.customer },
              { label: 'Items',       value: `${item.totalUnits} item${item.totalUnits !== 1 ? 's' : ''}` },
              { label: 'Total Value', value: `₹${item.totalValue.toLocaleString('en-IN')}` },
            ].map((row, i, arr) => (
              <View key={row.label}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                  <Text style={[
                    styles.summaryValue,
                    i === arr.length - 1 && { color: DS.success, fontWeight: '800', fontSize: 15 },
                  ]}>
                    {row.value}
                  </Text>
                </View>
                {i < arr.length - 1 && <View style={styles.summaryDivider} />}
              </View>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approveModalBtn} onPress={onConfirm} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.approveModalText}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────
function RejectModal({ item, visible, onClose, onConfirm }: {
  item: RedemptionRequest | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  if (!item) return null;

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <View style={[styles.modalIconCircle, { backgroundColor: DS.errorSoft, borderColor: '#FECACA' }]}>
            <Ionicons name="close-circle-outline" size={36} color={DS.error} />
          </View>

          <Text style={styles.modalTitle}>Reject Redemption?</Text>
          <Text style={styles.modalSubtitle}>The request will be declined for {item.customer}.</Text>

          <View style={styles.reasonWrap}>
            <Text style={styles.reasonLabel}>Reason (optional)</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Enter reason for rejection…"
              placeholderTextColor={DS.text3}
              style={styles.reasonInput}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectModalBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Ionicons name="close-circle" size={18} color="#fff" />
              <Text style={styles.rejectModalText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────
export default function RedemptionHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    history,
    historyDegraded,
    loadingHistory,
    refreshingHistory,
    errorHistory,
    loadHistory,
    approveRedemption,
    rejectRedemption,
  } = useRedemption();

  const [filter, setFilter]           = useState<FilterKey>('all');
  const [search, setSearch]           = useState('');
  const [approveItem, setApproveItem] = useState<RedemptionRequest | null>(null);
  const [rejectItem, setRejectItem]   = useState<RedemptionRequest | null>(null);

  // Reload history every time this screen comes into focus, then keep
  // polling silently while it stays focused so new/updated redemption
  // requests show up without a manual refresh (no push/WebSocket backend
  // exists yet, so polling is the pragmatic stand-in).
  useFocusEffect(useCallback(() => {
    loadHistory();
    const poll = setInterval(() => { loadHistory(false, true); }, QUEUE_POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [loadHistory]));

  const handleApprove = async () => {
    if (!approveItem) return;
    const id = approveItem.id;
    setApproveItem(null);
    try {
      // context reloads queue + history from backend — no local mutation
      await approveRedemption(id);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to approve redemption');
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectItem) return;
    const id = rejectItem.id;
    setRejectItem(null);
    try {
      await rejectRedemption(id, reason || undefined);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to reject redemption');
    }
  };

  // Counts — derived purely from backend data
  const pendingCount   = history.filter(r => r.status === 'pending').length;
  const completedCount = history.filter(r => r.status === 'completed').length;
  const rejectedCount  = history.filter(r =>
    r.status === 'rejected' || r.status === 'failed' || r.status === 'reversed',
  ).length;

  // Filter + search
  const filtered = history.filter(r => {
    if (!matchesFilter(r.status, filter)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.customer.toLowerCase().includes(q) ||
      r.id.includes(q) ||
      r.cardName.toLowerCase().includes(q) ||
      r.items.some(it => it.name.toLowerCase().includes(q))
    );
  });

  const countFor = (f: FilterKey) => history.filter(r => matchesFilter(r.status, f)).length;

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',       label: 'All',      count: countFor('all')    },
    { key: 'pending',   label: 'Pending',  count: pendingCount       },
    { key: 'completed', label: 'Approved', count: completedCount     },
    { key: 'rejected',  label: 'Rejected', count: rejectedCount      },
  ];

  const emptyIcon   = filter === 'pending' ? 'checkmark-done-circle-outline' : 'receipt-outline';
  const emptyTitle  = filter === 'pending' ? 'All clear!' : 'No redemptions found';
  const emptyDetail = filter === 'pending'
    ? 'No pending requests at the moment'
    : search
    ? 'Try a different search or filter'
    : 'Redemptions will appear here once customers start requesting';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />

      {/* ── Dark header ── */}
      <View style={[styles.darkHeader, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={DARK.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Redemptions</Text>
            <Text style={styles.headerSubtitle}>{history.length} total records</Text>
          </View>
        </View>

        {/* Stats — derived from backend data */}
        <View style={styles.statsRow}>
          {[
            { label: 'PENDING',  value: pendingCount,   color: DS.warning, bg: 'rgba(217,119,6,0.14)',  icon: 'time-outline' as const },
            { label: 'APPROVED', value: completedCount, color: DS.success, bg: 'rgba(22,163,74,0.14)',  icon: 'checkmark-circle-outline' as const },
            { label: 'REJECTED', value: rejectedCount,  color: DS.error,   bg: 'rgba(220,38,38,0.14)',  icon: 'close-circle-outline' as const },
          ].map(s => (
            <View key={s.label} style={styles.statChip}>
              <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={14} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── White sheet ── */}
      <View style={styles.sheet}>
        {/* Search bar */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={DS.text3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search customer, item, or ID…"
            placeholderTextColor={DS.text3}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={DS.text3} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
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
              <View style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, filter === f.key && styles.filterCountTextActive]}>
                  {f.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <FlatList
          data={loadingHistory ? [] : filtered}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshingHistory}
              onRefresh={() => loadHistory(true)}
              colors={[DS.primary]}
              tintColor={DS.primary}
            />
          }
          renderItem={({ item }) => (
            <RedemptionCard
              item={item}
              onApprove={setApproveItem}
              onReject={setRejectItem}
            />
          )}
          ListHeaderComponent={
            loadingHistory ? (
              <View>{Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)}</View>
            ) : historyDegraded && filtered.length > 0 ? (
              // Only show the degraded banner when there is actually partial data to warn about
              <View style={styles.degradedBanner}>
                <Ionicons name="warning-outline" size={16} color={DS.warning} />
                <Text style={styles.degradedText}>
                  Full history is temporarily unavailable. Showing pending requests only.
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loadingHistory ? (
              <View style={styles.emptyWrap}>
                {errorHistory ? (
                  <>
                    <Ionicons name="cloud-offline-outline" size={48} color={DS.text3} />
                    <Text style={styles.emptyTitle}>Could not load</Text>
                    <Text style={styles.emptyDesc}>{errorHistory}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => loadHistory()}>
                      <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                  </>
                ) : historyDegraded ? (
                  // History backend is broken AND queue is empty — no data to show at all
                  <>
                    <Ionicons name="time-outline" size={48} color={DS.text3} />
                    <Text style={styles.emptyTitle}>No pending requests</Text>
                    <Text style={styles.emptyDesc}>
                      Full history is temporarily unavailable.{'\n'}
                      Check back later or pull to refresh.
                    </Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => loadHistory()}>
                      <Text style={styles.retryText}>Refresh</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Ionicons name={emptyIcon} size={48} color={DS.text3} />
                    <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                    <Text style={styles.emptyDesc}>{emptyDetail}</Text>
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

      {/* Modals */}
      <ApproveModal
        item={approveItem}
        visible={!!approveItem}
        onClose={() => setApproveItem(null)}
        onConfirm={handleApprove}
      />
      <RejectModal
        item={rejectItem}
        visible={!!rejectItem}
        onClose={() => setRejectItem(null)}
        onConfirm={handleReject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK.bg },

  // Dark header
  darkHeader: {
    backgroundColor: DARK.bg,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerTitle:    { fontSize: 22, fontWeight: '800', color: DARK.text },
  headerSubtitle: { fontSize: 12, color: DARK.text3, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  statIconWrap: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 3 },
  statLabel: { fontSize: 9, fontWeight: '700', color: DARK.text3, letterSpacing: 0.8 },

  // White sheet
  sheet: {
    flex: 1,
    backgroundColor: DS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 16,
    marginTop: -2,
  },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: DS.bg, borderRadius: 12,
    borderWidth: 1, borderColor: DS.border,
    paddingHorizontal: 14, paddingVertical: 12,
    marginHorizontal: 20, marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: DS.text, padding: 0 },

  // Filter tabs
  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, gap: 8, marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: DS.border, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  filterChipActive:   { backgroundColor: DS.primary, borderColor: DS.primary },
  filterText:         { fontSize: 13, fontWeight: '600', color: DS.text2 },
  filterTextActive:   { color: '#fff' },
  filterCount: {
    backgroundColor: DS.bg,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterCountActive:     { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterCountText:       { fontSize: 11, fontWeight: '700', color: DS.text2 },
  filterCountTextActive: { color: '#fff' },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 4, flexGrow: 1 },

  // Card
  card: {
    backgroundColor: DS.surface, borderRadius: 18, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: DS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardBody:     { flex: 1, minWidth: 0 },
  cardCustomer: { fontSize: 15, fontWeight: '700', color: DS.text },
  cardSub:      { fontSize: 12, color: DS.text3, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  itemChip: {
    backgroundColor: DS.bg, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: DS.border, maxWidth: 160,
  },
  itemChipText: { fontSize: 12, color: DS.text2, fontWeight: '500' },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: DS.border, paddingTop: 10,
  },
  footerDate:   { fontSize: 12, color: DS.text3 },
  footerAmount: { fontSize: 15, fontWeight: '800', color: DS.text },

  actionRow: {
    flexDirection: 'row', gap: 10,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: DS.border,
  },
  rejectActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderColor: DS.primary, borderRadius: 12, paddingVertical: 10,
  },
  rejectActionText: { fontSize: 13, fontWeight: '700', color: DS.primary },
  approveActionBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: DS.success, borderRadius: 12, paddingVertical: 10,
    shadowColor: DS.success, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  approveActionText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Degraded banner (history endpoint unavailable, showing queue fallback)
  degradedBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: DS.warningSoft, borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A',
  },
  degradedText: { flex: 1, fontSize: 13, color: DS.warning, lineHeight: 19 },

  // Empty state
  emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: DS.text2 },
  emptyDesc:  { fontSize: 13, color: DS.text3, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
  retryBtn:   { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: DS.primary },
  retryText:  { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Modal shared
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: DS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: DS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalIconCircle: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: 16,
  },
  modalTitle:    { fontSize: 22, fontWeight: '800', color: DS.text, marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: DS.text2, textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  // Modal summary
  modalSummary: {
    width: '100%', backgroundColor: DS.bg,
    borderRadius: 16, marginBottom: 24,
    borderWidth: 1, borderColor: DS.border, overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 8,
  },
  summaryLabel:   { fontSize: 13, color: DS.text2, fontWeight: '500' },
  summaryValue:   { fontSize: 14, fontWeight: '700', color: DS.text, textAlign: 'right', flex: 1 },
  summaryDivider: { height: 1, backgroundColor: DS.border },

  // Modal actions
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: DS.border,
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: DS.text2 },
  approveModalBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.success, borderRadius: 14, paddingVertical: 14,
    shadowColor: DS.success, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  approveModalText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  rejectModalBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.error, borderRadius: 14, paddingVertical: 14,
    shadowColor: DS.error, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  rejectModalText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Reason input
  reasonWrap:  { width: '100%', marginBottom: 20 },
  reasonLabel: { fontSize: 13, fontWeight: '600', color: DS.text2, marginBottom: 8, alignSelf: 'flex-start' },
  reasonInput: {
    width: '100%',
    backgroundColor: DS.bg, borderRadius: 12,
    borderWidth: 1, borderColor: DS.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: DS.text, minHeight: 80,
  },
});
