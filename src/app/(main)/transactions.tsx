import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, StatusBar, Alert, Dimensions,
  Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../core/constants/colors';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Types ─────────────────────────────────────────────────────────
type TxStatus = 'completed' | 'failed';

interface TransactionItem {
  name: string;
  qty: number;
  category: string;
  addOn?: string;
  addOnPrice?: number;
}

interface Transaction {
  id: string;
  cardName: string;
  cardId: string;
  cardType: string;
  customer: string;
  phone: string;
  boxes: number;
  date: string;
  time: string;
  status: TxStatus;
  group: string;
  totalValue: number;
  addOnTotal: number;
  items: TransactionItem[];
}

// ─── Mock Data ──────────────────────────────────────────────────────
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1', cardName: 'Meal Card -102929', cardId: '#MC102929',
    cardType: 'Meal Card', customer: 'Abhiram', phone: '9001293838',
    boxes: 2, date: 'Dec 28, 2025', time: '12:30 PM',
    status: 'completed', group: 'Today', totalValue: 240, addOnTotal: 0,
    items: [
      { name: 'Veg Curry',   qty: 2, category: 'Main Course' },
      { name: 'Rice',        qty: 2, category: 'Main Course' },
      { name: 'Buttermilk', qty: 2, category: 'Beverage' },
    ],
  },
  {
    id: '2', cardName: 'All in one Card -1093929', cardId: '#AC1093929',
    cardType: 'All In One', customer: 'Sherya', phone: '9001293839',
    boxes: 2, date: 'Dec 28, 2025', time: '12:45 PM',
    status: 'completed', group: 'Today', totalValue: 320, addOnTotal: 50,
    items: [
      { name: 'Chicken Curry', qty: 1, category: 'Main Course', addOn: '₹50 Add-on', addOnPrice: 50 },
      { name: 'Naan',          qty: 3, category: 'Bread' },
      { name: 'Lassi',         qty: 1, category: 'Beverage' },
    ],
  },
  {
    id: '3', cardName: 'All in one Card -1093929', cardId: '#AC1093930',
    cardType: 'All In One', customer: 'Arjunkumar', phone: '9001293840',
    boxes: 2, date: 'Dec 28, 2025', time: '1:05 PM',
    status: 'completed', group: 'Today', totalValue: 280, addOnTotal: 0,
    items: [
      { name: 'Dal Tadka',  qty: 1, category: 'Main Course' },
      { name: 'Roti',       qty: 4, category: 'Bread' },
      { name: 'Curd',       qty: 1, category: 'Side' },
    ],
  },
  {
    id: '4', cardName: 'Meal Card -102929', cardId: '#MC102930',
    cardType: 'Meal Card', customer: 'Ramky', phone: '9001293841',
    boxes: 2, date: 'Dec 28, 2025', time: '1:20 PM',
    status: 'failed', group: 'Today', totalValue: 180, addOnTotal: 0,
    items: [
      { name: 'Veg Meals', qty: 2, category: 'Combo' },
    ],
  },
  {
    id: '5', cardName: 'All in one Card -1093929', cardId: '#AC1093931',
    cardType: 'All In One', customer: 'Arjunkumar', phone: '9001293840',
    boxes: 2, date: 'Dec 28, 2025', time: '2:00 PM',
    status: 'completed', group: 'Today', totalValue: 310, addOnTotal: 120,
    items: [
      { name: 'Paneer Butter Masala', qty: 1, category: 'Main Course', addOn: '₹120 Add-on', addOnPrice: 120 },
      { name: 'Naan',                 qty: 2, category: 'Bread' },
    ],
  },
  {
    id: '6', cardName: 'Meal Card -102929', cardId: '#MC102931',
    cardType: 'Meal Card', customer: 'Ravi', phone: '9001293842',
    boxes: 3, date: 'Dec 27, 2025', time: '12:10 PM',
    status: 'completed', group: 'Yesterday', totalValue: 360, addOnTotal: 0,
    items: [
      { name: 'Chicken Biryani', qty: 3, category: 'Main Course' },
      { name: 'Raita',           qty: 3, category: 'Side' },
    ],
  },
  {
    id: '7', cardName: 'All in one Card -1093929', cardId: '#AC1093932',
    cardType: 'All In One', customer: 'Priya', phone: '9001293843',
    boxes: 1, date: 'Dec 27, 2025', time: '1:30 PM',
    status: 'failed', group: 'Yesterday', totalValue: 150, addOnTotal: 0,
    items: [
      { name: 'Veg Thali', qty: 1, category: 'Combo' },
    ],
  },
  {
    id: '8', cardName: 'Meal Card -102929', cardId: '#MC102932',
    cardType: 'Meal Card', customer: 'Kiran', phone: '9001293844',
    boxes: 2, date: 'Dec 27, 2025', time: '2:15 PM',
    status: 'completed', group: 'Yesterday', totalValue: 220, addOnTotal: 0,
    items: [
      { name: 'Dal Fry',   qty: 2, category: 'Main Course' },
      { name: 'Chapati',   qty: 4, category: 'Bread' },
    ],
  },
  {
    id: '9', cardName: 'All in one Card -1093929', cardId: '#AC1093933',
    cardType: 'All In One', customer: 'Neha', phone: '9001293845',
    boxes: 2, date: 'Dec 26, 2025', time: '12:00 PM',
    status: 'completed', group: 'Dec 26', totalValue: 290, addOnTotal: 0,
    items: [
      { name: 'Idli',    qty: 4, category: 'Breakfast' },
      { name: 'Sambar',  qty: 2, category: 'Side' },
      { name: 'Chutney', qty: 2, category: 'Side' },
    ],
  },
  {
    id: '10', cardName: 'Meal Card -102929', cardId: '#MC102933',
    cardType: 'Meal Card', customer: 'Suresh', phone: '9001293846',
    boxes: 4, date: 'Dec 26, 2025', time: '1:00 PM',
    status: 'completed', group: 'Dec 26', totalValue: 480, addOnTotal: 200,
    items: [
      { name: 'Mutton Curry', qty: 2, category: 'Main Course', addOn: '₹200 Add-on', addOnPrice: 200 },
      { name: 'Rice',         qty: 4, category: 'Main Course' },
      { name: 'Pickle',       qty: 4, category: 'Side' },
    ],
  },
];

// ─── Transaction Detail Modal ───────────────────────────────────────
function TransactionDetailModal({
  tx, visible, onClose,
}: {
  tx: Transaction | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!tx) return null;

  const isFailed = tx.status === 'failed';

  // Group items by category
  const grouped = tx.items.reduce<Record<string, TransactionItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalDismiss} onPress={onClose} activeOpacity={1} />

        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.cardTypePill, isFailed && styles.cardTypePillFailed]}>
                <Text style={styles.cardTypePillText}>{tx.cardType}</Text>
              </View>
              <Text style={styles.modalCardId}>{tx.cardId}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textDark} />
            </TouchableOpacity>
          </View>

          {/* Customer row */}
          <View style={styles.customerRow}>
            <View style={[styles.customerAvatar, isFailed && styles.customerAvatarFailed]}>
              <Text style={styles.customerAvatarText}>
                {tx.customer.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalCustomer}>{tx.customer}</Text>
              <Text style={styles.modalPhone}>{tx.phone}</Text>
            </View>
            {/* Status badge */}
            <View style={[styles.statusChip, isFailed && styles.statusChipFailed]}>
              <Ionicons
                name={isFailed ? 'close-circle' : 'checkmark-circle'}
                size={14}
                color={isFailed ? Colors.primary : '#4CAF50'}
              />
              <Text style={[styles.statusChipText, isFailed && styles.statusChipTextFailed]}>
                {isFailed ? 'Failed' : 'Completed'}
              </Text>
            </View>
          </View>

          {/* Date + Time row */}
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeChip}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.dateTimeText}>{tx.date}</Text>
            </View>
            <View style={styles.dateTimeChip}>
              <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.dateTimeText}>{tx.time}</Text>
            </View>
            <View style={styles.dateTimeChip}>
              <Ionicons name="cube-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.dateTimeText}>{tx.boxes} Boxes</Text>
            </View>
          </View>

          <View style={styles.modalDivider} />

          {/* Items */}
          <ScrollView
            style={styles.itemsScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.itemsTitle}>Items Redeemed</Text>

            {Object.entries(grouped).map(([category, items]) => (
              <View key={category} style={styles.categoryGroup}>
                <Text style={styles.categoryLabel}>{category}</Text>
                {items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.qtyBubble}>
                      <Text style={styles.qtyText}>{item.qty}</Text>
                    </View>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.addOn && (
                        <View style={styles.addOnChip}>
                          <Ionicons name="add-circle-outline" size={12} color={Colors.primary} />
                          <Text style={styles.addOnText}>{item.addOn}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemQtyLabel}>×{item.qty}</Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Summary */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Boxes</Text>
                <Text style={styles.summaryValue}>{tx.boxes} Boxes</Text>
              </View>
              {tx.addOnTotal > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Add-on Charges</Text>
                  <Text style={[styles.summaryValue, { color: Colors.primary }]}>
                    +₹{tx.addOnTotal}
                  </Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryTotalLabel}>Total Value</Text>
                <Text style={styles.summaryTotalValue}>₹{tx.totalValue}</Text>
              </View>
            </View>

            {/* Failed reason */}
            {isFailed && (
              <View style={styles.failedReasonBox}>
                <Ionicons name="warning-outline" size={16} color={Colors.primary} />
                <Text style={styles.failedReasonText}>
                  Transaction failed. Card may have been invalid or expired.
                </Text>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Bottom close button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeFullBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.closeFullBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Transaction Card Row ───────────────────────────────────────────
function TransactionCard({
  item, onPress,
}: {
  item: Transaction;
  onPress: (tx: Transaction) => void;
}) {
  const isFailed = item.status === 'failed';

  return (
    <TouchableOpacity
      style={[styles.txCard, isFailed && styles.txCardFailed]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={styles.txRow}>
        {/* Icon */}
        <View style={[styles.txIcon, isFailed && styles.txIconFailed]}>
          <Ionicons
            name={isFailed ? 'arrow-up-outline' : 'arrow-down-outline'}
            size={20}
            color={isFailed ? Colors.primary : '#4A90D9'}
          />
        </View>

        {/* Info */}
        <View style={styles.txInfo}>
          <Text style={styles.txCardName} numberOfLines={1}>{item.cardName}</Text>
          <Text style={styles.txCustomer}>@ {item.customer}</Text>
        </View>

        {/* Right side */}
        <View style={styles.txRight}>
          <Text style={styles.txBoxes}>{item.boxes} Boxes</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginTop: 2 }} />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.txFooter}>
        <Text style={styles.txDate}>{item.date} · {item.time}</Text>
        <View style={styles.statusRow}>
          {!isFailed
            ? <Ionicons name="checkmark" size={12} color="#4CAF50" />
            : null
          }
          <Text style={[styles.statusText, isFailed && styles.statusTextFailed]}>
            {isFailed ? 'Failed' : 'Completed'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────
type FilterType = 'all' | 'completed' | 'failed';

export default function TransactionsScreen() {
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<FilterType>('all');
  const [selectedTx, setSelected] = useState<Transaction | null>(null);
  const [modalVisible, setModal]  = useState(false);

  const openDetail = (tx: Transaction) => {
    setSelected(tx);
    setModal(true);
  };

  const filtered = MOCK_TRANSACTIONS.filter(t => {
    const matchesSearch =
      t.cardName.toLowerCase().includes(search.toLowerCase()) ||
      t.customer.toLowerCase().includes(search.toLowerCase()) ||
      t.cardId.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ? true : t.status === filter;
    return matchesSearch && matchesFilter;
  });

  // Group
  const groups = filtered.reduce<{ title: string; data: Transaction[] }[]>((acc, tx) => {
    const existing = acc.find(g => g.title === tx.group);
    if (existing) existing.data.push(tx);
    else acc.push({ title: tx.group, data: [tx] });
    return acc;
  }, []);

  type ListItem =
    | { type: 'header'; title: string; key: string }
    | { type: 'item';   data: Transaction; key: string };

  const listData: ListItem[] = groups.flatMap(g => [
    { type: 'header' as const, title: g.title, key: `h-${g.title}` },
    ...g.data.map(d => ({ type: 'item' as const, data: d, key: d.id })),
  ]);

  const totalCount     = MOCK_TRANSACTIONS.length;
  const completedCount = MOCK_TRANSACTIONS.filter(t => t.status === 'completed').length;
  const failedCount    = MOCK_TRANSACTIONS.filter(t => t.status === 'failed').length;

  const FILTERS: { key: FilterType; label: string; count: number; color: string }[] = [
    { key: 'all',       label: 'All',       count: totalCount,     color: Colors.textDark },
    { key: 'completed', label: 'Completed', count: completedCount, color: '#4CAF50' },
    { key: 'failed',    label: 'Failed',    count: failedCount,    color: Colors.primary },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWarm} />

      {/* ── Peach Header ── */}
      <SafeAreaView style={styles.header}>
        {/* Wavy decoration */}
        <View style={styles.wavesContainer} pointerEvents="none">
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.wave, {
              top: 10 + i * 22,
              opacity: 0.18 + i * 0.06,
              width: SW + 60,
            }]} />
          ))}
        </View>

        {/* Title row */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Transactions</Text>
            <Text style={styles.pageSubtitle}>{totalCount} Total</Text>
          </View>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => Alert.alert('Export', 'Export to CSV — coming soon')}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: '#F0FFF4' }]}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            <Text style={[styles.statChipText, { color: '#4CAF50' }]}>
              {completedCount} Completed
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: '#FFF0EE' }]}>
            <Ionicons name="close-circle" size={14} color={Colors.primary} />
            <Text style={[styles.statChipText, { color: Colors.primary }]}>
              {failedCount} Failed
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by card, customer, ID..."
            placeholderTextColor={Colors.textPlaceholder}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* ── White Sheet ── */}
      <View style={styles.sheet}>
        {/* Filter tabs */}
        <View style={styles.filterTabsRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterTab, filter === f.key && { borderBottomColor: f.color, borderBottomWidth: 2.5 }]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterTabText,
                filter === f.key && { color: f.color, fontWeight: '700' },
              ]}>
                {f.label}
              </Text>
              <View style={[styles.filterCount, filter === f.key && { backgroundColor: f.color }]}>
                <Text style={[styles.filterCountText, filter === f.key && { color: '#fff' }]}>
                  {f.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={listData}
          keyExtractor={item => item.key}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.groupHeaderRow}>
                  <Text style={styles.groupHeader}>{item.title}</Text>
                  <View style={styles.groupHeaderLine} />
                </View>
              );
            }
            return <TransactionCard item={item.data} onPress={openDetail} />;
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={52} color="#E0E0E0" />
              <Text style={styles.emptyText}>No transactions found</Text>
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 14 }}>
                    Clear search
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      {/* ── Detail Modal ── */}
      <TransactionDetailModal
        tx={selectedTx}
        visible={modalVisible}
        onClose={() => setModal(false)}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgWarm },

  // Header
  header: {
    backgroundColor: Colors.bgWarm,
    paddingHorizontal: 20, paddingTop: 30, paddingBottom: 16,
    overflow: 'hidden',
  },
  wavesContainer: { position: 'absolute', top: 0, left: -30, right: 0, height: 100 },
  wave: {
    position: 'absolute', height: 55, borderRadius: 40,
    borderWidth: 1.5, borderColor: Colors.circleMid,
    backgroundColor: 'transparent', left: 0,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12, zIndex: 1,
  },
  pageTitle:    { fontSize: 24, fontWeight: '800', color: Colors.textDark },
  pageSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  downloadBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12, zIndex: 1 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  statChipText: { fontSize: 13, fontWeight: '700' },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, gap: 8, zIndex: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark, padding: 0 },

  // Sheet
  sheet: {
    flex: 1, backgroundColor: '#F7F7F7',
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
  },

  // Filter tabs
  filterTabsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    paddingHorizontal: 8,
  },
  filterTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  filterTabText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  filterCount: {
    backgroundColor: '#F0F0F0', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 1,
  },
  filterCountText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },

  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, flexGrow: 1 },

  // Group header
  groupHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 10, marginTop: 6,
  },
  groupHeader:     { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  groupHeaderLine: { flex: 1, height: 1, backgroundColor: '#E8E8E8' },

  // Transaction card
  txCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  txCardFailed: { backgroundColor: '#FFF0EE', borderColor: '#FFCCC7' },
  txRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  txIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#EBF3FB', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  txIconFailed:  { backgroundColor: '#FFE8E5' },
  txInfo:        { flex: 1, marginHorizontal: 12 },
  txCardName:    { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  txCustomer:    { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  txRight:       { alignItems: 'flex-end', gap: 2 },
  txBoxes:       { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  txFooter:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txDate:        { fontSize: 12, color: Colors.textMuted },
  statusRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText:    { fontSize: 13, fontWeight: '600', color: '#4CAF50' },
  statusTextFailed: { color: Colors.primary },

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted, fontWeight: '500' },

  // ── Modal ──
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalDismiss:  { flex: 1 },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingBottom: 32,
    maxHeight: SH * 0.92,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 16,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTypePill: {
    backgroundColor: Colors.primary, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  cardTypePillFailed: { backgroundColor: Colors.textMuted },
  cardTypePillText:   { color: '#fff', fontSize: 12, fontWeight: '700' },
  modalCardId:        { fontSize: 16, fontWeight: '800', color: Colors.textDark },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },

  // Customer
  customerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, marginBottom: 14,
  },
  customerAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  customerAvatarFailed: { backgroundColor: '#E0E0E0' },
  customerAvatarText:   { color: '#fff', fontWeight: '800', fontSize: 18 },
  modalCustomer:        { fontSize: 17, fontWeight: '800', color: Colors.textDark },
  modalPhone:           { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FFF4', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  statusChipFailed:    { backgroundColor: '#FFF0EE' },
  statusChipText:      { fontSize: 12, fontWeight: '700', color: '#4CAF50' },
  statusChipTextFailed:{ color: Colors.primary },

  // Date time row
  dateTimeRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16,
  },
  dateTimeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F5F5F5', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  dateTimeText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },

  modalDivider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 16 },

  // Items
  itemsScroll:   { paddingHorizontal: 20, maxHeight: SH * 0.42 },
  itemsTitle:    { fontSize: 16, fontWeight: '800', color: Colors.textDark, marginBottom: 14 },
  categoryGroup: { marginBottom: 16 },
  categoryLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 1, marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8F8F8',
  },
  qtyBubble: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  qtyText:      { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  itemMeta:     { flex: 1 },
  itemName:     { fontSize: 15, fontWeight: '600', color: Colors.textDark },
  addOnChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  addOnText:    { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  itemQtyLabel: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },

  // Summary
  summaryBox: {
    backgroundColor: '#F8F8F8', borderRadius: 14,
    padding: 16, marginTop: 8, gap: 10,
  },
  summaryRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel:      { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  summaryValue:      { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  summaryTotalRow:   { borderTopWidth: 1, borderTopColor: '#EBEBEB', paddingTop: 10 },
  summaryTotalLabel: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  summaryTotalValue: { fontSize: 18, fontWeight: '800', color: Colors.textDark },

  // Failed reason
  failedReasonBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF0EE', borderRadius: 12,
    padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#FFCCC7',
  },
  failedReasonText: { flex: 1, fontSize: 13, color: Colors.textDark, lineHeight: 18 },

  // Footer
  modalFooter: {
    paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  closeFullBtn: {
    backgroundColor: '#F5F5F5', borderRadius: 50,
    paddingVertical: 14, alignItems: 'center',
  },
  closeFullBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
});