import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, StatusBar,
  Dimensions, ScrollView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

const Colors = {
  primary:         '#CC2200',
  accent:          '#C17B2F',
  bgWarm:          '#F6F7FA',
  textDark:        '#1A1A1A',
  textMuted:       '#5A6272',
  textPlaceholder: '#9BA3AF',
};

const { height: SH } = Dimensions.get('window');

// ─── Types ─────────────────────────────────────────────────────────
type TabType     = 'active' | 'cancelled' | 'history';
type CardStatus  = 'active' | 'cancelled';
type TxStatus    = 'completed' | 'failed';

interface TxItem {
  id: string;
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
  restaurant: string;
  boxes: number;
  date: string;
  time: string;
  status: TxStatus;
  customer: string;
  phone: string;
  totalValue: number;
  addOnTotal: number;
  failReason?: string;
  items: TxItem[];
}

interface MealCard {
  id: string;
  type: 'Curry Card' | 'Breakfast Card' | 'All in one';
  restaurant: string;
  address: string;
  used: number;
  total: number;
  status: CardStatus;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────
const MOCK_CUSTOMER: Customer = {
  id: 'c1',
  name: 'Abhiram',
  phone: '9001293838',
};

const MOCK_CARDS: MealCard[] = [
  {
    id: 'card1', type: 'Curry Card',
    restaurant: 'Sri Raghava Curry Point', address: 'RTC Crossroads',
    used: 20, total: 32, status: 'active',
  },
  {
    id: 'card2', type: 'Breakfast Card',
    restaurant: 'Sri Raghava Curry Point', address: 'RTC Crossroads',
    used: 20, total: 32, status: 'active',
  },
  {
    id: 'card3', type: 'All in one',
    restaurant: 'Sri Raghava Curry Point', address: 'RTC Crossroads',
    used: 20, total: 32, status: 'active',
  },
  {
    id: 'card4', type: 'Curry Card',
    restaurant: 'Sri Raghava Curry Point', address: 'RTC Crossroads',
    used: 18, total: 32, status: 'cancelled',
  },
  {
    id: 'card5', type: 'Breakfast Card',
    restaurant: 'Sri Raghava Curry Point', address: 'RTC Crossroads',
    used: 10, total: 32, status: 'cancelled',
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't1', cardName: 'Meal Card', cardId: '#102929',
    restaurant: 'Sri Raghava Curry Point', boxes: 2,
    date: 'Dec 28, 2025', time: '12:30 PM',
    status: 'completed', customer: 'Abhiram', phone: '9001293838',
    totalValue: 110, addOnTotal: 50,
    items: [
      { id: 'i1', name: 'Veg Curry',     qty: 2, category: 'Main Course' },
      { id: 'i2', name: 'Chicken Curry', qty: 1, category: 'Main Course', addOn: '₹50 Add-on', addOnPrice: 50 },
      { id: 'i3', name: 'Butter Naan',   qty: 4, category: 'Bread' },
    ],
  },
  {
    id: 't2', cardName: 'All in one Card', cardId: '#1093929',
    restaurant: 'Sri Raghava Curry Point', boxes: 2,
    date: 'Dec 28, 2025', time: '01:15 PM',
    status: 'completed', customer: 'Abhiram', phone: '9001293838',
    totalValue: 950, addOnTotal: 320,
    items: [
      { id: 'i4', name: 'Paneer Curry',  qty: 1, category: 'Main Course' },
      { id: 'i5', name: 'Mutton Curry',  qty: 1, category: 'Main Course', addOn: '₹120 Add-on', addOnPrice: 120 },
      { id: 'i6', name: 'Dal Fry',       qty: 2, category: 'Main Course' },
      { id: 'i7', name: 'Roti',          qty: 6, category: 'Bread' },
    ],
  },
  {
    id: 't3', cardName: 'All in one Card', cardId: '#1093930',
    restaurant: 'Sri Raghava Curry Point', boxes: 2,
    date: 'Dec 28, 2025', time: '02:45 PM',
    status: 'completed', customer: 'Abhiram', phone: '9001293838',
    totalValue: 180, addOnTotal: 0,
    items: [
      { id: 'i8', name: 'Veg Curry',   qty: 2, category: 'Main Course' },
      { id: 'i9', name: 'Butter Naan', qty: 4, category: 'Bread' },
    ],
  },
  {
    id: 't4', cardName: 'Meal Card', cardId: '#102930',
    restaurant: 'Sri Raghava Curry Point', boxes: 2,
    date: 'Dec 28, 2025', time: '03:20 PM',
    status: 'failed', customer: 'Abhiram', phone: '9001293838',
    totalValue: 110, addOnTotal: 0,
    failReason: 'Card limit exceeded. No remaining redemptions on this card.',
    items: [
      { id: 'i10', name: 'Chicken Curry', qty: 1, category: 'Main Course' },
      { id: 'i11', name: 'Butter Naan',   qty: 4, category: 'Bread' },
    ],
  },
  {
    id: 't5', cardName: 'All in one Card', cardId: '#1093931',
    restaurant: 'Sri Raghava Curry Point', boxes: 2,
    date: 'Dec 28, 2025', time: '04:00 PM',
    status: 'completed', customer: 'Abhiram', phone: '9001293838',
    totalValue: 220, addOnTotal: 80,
    items: [
      { id: 'i12', name: 'Paneer Curry', qty: 2, category: 'Main Course', addOn: '₹80 Add-on', addOnPrice: 80 },
      { id: 'i13', name: 'Dal Fry',      qty: 1, category: 'Main Course' },
    ],
  },
  {
    id: 't6', cardName: 'All in one Card', cardId: '#1093932',
    restaurant: 'Sri Raghava Curry Point', boxes: 2,
    date: 'Dec 28, 2025', time: '05:30 PM',
    status: 'completed', customer: 'Abhiram', phone: '9001293838',
    totalValue: 160, addOnTotal: 0,
    items: [
      { id: 'i14', name: 'Veg Curry',   qty: 2, category: 'Main Course' },
      { id: 'i15', name: 'Roti',        qty: 4, category: 'Bread' },
    ],
  },
];

// ─── Gradient config per card type ─────────────────────────────────
const CARD_GRADIENT: Record<MealCard['type'], readonly [string, string, ...string[]]> = {
  'Curry Card':     ['#E53935', '#B71C1C'],
  'Breakfast Card': ['#7CB342', '#F9A825'],
  'All in one':     ['#4A0000', '#1A0000'],
};

const CARD_BADGE_COLOR: Record<MealCard['type'], string> = {
  'Curry Card':     '#CC2200',
  'Breakfast Card': '#558B2F',
  'All in one':     '#7B1111',
};

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
  const grouped = tx.items.reduce<Record<string, TxItem[]>>((acc, item) => {
    const cat = item.category ?? 'Items';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const baseTotal = tx.totalValue - tx.addOnTotal;

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
                <Text style={styles.cardTypePillText}>{tx.cardName}</Text>
              </View>
              <Text style={styles.modalCardId}>{tx.cardId}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textDark} />
            </TouchableOpacity>
          </View>

          {/* Customer row */}
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>
                {tx.customer.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalCustomer}>{tx.customer}</Text>
              <Text style={styles.modalPhone}>{tx.phone}</Text>
            </View>
            <View style={[styles.statusChip, isFailed ? styles.statusChipFailed : styles.statusChipSuccess]}>
              <Ionicons
                name={isFailed ? 'close-circle' : 'checkmark-circle'}
                size={13}
                color={isFailed ? Colors.primary : '#4CAF50'}
              />
              <Text style={[styles.statusChipText, { color: isFailed ? Colors.primary : '#4CAF50' }]}>
                {isFailed ? 'Failed' : 'Completed'}
              </Text>
            </View>
          </View>

          {/* Date / Time / Boxes chips */}
          <View style={styles.chipsRow}>
            <View style={styles.infoChip}>
              <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.infoChipText}>{tx.date}</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.infoChipText}>{tx.time}</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="cube-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.infoChipText}>{tx.boxes} Boxes</Text>
            </View>
          </View>

          <View style={styles.modalDivider} />

          {/* Items list */}
          <ScrollView style={styles.itemsScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.itemsTitle}>Order Items</Text>

            {Object.entries(grouped).map(([category, items]) => (
              <View key={category} style={styles.categoryGroup}>
                <Text style={styles.categoryLabel}>{category}</Text>
                {items.map(item => (
                  <View key={item.id} style={styles.itemRow}>
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
                    <Text style={styles.itemCount}>×{item.qty}</Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Summary box */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Base Items</Text>
                <Text style={styles.summaryValue}>₹{baseTotal}</Text>
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

            {/* Failed reason box */}
            {isFailed && tx.failReason && (
              <View style={styles.failReasonBox}>
                <Ionicons name="warning-outline" size={16} color={Colors.primary} />
                <Text style={styles.failReasonText}>{tx.failReason}</Text>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Close button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Strike Logo ─────────────────────────────────────────────────────
function StrikeLogo() {
  return (
    <Text style={styles.StrikeLogo}>
      <Text style={styles.StrikeC}>S</Text>trike
    </Text>
  );
}

// ─── Meal Card ──────────────────────────────────────────────────────
function MealCardItem({ card }: { card: MealCard }) {
  const progress   = card.used / card.total;
  const gradient   = CARD_GRADIENT[card.type];
  const badgeColor = CARD_BADGE_COLOR[card.type];

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.mealCard}
    >
      {/* Top row: badge + logo */}
      <View style={styles.mealCardTop}>
        <View style={[styles.cardBadge, { backgroundColor: badgeColor }]}>
          <Text style={styles.cardBadgeText}>{card.type}</Text>
        </View>
        <StrikeLogo />
      </View>

      {/* Restaurant info */}
      <Text style={styles.mealCardRestaurant}>{card.restaurant}</Text>
      <Text style={styles.mealCardAddress}>{card.address}</Text>

      {/* Progress bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Bottom row: used + view card */}
      <View style={styles.mealCardBottom}>
        <Text style={styles.mealCardUsed}>
          <Text style={styles.mealCardUsedCount}>{card.used}/{card.total}</Text>
          {'  '}Used
        </Text>
        <TouchableOpacity style={styles.viewCardBtn} activeOpacity={0.8}>
          <Text style={styles.viewCardText}>View Card</Text>
          <Ionicons name="chevron-forward" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ─── Transaction Row ────────────────────────────────────────────────
function TransactionRow({
  tx, onPress,
}: {
  tx: Transaction;
  onPress: (tx: Transaction) => void;
}) {
  const isFailed = tx.status === 'failed';

  return (
    <TouchableOpacity
      style={[styles.txCard, isFailed && styles.txCardFailed]}
      onPress={() => onPress(tx)}
      activeOpacity={0.75}
    >
      {/* Top row */}
      <View style={styles.txTopRow}>
        <View style={[styles.txIconBox, isFailed && styles.txIconBoxFailed]}>
          <Ionicons
            name="arrow-up-outline"
            size={18}
            color={isFailed ? Colors.primary : '#1565C0'}
          />
        </View>

        <View style={styles.txInfo}>
          <Text style={styles.txCardName}>{tx.cardName} {tx.cardId}</Text>
          <Text style={styles.txRestaurant}>@ {tx.restaurant}</Text>
        </View>

        <Text style={styles.txBoxes}>{tx.boxes} Boxes</Text>
      </View>

      {/* Bottom row: date + status */}
      <View style={styles.txBottomRow}>
        <Text style={styles.txDate}>{tx.date}</Text>
        {isFailed ? (
          <View style={styles.txFailedChip}>
            <Text style={styles.txFailedText}>Failed</Text>
          </View>
        ) : (
          <View style={styles.txCompletedChip}>
            <Ionicons name="checkmark" size={12} color="#4CAF50" />
            <Text style={styles.txCompletedText}>Completed</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────
export default function CustomerHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    customerId?: string;
    name?: string;
    phone?: string;
  }>();

  const customer: Customer = {
    id:    params.customerId ?? MOCK_CUSTOMER.id,
    name:  params.name       ?? MOCK_CUSTOMER.name,
    phone: params.phone      ?? MOCK_CUSTOMER.phone,
  };

  const [activeTab, setActiveTab]     = useState<TabType>('active');
  const [selectedTx, setSelectedTx]   = useState<Transaction | null>(null);
  const [detailVisible, setDetailVis] = useState(false);

  const openDetail = (tx: Transaction) => {
    setSelectedTx(tx);
    setDetailVis(true);
  };

  const activeCards    = MOCK_CARDS.filter(c => c.status === 'active');
  const cancelledCards = MOCK_CARDS.filter(c => c.status === 'cancelled');
  const displayCards   = activeTab === 'active'
    ? activeCards
    : activeTab === 'cancelled'
    ? cancelledCards
    : [];

  // Build flat list data
  type ListItem =
    | { kind: 'card';     card: MealCard }
    | { kind: 'txHeader' }
    | { kind: 'tx';       tx: Transaction };

  const listData: ListItem[] = [
    ...displayCards.map(card => ({ kind: 'card' as const, card })),
    { kind: 'txHeader' as const },
    ...MOCK_TRANSACTIONS.map(tx => ({ kind: 'tx' as const, tx })),
  ];

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'card')
      return <MealCardItem card={item.card} />;
    if (item.kind === 'txHeader')
      return <Text style={styles.txSectionTitle}>Recent Transactions</Text>;
    if (item.kind === 'tx')
      return <TransactionRow tx={item.tx} onPress={openDetail} />;
    return null;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWarm} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.textDark} />
          </TouchableOpacity>

          <View style={styles.customerAvatarCircle}>
            <Text style={styles.customerAvatarInitial}>
              {customer.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerPhone}>{customer.phone}</Text>
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabRow}>
          {(['active', 'cancelled', 'history'] as TabType[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={styles.tabBtn}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Content ── */}
      <View style={styles.sheet}>
        <FlatList
          data={listData}
          keyExtractor={(item, idx) => {
            if (item.kind === 'card')     return item.card.id;
            if (item.kind === 'txHeader') return 'txHeader';
            if (item.kind === 'tx')       return item.tx.id;
            return String(idx);
          }}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            activeTab !== 'history' ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="card-outline" size={48} color="#E0E0E0" />
                <Text style={styles.emptyText}>No {activeTab} cards found</Text>
              </View>
            ) : null
          }
        />
      </View>

      {/* ── Transaction Detail Modal ── */}
      <TransactionDetailModal
        tx={selectedTx}
        visible={detailVisible}
        onClose={() => setDetailVis(false)}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgWarm },

  // ── Header ──
  header: {
    backgroundColor: Colors.bgWarm,
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 3, elevation: 2,
  },
  customerAvatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  customerAvatarInitial: { fontSize: 20, fontWeight: '800', color: '#fff' },
  customerInfo:  { flex: 1 },
  customerName:  { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  customerPhone: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  // ── Tabs ──
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabText:       { fontSize: 15, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontWeight: '800' },
  tabUnderline: {
    position: 'absolute', bottom: 0,
    height: 3, width: '60%',
    backgroundColor: Colors.primary, borderRadius: 2,
  },

  // ── Sheet ──
  sheet:       { flex: 1, backgroundColor: '#fff' },
  listContent: { padding: 16, paddingBottom: 40 },

  // ── Meal Card ──
  mealCard: {
    borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 6,
  },
  mealCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  cardBadge: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  cardBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  StrikeLogo:     { fontSize: 18, fontWeight: '700', color: '#fff', fontStyle: 'italic' },
  StrikeC:        { fontSize: 22, fontWeight: '900', color: '#fff' },
  mealCardRestaurant: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 3 },
  mealCardAddress:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 16 },
  progressBarTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2, marginBottom: 14, overflow: 'hidden',
  },
  progressBarFill:   { height: 4, backgroundColor: '#fff', borderRadius: 2 },
  mealCardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  mealCardUsed:      { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  mealCardUsedCount: { fontSize: 18, fontWeight: '800', color: '#fff' },
  viewCardBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewCardText:      { fontSize: 14, fontWeight: '700', color: '#fff' },

  // ── Transactions ──
  txSectionTitle: {
    fontSize: 18, fontWeight: '800', color: Colors.textDark,
    marginTop: 8, marginBottom: 14,
  },
  txCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  txCardFailed:    { backgroundColor: '#FFF5F5', borderColor: '#FFCDD2' },
  txTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
  },
  txIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center',
  },
  txIconBoxFailed: { backgroundColor: '#FFEBEE' },
  txInfo:         { flex: 1 },
  txCardName:     { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  txRestaurant:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  txBoxes:        { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  txBottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  txDate:          { fontSize: 12, color: Colors.textMuted },
  txCompletedChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txCompletedText: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
  txFailedChip: {
    backgroundColor: '#FFCDD2', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  txFailedText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },

  // ── Empty ──
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted, fontWeight: '500' },

  // ── Modal shared ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingBottom: 0,
    maxHeight: SH * 0.9,
  },

  // Modal header
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 16,
  },
  modalHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
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

  // Customer row in modal
  customerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, marginBottom: 14,
  },
  customerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  customerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  modalCustomer:      { fontSize: 17, fontWeight: '800', color: Colors.textDark },
  modalPhone:         { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  // Status chip
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusChipSuccess: { backgroundColor: '#F0FFF4' },
  statusChipFailed:  { backgroundColor: '#FFF5F5' },
  statusChipText:    { fontSize: 12, fontWeight: '700' },

  // Info chips row
  chipsRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, marginBottom: 14,
  },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F5F5F5', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  infoChipText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },

  modalDivider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 16 },

  // Items inside modal
  itemsScroll:   { paddingHorizontal: 20, maxHeight: SH * 0.38 },
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
  qtyText:   { fontSize: 16, fontWeight: '800', color: Colors.textDark },
  itemMeta:  { flex: 1 },
  itemName:  { fontSize: 15, fontWeight: '600', color: Colors.textDark },
  addOnChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  addOnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  itemCount: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },

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

  // Fail reason
  failReasonBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF5F5', borderRadius: 12,
    borderWidth: 1, borderColor: '#FFCDD2',
    padding: 14, marginTop: 12,
  },
  failReasonText: {
    flex: 1, fontSize: 13, color: Colors.primary,
    fontWeight: '500', lineHeight: 20,
  },

  // Modal footer
  modalFooter: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  closeModalBtn: {
    backgroundColor: '#F5F5F5', borderRadius: 50,
    paddingVertical: 15, alignItems: 'center',
  },
  closeModalBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
});