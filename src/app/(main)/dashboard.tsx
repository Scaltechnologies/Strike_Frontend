import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  Animated,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Colors ────────────────────────────────────────────────────────
const COLORS = {
  bg: '#1A1A1A',
  bgCard: '#2A2A2A',
  bgSheet: '#FFFFFF',
  bgSurface: '#F6F6F6',
  primary: '#1A1A1A',
  green: '#4CAF50',
  greenLight: '#F0FFF4',
  greenDark: '#2E7D32',
  orange: '#FF9800',
  orangeLight: '#FFF3E0',
  orangeDark: '#E65100',
  red: '#E53935',
  redLight: '#FFEBEE',
  progressGreen: '#8BC34A',
  progressOrange: '#FF9800',
  progressRed: '#E53935',
  textWhite: '#FFFFFF',
  textLight: '#CCCCCC',
  textMuted: '#888888',
  textDark: '#1A1A1A',
  textSecondary: '#555555',
  border: '#EEEEEE',
  borderMid: '#E0E0E0',
  handle: '#E0E0E0',
};

// ─── Types ──────────────────────────────────────────────────────────
type CardType = 'Breakfast' | 'All In One';
type CardStatus = 'active' | 'month' | 'expired';
type FilterTab = 'all' | 'active' | 'month' | 'expired';
type SortKey = 'date' | 'name' | 'usage';

interface OrderItem {
  name: string;
  price: number;
}

interface MealCard {
  id: string;
  cardId: string;
  customer: string;
  phone: string;
  date: string;
  type: CardType;
  status: CardStatus;
  meals: number;
  usedMeals: number;
  amount: number;
  items: OrderItem[];
  validUntil: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────
const MOCK_CARDS: MealCard[] = [
  {
    id: '1', cardId: 'AMC102929', customer: 'Abhiram', phone: '+91 98765 43210',
    date: 'Dec 28, 2025', type: 'Breakfast', status: 'active',
    meals: 28, usedMeals: 21, amount: 1200, validUntil: 'Jan 28, 2026',
    items: [{ name: 'Idli Sambar', price: 80 }, { name: 'Vada', price: 40 }, { name: 'Filter Coffee', price: 30 }],
  },
  {
    id: '2', cardId: 'AC1093929', customer: 'Shreya', phone: '+91 91234 56789',
    date: 'Dec 28, 2025', type: 'All In One', status: 'active',
    meals: 90, usedMeals: 62, amount: 3500, validUntil: 'Jan 28, 2026',
    items: [{ name: 'Breakfast Combo', price: 120 }, { name: 'Lunch Thali', price: 180 }, { name: 'Dinner', price: 150 }],
  },
  {
    id: '3', cardId: 'AC1093928', customer: 'Arjunkumar', phone: '+91 99887 76655',
    date: 'Dec 28, 2025', type: 'All In One', status: 'active',
    meals: 90, usedMeals: 45, amount: 3500, validUntil: 'Jan 28, 2026',
    items: [{ name: 'Breakfast Combo', price: 120 }, { name: 'Lunch Thali', price: 180 }, { name: 'Snack Box', price: 80 }],
  },
  {
    id: '4', cardId: 'AMC102010', customer: 'Ravi', phone: '+91 97654 32101',
    date: 'Dec 27, 2025', type: 'Breakfast', status: 'month',
    meals: 28, usedMeals: 28, amount: 1200, validUntil: 'Dec 31, 2025',
    items: [{ name: 'Idli Sambar', price: 80 }, { name: 'Poha', price: 60 }, { name: 'Tea', price: 20 }],
  },
  {
    id: '5', cardId: 'AC1091100', customer: 'Priya', phone: '+91 90011 22334',
    date: 'Dec 27, 2025', type: 'All In One', status: 'month',
    meals: 90, usedMeals: 90, amount: 3500, validUntil: 'Dec 31, 2025',
    items: [{ name: 'Breakfast Combo', price: 120 }, { name: 'Lunch Thali', price: 180 }, { name: 'Dinner', price: 150 }],
  },
  {
    id: '6', cardId: 'AMC103000', customer: 'Karan', phone: '+91 88765 43219',
    date: 'Dec 26, 2025', type: 'Breakfast', status: 'month',
    meals: 28, usedMeals: 19, amount: 1200, validUntil: 'Dec 31, 2025',
    items: [{ name: 'Upma', price: 70 }, { name: 'Juice', price: 50 }, { name: 'Boiled Eggs', price: 30 }],
  },
  {
    id: '7', cardId: 'AC1093100', customer: 'Neha', phone: '+91 77654 32198',
    date: 'Dec 25, 2025', type: 'All In One', status: 'month',
    meals: 90, usedMeals: 78, amount: 3500, validUntil: 'Dec 31, 2025',
    items: [{ name: 'Breakfast Combo', price: 120 }, { name: 'Lunch Thali', price: 180 }, { name: 'Evening Snack', price: 90 }],
  },
  {
    id: '8', cardId: 'AMC104010', customer: 'Suresh', phone: '+91 66543 21987',
    date: 'Dec 24, 2025', type: 'Breakfast', status: 'expired',
    meals: 28, usedMeals: 28, amount: 1200, validUntil: 'Dec 24, 2025',
    items: [{ name: 'Idli Sambar', price: 80 }, { name: 'Filter Coffee', price: 30 }],
  },
];

const STATS = {
  revenue: '₹20,000',
  cardsSold: '1,042',
  breakdown: [
    { label: 'Breakfast', emoji: '🥞', amount: '₹12,000', count: '600', progress: 0.75, color: COLORS.progressGreen },
    { label: 'All In One', emoji: '☀️', amount: '₹8,000', count: '442', progress: 0.55, color: COLORS.progressOrange },
  ],
};

// ─── Helpers ───────────────────────────────────────────────────────
function usagePct(card: MealCard): number {
  return Math.round((card.usedMeals / card.meals) * 100);
}

function progressColor(pct: number): string {
  if (pct >= 100) return COLORS.progressRed;
  if (pct >= 75) return COLORS.progressOrange;
  return COLORS.progressGreen;
}

function statusConfig(status: CardStatus) {
  switch (status) {
    case 'active':  return { color: COLORS.green,  bg: COLORS.greenLight,  label: 'Active'     };
    case 'month':   return { color: COLORS.orange, bg: COLORS.orangeLight, label: 'This Month' };
    case 'expired': return { color: COLORS.red,    bg: COLORS.redLight,    label: 'Expired'    };
  }
}

// ─── Sub-components ────────────────────────────────────────────────

function StatHeader({ period, onPeriodPress }: { period: string; onPeriodPress: () => void }) {
  return (
    <View style={styles.statHeader}>
      <View style={styles.statTopRow}>
        <Text style={styles.pageTitle}>Dashboard</Text>
        <TouchableOpacity style={styles.periodPill} onPress={onPeriodPress}>
          <Text style={styles.periodText}>{period}</Text>
          <Ionicons name="chevron-down" size={12} color="#aaa" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      <View style={styles.bigNumRow}>
        <View style={styles.statBox}>
          <Text style={styles.bigNum}>{STATS.revenue}</Text>
          <Text style={styles.bigNumLabel}>Total Revenue</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.bigNum}>{STATS.cardsSold}</Text>
          <Text style={styles.bigNumLabel}>Cards Sold</Text>
        </View>
      </View>

      <View style={styles.breakdown}>
        {STATS.breakdown.map((item) => (
          <View key={item.label} style={styles.breakdownItem}>
            <View style={styles.breakdownLabelRow}>
              <Text style={styles.breakdownLabel}>{item.emoji}  {item.label}</Text>
              <Text style={styles.breakdownAmount}>
                {item.amount}{'  '}
                <Text style={styles.breakdownCount}>({item.count})</Text>
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${item.progress * 100}%` as any, backgroundColor: item.color }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function TypeBadge({ type }: { type: CardType }) {
  const isB = type === 'Breakfast';
  return (
    <View style={[styles.badge, isB ? styles.badgeBreakfast : styles.badgeAllInOne]}>
      <Text style={[styles.badgeText, isB ? styles.badgeTextBreakfast : styles.badgeTextAllInOne]}>
        {type}
      </Text>
    </View>
  );
}

function StatusPill({ status }: { status: CardStatus }) {
  const cfg = statusConfig(status);
  return (
    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function UsageBar({ card }: { card: MealCard }) {
  const pct = usagePct(card);
  const color = progressColor(pct);
  return (
    <View style={styles.usageWrap}>
      <View style={styles.usageLabelRow}>
        <Text style={styles.usageLabel}>Meal usage</Text>
        <Text style={styles.usageCount}>{card.usedMeals}/{card.meals}  ({pct}%)</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Order Detail Modal ────────────────────────────────────────────
function OrderModal({ card, visible, onClose, onRenew, onSuspend }: {
  card: MealCard | null;
  visible: boolean;
  onClose: () => void;
  onRenew: (card: MealCard) => void;
  onSuspend: (card: MealCard) => void;
}) {
  if (!card) return null;
  const pct = usagePct(card);
  const color = progressColor(pct);
  const dailySpend = card.items.reduce((a, i) => a + i.price, 0);
  const remaining = card.meals - card.usedMeals;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalIcon, card.type === 'Breakfast' ? styles.cardIconBreakfast : styles.cardIconAllInOne]}>
              <Text style={styles.modalIconEmoji}>{card.type === 'Breakfast' ? '🥞' : '☀️'}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.modalCardId}>{card.cardId}</Text>
              <Text style={styles.modalCustomer}>{card.customer}</Text>
              <Text style={styles.modalPhone}>{card.phone}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <TypeBadge type={card.type} />
              <StatusPill status={card.status} />
            </View>
          </View>

          <View style={styles.modalDivider} />

          {/* Stats row */}
          <View style={styles.modalStatRow}>
            <View style={styles.modalStat}>
              <Text style={styles.modalStatVal}>₹{card.amount.toLocaleString()}</Text>
              <Text style={styles.modalStatLbl}>Card Value</Text>
            </View>
            <View style={styles.modalStatDivider} />
            <View style={styles.modalStat}>
              <Text style={styles.modalStatVal}>{remaining}</Text>
              <Text style={styles.modalStatLbl}>Meals Left</Text>
            </View>
            <View style={styles.modalStatDivider} />
            <View style={styles.modalStat}>
              <Text style={styles.modalStatVal}>{pct}%</Text>
              <Text style={styles.modalStatLbl}>Used</Text>
            </View>
          </View>

          {/* Usage bar */}
          <View style={styles.modalSection}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
            </View>
            <Text style={styles.modalValidUntil}>Valid until {card.validUntil}</Text>
          </View>

          <View style={styles.modalDivider} />

          {/* Order breakdown */}
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Order Breakdown</Text>
            {card.items.map((item, i) => (
              <View key={i} style={styles.orderItem}>
                <View style={styles.orderDot} />
                <Text style={styles.orderItemName}>{item.name}</Text>
                <Text style={styles.orderItemPrice}>₹{item.price}</Text>
              </View>
            ))}
            <View style={styles.orderTotal}>
              <Text style={styles.orderTotalLabel}>Avg daily spend</Text>
              <Text style={styles.orderTotalValue}>₹{dailySpend}</Text>
            </View>
          </View>

          <View style={styles.modalDivider} />

          {/* Dates */}
          <View style={[styles.modalSection, { flexDirection: 'row', justifyContent: 'space-between' }]}>
            <View>
              <Text style={styles.dateLbl}>Purchase date</Text>
              <Text style={styles.dateVal}>{card.date}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.dateLbl}>Valid until</Text>
              <Text style={styles.dateVal}>{card.validUntil}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnRenew]}
              onPress={() => { onClose(); onRenew(card); }}
            >
              <Ionicons name="refresh" size={15} color={COLORS.textWhite} />
              <Text style={styles.actionBtnTextLight}>Renew Card</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSuspend]}
              onPress={() => { onClose(); onSuspend(card); }}
            >
              <Ionicons name="ban-outline" size={15} color={COLORS.red} />
              <Text style={styles.actionBtnTextDanger}>Suspend</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Card Item ─────────────────────────────────────────────────────
function CardItem({ item, onPress }: { item: MealCard; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.cardItem} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardItemRow}>
        <View style={[styles.cardIcon, item.type === 'Breakfast' ? styles.cardIconBreakfast : styles.cardIconAllInOne]}>
          <Text style={styles.cardIconEmoji}>{item.type === 'Breakfast' ? '🥞' : '☀️'}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cardId}>{item.cardId}</Text>
          <Text style={styles.cardCustomer}>@{item.customer}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <TypeBadge type={item.type} />
          <StatusPill status={item.status} />
        </View>
      </View>

      <UsageBar card={item} />

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{item.date}</Text>
        <Text style={styles.cardAmount}>₹{item.amount.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter Tabs ───────────────────────────────────────────────────
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',     label: 'All'        },
  { key: 'active',  label: 'Active'     },
  { key: 'month',   label: 'This Month' },
  { key: 'expired', label: 'Expired'    },
];

// ─── Sort Sheet ────────────────────────────────────────────────────
function SortSheet({ visible, current, onSelect, onClose }: {
  visible: boolean;
  current: SortKey;
  onSelect: (k: SortKey) => void;
  onClose: () => void;
}) {
  const options: { key: SortKey; label: string; icon: string }[] = [
    { key: 'date',  label: 'Purchase date (newest)', icon: 'calendar-outline'   },
    { key: 'name',  label: 'Customer name (A–Z)',     icon: 'person-outline'     },
    { key: 'usage', label: 'Usage % (highest)',       icon: 'stats-chart-outline'},
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { paddingBottom: 30 }]} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalSectionTitle, { marginBottom: 16, marginTop: 4 }]}>Sort by</Text>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={styles.sortOption}
              onPress={() => { onSelect(opt.key); onClose(); }}
            >
              <Ionicons name={opt.icon as any} size={18} color={current === opt.key ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.sortOptionText, current === opt.key && styles.sortOptionTextActive]}>
                {opt.label}
              </Text>
              {current === opt.key && (
                <Ionicons name="checkmark" size={18} color={COLORS.primary} style={{ marginLeft: 'auto' as any }} />
              )}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Period Sheet ──────────────────────────────────────────────────
function PeriodSheet({ visible, current, onSelect, onClose }: {
  visible: boolean;
  current: string;
  onSelect: (p: string) => void;
  onClose: () => void;
}) {
  const periods = ['This Month', 'Last Month', 'Last 3 Months', 'This Year'];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { paddingBottom: 30 }]} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalSectionTitle, { marginBottom: 16, marginTop: 4 }]}>Select Period</Text>
          {periods.map(p => (
            <TouchableOpacity
              key={p}
              style={styles.sortOption}
              onPress={() => { onSelect(p); onClose(); }}
            >
              <Ionicons name="time-outline" size={18} color={current === p ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.sortOptionText, current === p && styles.sortOptionTextActive]}>{p}</Text>
              {current === p && (
                <Ionicons name="checkmark" size={18} color={COLORS.primary} style={{ marginLeft: 'auto' as any }} />
              )}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────
export default function DashboardScreen() {
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<FilterTab>('all');
  const [sort, setSort]             = useState<SortKey>('date');
  const [period, setPeriod]         = useState('This Month');
  const [selectedCard, setSelected] = useState<MealCard | null>(null);
  const [showSort, setShowSort]     = useState(false);
  const [showPeriod, setShowPeriod] = useState(false);

  // Counts
  const countFor = (k: FilterTab) =>
    k === 'all' ? MOCK_CARDS.length : MOCK_CARDS.filter(c => c.status === k).length;

  // Filter + search + sort
  const displayed = [...MOCK_CARDS]
    .filter(c => {
      const matchTab    = filter === 'all' || c.status === filter;
      const q           = search.toLowerCase();
      const matchSearch = !q || c.cardId.toLowerCase().includes(q) || c.customer.toLowerCase().includes(q);
      return matchTab && matchSearch;
    })
    .sort((a, b) => {
      if (sort === 'name')  return a.customer.localeCompare(b.customer);
      if (sort === 'usage') return usagePct(b) - usagePct(a);
      return parseInt(b.id) - parseInt(a.id); // date (newest first by id proxy)
    });

  function handleRenew(card: MealCard) {
    Alert.alert('Renew Card', `Renew ${card.cardId} for ${card.customer}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Renew', style: 'default', onPress: () => Alert.alert('Success', 'Card renewed!') },
    ]);
  }

  function handleSuspend(card: MealCard) {
    Alert.alert('Suspend Card', `Suspend ${card.cardId}? This will deactivate the card.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => Alert.alert('Done', 'Card suspended.') },
    ]);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── Dark top ── */}
      <SafeAreaView style={styles.darkSection}>
        <StatHeader period={period} onPeriodPress={() => setShowPeriod(true)} />
      </SafeAreaView>

      {/* ── White sheet ── */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Search + Sort row */}
        <View style={styles.searchSortRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={15} color={COLORS.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search card ID or customer…"
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(true)}>
            <Ionicons name="funnel-outline" size={16} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.filterBadge, filter === tab.key && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, filter === tab.key && styles.filterBadgeTextActive]}>
                  {countFor(tab.key)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Result count */}
        <Text style={styles.resultCount}>{displayed.length} card{displayed.length !== 1 ? 's' : ''}</Text>

        {/* List */}
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CardItem item={item} onPress={() => setSelected(item)} />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No cards found</Text>
              <Text style={styles.emptyHint}>Try adjusting your search or filter</Text>
            </View>
          }
        />
      </View>

      {/* Modals */}
      <OrderModal
        card={selectedCard}
        visible={!!selectedCard}
        onClose={() => setSelected(null)}
        onRenew={handleRenew}
        onSuspend={handleSuspend}
      />
      <SortSheet
        visible={showSort}
        current={sort}
        onSelect={setSort}
        onClose={() => setShowSort(false)}
      />
      <PeriodSheet
        visible={showPeriod}
        current={period}
        onSelect={setPeriod}
        onClose={() => setShowPeriod(false)}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  darkSection: { backgroundColor: COLORS.bg },

  // Stat header
  statHeader:       { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 20 },
  statTopRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  pageTitle:        { color: COLORS.textWhite, fontSize: 26, fontWeight: '800' },
  periodPill:       { backgroundColor: COLORS.bgCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: '#444' },
  periodText:       { color: '#ccc', fontSize: 13, fontWeight: '500' },

  bigNumRow:        { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox:          { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14 },
  bigNum:           { color: COLORS.textWhite, fontSize: 26, fontWeight: '800' },
  bigNumLabel:      { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },

  breakdown:        { gap: 12 },
  breakdownItem:    {},
  breakdownLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  breakdownLabel:   { color: '#ddd', fontSize: 13, fontWeight: '500' },
  breakdownAmount:  { color: COLORS.textWhite, fontSize: 13, fontWeight: '600' },
  breakdownCount:   { color: COLORS.textMuted, fontWeight: '400' },
  progressTrack:    { height: 6, backgroundColor: '#333', borderRadius: 3, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 3 },

  // Sheet
  sheet: {
    flex: 1,
    backgroundColor: COLORS.bgSheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.handle, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },

  // Search + Sort
  searchSortRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgSurface, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 0.5, borderColor: COLORS.borderMid,
  },
  searchInput:  { flex: 1, fontSize: 13, color: COLORS.textDark },
  sortBtn:      { backgroundColor: COLORS.bgSurface, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.borderMid },

  // Filter
  filterRow:            { paddingBottom: 2, gap: 8, marginBottom: 10 },
  filterTab:            { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: COLORS.borderMid },
  filterTabActive:      { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterTabText:        { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTabTextActive:  { color: COLORS.textWhite },
  filterBadge:          { backgroundColor: COLORS.bgSurface, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 1 },
  filterBadgeActive:    { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterBadgeText:      { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  filterBadgeTextActive:{ color: COLORS.textWhite },

  resultCount: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },

  // Card item
  cardItem: {
    borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 16,
    padding: 14, marginBottom: 10, backgroundColor: COLORS.bgSheet,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardItemRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardIcon:          { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardIconBreakfast: { backgroundColor: '#FFF8E1' },
  cardIconAllInOne:  { backgroundColor: '#1A1A1A' },
  cardIconEmoji:     { fontSize: 22 },
  cardId:            { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  cardCustomer:      { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardFooter:        { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardDate:          { fontSize: 12, color: COLORS.textMuted },
  cardAmount:        { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  // Usage
  usageWrap:     {},
  usageLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  usageLabel:    { fontSize: 11, color: COLORS.textMuted },
  usageCount:    { fontSize: 11, color: COLORS.textMuted },

  // Badge
  badge:               { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 0.5 },
  badgeBreakfast:      { backgroundColor: COLORS.greenLight, borderColor: COLORS.green },
  badgeAllInOne:       { backgroundColor: COLORS.bg, borderColor: COLORS.bg },
  badgeText:           { fontSize: 11, fontWeight: '600' },
  badgeTextBreakfast:  { color: COLORS.greenDark },
  badgeTextAllInOne:   { color: COLORS.textWhite },

  // Status pill
  statusPill:     { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  statusDot:      { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '600' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 50, gap: 8 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  emptyHint: { fontSize: 13, color: COLORS.textMuted },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.bgSheet,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  modalHandle:   { width: 40, height: 4, backgroundColor: COLORS.handle, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalHeader:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  modalIcon:     { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalIconEmoji:{ fontSize: 26 },
  modalCardId:   { fontSize: 17, fontWeight: '800', color: COLORS.textDark },
  modalCustomer: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  modalPhone:    { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  modalDivider:  { height: 0.5, backgroundColor: COLORS.border, marginVertical: 14 },

  modalStatRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  modalStat:       { flex: 1, alignItems: 'center' },
  modalStatVal:    { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  modalStatLbl:    { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  modalStatDivider:{ width: 0.5, height: 36, backgroundColor: COLORS.border },

  modalSection:      { marginBottom: 4 },
  modalSectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  modalValidUntil:   { fontSize: 11, color: COLORS.textMuted, marginTop: 6, textAlign: 'right' },

  // Order items
  orderItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  orderDot:       { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.border },
  orderItemName:  { flex: 1, fontSize: 14, color: COLORS.textDark },
  orderItemPrice: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  orderTotal:     { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  orderTotalLabel:{ fontSize: 13, fontWeight: '600', color: COLORS.textDark },
  orderTotalValue:{ fontSize: 14, fontWeight: '800', color: COLORS.textDark },

  // Dates
  dateLbl: { fontSize: 11, color: COLORS.textMuted },
  dateVal: { fontSize: 13, fontWeight: '600', color: COLORS.textDark, marginTop: 2 },

  // Modal actions
  modalActions:      { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  actionBtnRenew:    { backgroundColor: COLORS.primary },
  actionBtnSuspend:  { borderWidth: 1, borderColor: COLORS.red },
  actionBtnTextLight:{ color: COLORS.textWhite, fontWeight: '600', fontSize: 14 },
  actionBtnTextDanger:{ color: COLORS.red, fontWeight: '600', fontSize: 14 },

  // Sort sheet
  sortOption:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  sortOptionText:      { fontSize: 14, color: COLORS.textSecondary, flex: 1 },
  sortOptionTextActive:{ color: COLORS.textDark, fontWeight: '600' },
});