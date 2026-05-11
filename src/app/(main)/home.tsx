import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../core/constants/colors';

// ─── Types ─────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  name: string;
  qty: number;
  addOn?: string;
  addOnPrice?: number;
  category?: string;
}

interface RedemptionOrder {
  id: string;
  cardId: string;
  customer: string;
  customerHandle: string;
  phone: string;
  cardType: string;
  timeAgo: string;
  orderedAt: string;
  items: OrderItem[];
  totalUnits: number;
  totalValue: number;
  addOnTotal: number;
  status: 'pending' | 'accepted';
}

// ─── Mock Data ─────────────────────────────────────────────────────
const VENDOR = {
  name: 'Sri Raghava Curry Point',
  address: 'RTC Crossroads',
};

const MOCK_ORDERS: RedemptionOrder[] = [
  {
    id: '1',
    cardId: '#C1235',
    customer: 'Dheeraj',
    customerHandle: '@dheeraj',
    phone: '9001293838',
    cardType: 'Meal Card',
    timeAgo: '2 mins ago',
    orderedAt: '23rd Jan, 2026',
    items: [
      { id: 'i1', name: 'Veg Curry', qty: 2, category: 'Main Course' },
      { id: 'i2', name: 'Chicken Curry', qty: 1, category: 'Main Course', addOn: '₹50 Add-on', addOnPrice: 50 },
      { id: 'i3', name: 'Butter Naan', qty: 4, category: 'Bread' },
      { id: 'i4', name: 'Lassi', qty: 2, category: 'Beverage' },
    ],
    totalUnits: 9,
    totalValue: 110,
    addOnTotal: 50,
    status: 'pending',
  },
  {
    id: '2',
    cardId: '#C1236',
    customer: 'Arjun K.',
    customerHandle: '@arjun_k',
    phone: '9001293839',
    cardType: 'All In One Card',
    timeAgo: '5 mins ago',
    orderedAt: '23rd Jan, 2026',
    items: [
      { id: 'i5', name: 'Paneer Curry', qty: 1, category: 'Main Course' },
      { id: 'i6', name: 'Mutton Curry', qty: 1, category: 'Main Course', addOn: '₹120 Add-on', addOnPrice: 120 },
      { id: 'i7', name: 'Chicken Curries', qty: 4, category: 'Main Course', addOn: '₹200 Add-on', addOnPrice: 200 },
      { id: 'i8', name: 'Roti', qty: 6, category: 'Bread' },
      { id: 'i9', name: 'Dal Fry', qty: 2, category: 'Main Course' },
    ],
    totalUnits: 15,
    totalValue: 950,
    addOnTotal: 320,
    status: 'pending',
  },
  {
    id: '3',
    cardId: '#C1237',
    customer: 'Priya Sharma',
    customerHandle: '@priya_s',
    phone: '9001293840',
    cardType: 'Breakfast Card',
    timeAgo: '8 mins ago',
    orderedAt: '23rd Jan, 2026',
    items: [
      { id: 'i10', name: 'Idli', qty: 4, category: 'Breakfast' },
      { id: 'i11', name: 'Vada', qty: 2, category: 'Breakfast' },
      { id: 'i12', name: 'Sambar', qty: 1, category: 'Side' },
      { id: 'i13', name: 'Chutney', qty: 1, category: 'Side' },
    ],
    totalUnits: 8,
    totalValue: 80,
    addOnTotal: 0,
    status: 'pending',
  },
  {
    id: '4',
    cardId: '#C1238',
    customer: 'Rahul Mehta',
    customerHandle: '@rahul_m',
    phone: '9001293841',
    cardType: 'Meal Card',
    timeAgo: '12 mins ago',
    orderedAt: '23rd Jan, 2026',
    items: [
      { id: 'i14', name: 'Butter Naan', qty: 4, category: 'Bread' },
      { id: 'i15', name: 'Paneer', qty: 2, category: 'Main Course' },
    ],
    totalUnits: 6,
    totalValue: 160,
    addOnTotal: 0,
    status: 'accepted',
  },
];

// ─── Confirm Strike Modal ──────────────────────────────────────────
function ConfirmStrikeModal({
  order,
  visible,
  onClose,
  onConfirm,
}: {
  order: RedemptionOrder | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}) {
  const { height: SH } = useWindowDimensions();

  if (!order) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalDismiss} onPress={onClose} activeOpacity={1} />

        <View style={[styles.confirmSheet, { maxHeight: SH * 0.88 }]}>
          <View style={styles.modalHandle} />

          {/* Icon + Title */}
          <View style={styles.confirmIconWrap}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="shield-checkmark-outline" size={36} color="#4CAF50" />
            </View>
          </View>
          <Text style={styles.confirmSheetTitle}>Confirm Strike?</Text>
          <Text style={styles.confirmSheetSubtitle}>
            You are about to confirm this redemption.{'\n'}This action cannot be undone.
          </Text>

          {/* Order summary card */}
          <View style={styles.confirmSummaryCard}>
            <View style={styles.confirmSummaryTop}>
              <View style={styles.cardTypePill}>
                <Text style={styles.cardTypePillText} numberOfLines={1} ellipsizeMode="tail">
                  {order.cardType}
                </Text>
              </View>
              <Text style={styles.confirmSummaryCardId} numberOfLines={1} ellipsizeMode="tail">
                {order.cardId}
              </Text>
            </View>

            <View style={styles.confirmSummaryDivider} />

            <View style={styles.confirmSummaryRow}>
              <View style={styles.confirmSummaryLabelWrap}>
                <Ionicons name="person-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.confirmSummaryLabel}>Customer</Text>
              </View>
              <Text style={styles.confirmSummaryValue} numberOfLines={1} ellipsizeMode="tail">
                {order.customer}
              </Text>
            </View>

            <View style={styles.confirmSummaryDivider} />

            <View style={styles.confirmSummaryRow}>
              <View style={styles.confirmSummaryLabelWrap}>
                <Ionicons name="fast-food-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.confirmSummaryLabel}>Total Items</Text>
              </View>
              <Text style={styles.confirmSummaryValue}>{order.totalUnits} units</Text>
            </View>

            <View style={styles.confirmSummaryDivider} />

            <View style={styles.confirmSummaryRow}>
              <View style={styles.confirmSummaryLabelWrap}>
                <Ionicons name="pricetag-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.confirmSummaryLabel}>Total Value</Text>
              </View>
              <Text style={styles.confirmSummaryTotal}>₹{order.totalValue}</Text>
            </View>

            {order.addOnTotal > 0 && (
              <>
                <View style={styles.confirmSummaryDivider} />
                <View style={styles.confirmSummaryRow}>
                  <View style={styles.confirmSummaryLabelWrap}>
                    <Ionicons name="add-circle-outline" size={14} color={Colors.primary} />
                    <Text style={styles.confirmSummaryLabel}>Add-ons</Text>
                  </View>
                  <Text style={[styles.confirmSummaryValue, { color: Colors.primary }]}>
                    +₹{order.addOnTotal}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.confirmActions}>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmProceedBtn}
              onPress={() => {
                onConfirm(order.id);
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmProceedText}>Yes, Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Order Accepted Success Modal ──────────────────────────────────
function OrderAcceptedModal({
  order,
  visible,
  onClose,
}: {
  order: RedemptionOrder | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { height: SH } = useWindowDimensions();

  if (!order) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalDismiss} onPress={onClose} activeOpacity={1} />

        <View style={[styles.successSheet, { maxHeight: SH * 0.85 }]}>
          <View style={styles.modalHandle} />

          <View style={styles.successIconWrap}>
            <View style={styles.successBadgeOuter}>
              <View style={styles.successBadgeInner}>
                <Ionicons name="checkmark" size={44} color="#fff" />
              </View>
            </View>
          </View>

          <Text style={styles.successTitle}>Order Accepted</Text>

          <View style={styles.successCard}>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Order id</Text>
              <Text style={styles.successValue} numberOfLines={1} ellipsizeMode="tail">
                {order.cardId}
              </Text>
            </View>
            <View style={styles.successDivider} />
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Order Value</Text>
              <Text style={styles.successValue}>₹{order.totalValue}</Text>
            </View>
            <View style={styles.successDivider} />
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Ordered By</Text>
              <Text style={styles.successValue} numberOfLines={1} ellipsizeMode="tail">
                {order.customerHandle}
              </Text>
            </View>
            <View style={styles.successDivider} />
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Ordered At</Text>
              <Text style={styles.successValue} numberOfLines={1} ellipsizeMode="tail">
                {order.orderedAt}
              </Text>
            </View>
          </View>

          <View style={{ height: 32 }} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Order Preview Modal ────────────────────────────────────────────
function OrderPreviewModal({
  order,
  visible,
  onClose,
  onConfirmRequest,
  onReject,
}: {
  order: RedemptionOrder | null;
  visible: boolean;
  onClose: () => void;
  onConfirmRequest: (order: RedemptionOrder) => void;
  onReject: (id: string) => void;
}) {
  const { height: SH } = useWindowDimensions();

  if (!order) return null;

  const isAccepted = order.status === 'accepted';

  const grouped = order.items.reduce<Record<string, OrderItem[]>>((acc, item) => {
    const cat = item.category ?? 'Items';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
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

        <View style={[styles.modalSheet, { maxHeight: SH * 0.92 }]}>
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.cardTypePill}>
                <Text style={styles.cardTypePillText} numberOfLines={1} ellipsizeMode="tail">
                  {order.cardType}
                </Text>
              </View>
              <Text style={styles.modalCardId} numberOfLines={1} ellipsizeMode="tail">
                {order.cardId}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={Colors.textDark} />
            </TouchableOpacity>
          </View>

          {/* Customer info */}
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>
                {order.customer.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.modalCustomer} numberOfLines={1} ellipsizeMode="tail">
                {order.customer}
              </Text>
              <Text style={styles.modalPhone} numberOfLines={1} ellipsizeMode="tail">
                {order.phone}
              </Text>
            </View>
            <View style={styles.timeChip}>
              <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.timeChipText} numberOfLines={1}>{order.timeAgo}</Text>
            </View>
          </View>

          <View style={styles.modalDivider} />

          {/* Items list */}
          <ScrollView
            style={[styles.itemsScroll, { maxHeight: SH * 0.42 }]}
            showsVerticalScrollIndicator={false}
          >
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
                      <Text style={styles.itemName} numberOfLines={2} ellipsizeMode="tail">
                        {item.name}
                      </Text>
                      {item.addOn && (
                        <View style={styles.addOnChip}>
                          <Ionicons name="add-circle-outline" size={12} color={Colors.primary} />
                          <Text style={styles.addOnText} numberOfLines={1} ellipsizeMode="tail">
                            {item.addOn}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemCount}>×{item.qty}</Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Summary */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Base Items</Text>
                <Text style={styles.summaryValue}>{order.totalUnits} units</Text>
              </View>
              {order.addOnTotal > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Add-on Charges</Text>
                  <Text style={[styles.summaryValue, { color: Colors.primary }]}>
                    +₹{order.addOnTotal}
                  </Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryTotalLabel}>Total Value</Text>
                <Text style={styles.summaryTotalValue}>₹{order.totalValue}</Text>
              </View>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Actions */}
          {isAccepted ? (
            <View style={styles.modalActions}>
              <View style={styles.confirmedBanner}>
                <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                <Text style={styles.confirmedBannerText}>Strike Already Confirmed</Text>
              </View>
            </View>
          ) : (
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.rejectModalBtn}
                onPress={() => {
                  onClose();
                  Alert.alert('Reject Request', 'Are you sure?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reject', style: 'destructive', onPress: () => onReject(order.id) },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.rejectModalText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmModalBtn}
                onPress={() => {
                  onClose();
                  onConfirmRequest(order);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.confirmModalText}>Confirm Strike</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Active Redemption Card ─────────────────────────────────────────
function ActiveRedemptionCard({
  order,
  onPreview,
  onConfirmRequest,
  onReject,
}: {
  order: RedemptionOrder;
  onPreview: (order: RedemptionOrder) => void;
  onConfirmRequest: (order: RedemptionOrder) => void;
  onReject: (id: string) => void;
}) {
  const visibleItems = order.items.slice(0, 2);
  const extraCount = order.items.length - 2;

  return (
    <View style={styles.redemptionCard}>
      <Text style={styles.sectionLabel}>ACTIVE REDEMPTION</Text>

      <View style={styles.redemptionTopRow}>
        <Text style={styles.cardIdText} numberOfLines={1} ellipsizeMode="tail">
          CARD ID: {order.cardId}
        </Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.timeAgo} numberOfLines={1}>{order.timeAgo}</Text>
        </View>
      </View>

      <Text style={styles.customerName} numberOfLines={1} ellipsizeMode="tail">
        Customer: {order.customer}
      </Text>

      {/* Items grid preview */}
      <View style={styles.itemsGrid}>
        {visibleItems.map((item, idx) => (
          <View
            key={item.id}
            style={[
              styles.itemCard,
              idx === 0 && styles.itemCardBorderRight,
            ]}
          >
            <Text style={styles.itemQty}>{item.qty}</Text>
            <Text style={styles.itemNameGrid} numberOfLines={2} ellipsizeMode="tail">
              {item.name}
            </Text>
            {item.addOn && (
              <Text style={styles.itemAddOn} numberOfLines={1} ellipsizeMode="tail">
                {item.addOn}
              </Text>
            )}
          </View>
        ))}
        {extraCount > 0 && (
          <View style={styles.extraCard}>
            <Text style={styles.extraCount}>+{extraCount}</Text>
            <Text style={styles.extraLabel}>more{'\n'}items</Text>
          </View>
        )}
      </View>

      {/* Preview button */}
      <TouchableOpacity
        style={styles.previewBtn}
        onPress={() => onPreview(order)}
        activeOpacity={0.8}
      >
        <Ionicons name="eye-outline" size={16} color={Colors.accent} />
        <Text style={styles.previewBtnText}>Preview Full Order</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
      </TouchableOpacity>

      {/* Totals */}
      <View style={styles.totalsRow}>
        <View style={styles.totalsBlock}>
          <Text style={styles.totalsLabel}>TOTAL UNITS</Text>
          <Text style={styles.totalsValue}>{order.totalUnits} Items</Text>
        </View>
        <View style={styles.totalsBlockRight}>
          <Text style={styles.totalsLabel}>TOTAL VALUE</Text>
          <Text style={styles.totalsValue}>₹{order.totalValue}</Text>
        </View>
      </View>

      {/* Confirm */}
      <TouchableOpacity
        style={styles.confirmBtn}
        onPress={() => onConfirmRequest(order)}
        activeOpacity={0.85}
      >
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.confirmBtnText}>Confirm Strike</Text>
      </TouchableOpacity>

      {/* Reject */}
      <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(order.id)} activeOpacity={0.7}>
        <Text style={styles.rejectBtnText}>Reject Request</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Queue Item ─────────────────────────────────────────────────────
function QueueItem({
  order,
  onPreview,
}: {
  order: RedemptionOrder;
  onPreview: (o: RedemptionOrder) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.queueItem}
      onPress={() => onPreview(order)}
      activeOpacity={0.7}
    >
      <View style={styles.queueLeft}>
        <Text style={styles.queueCardId} numberOfLines={1} ellipsizeMode="tail">
          {order.cardId}
        </Text>
        <Text style={styles.queueCustomer} numberOfLines={1} ellipsizeMode="tail">
          {order.customer}
        </Text>
        <Text style={styles.queueMeta} numberOfLines={1} ellipsizeMode="tail">
          {order.totalUnits} Items · ₹{order.totalValue}
        </Text>
      </View>
      <View style={styles.queueRight}>
        <Ionicons name="eye-outline" size={16} color={Colors.textMuted} />
        <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────
export default function HomeScreen() {
  const { height: SH } = useWindowDimensions();

  const [orders, setOrders] = useState<RedemptionOrder[]>(MOCK_ORDERS);
  const [filter, setFilter] = useState<'pending' | 'accepted'>('pending');
  const [previewOrder, setPreview] = useState<RedemptionOrder | null>(null);
  const [modalVisible, setModal] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState<RedemptionOrder | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successOrder, setSuccessOrder] = useState<RedemptionOrder | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const acceptedOrders = orders.filter(o => o.status === 'accepted');
  const activeOrder = pendingOrders[0] ?? null;
  const queueOrders = pendingOrders.slice(1);

  const openPreview = (order: RedemptionOrder) => {
    const latest = orders.find(o => o.id === order.id) ?? order;
    setPreview(latest);
    setModal(true);
  };

  const openConfirmDialog = (order: RedemptionOrder) => {
    const latest = orders.find(o => o.id === order.id) ?? order;
    setConfirmOrder(latest);
    setConfirmVisible(true);
  };

  const handleConfirm = (id: string) => {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: 'accepted' as const } : o)));
    setPreview(prev => (prev?.id === id ? { ...prev, status: 'accepted' } : prev));
    const confirmed = orders.find(o => o.id === id);
    if (confirmed) {
      setSuccessOrder({ ...confirmed, status: 'accepted' });
      setSuccessVisible(true);
    }
  };

  const handleReject = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    setModal(false);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#E8F5E9" />

      {/* ── Header ── */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.vendorName} numberOfLines={1} ellipsizeMode="tail">
              {VENDOR.name}
            </Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.vendorAddress} numberOfLines={1} ellipsizeMode="tail">
                {VENDOR.address}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="qr-code-outline" size={20} color={Colors.textDark} />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>SR</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.8}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.searchPlaceholder} numberOfLines={1} ellipsizeMode="tail">
            Search by card #, customer...
          </Text>
        </TouchableOpacity>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setFilter('pending')}
            style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
            activeOpacity={0.8}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={filter === 'pending' ? '#fff' : Colors.textMuted}
            />
            <Text
              style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}
              numberOfLines={1}
            >
              Pending ({pendingOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('accepted')}
            style={[styles.filterTab, filter === 'accepted' && styles.filterTabActive]}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={14}
              color={filter === 'accepted' ? '#fff' : Colors.textMuted}
            />
            <Text
              style={[styles.filterTabText, filter === 'accepted' && styles.filterTabTextActive]}
              numberOfLines={1}
            >
              Accepted ({acceptedOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="people-outline" size={20} color={Colors.textDark} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Sheet ── */}
      <View style={styles.sheet}>
        {filter === 'pending' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {activeOrder ? (
              <ActiveRedemptionCard
                order={activeOrder}
                onPreview={openPreview}
                onConfirmRequest={openConfirmDialog}
                onReject={handleReject}
              />
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="checkmark-done-circle-outline" size={52} color="#E0E0E0" />
                <Text style={styles.emptyText}>No pending redemptions</Text>
              </View>
            )}

            {queueOrders.length > 0 && (
              <View style={styles.queueSection}>
                <View style={styles.queueHeader}>
                  <Text style={styles.queueTitle} numberOfLines={1} ellipsizeMode="tail">
                    UP NEXT IN QUEUE · {queueOrders.length} REMAINING
                  </Text>
                  <TouchableOpacity>
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>
                {queueOrders.map(order => (
                  <QueueItem key={order.id} order={order} onPreview={openPreview} />
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <FlatList
            data={acceptedOrders}
            keyExtractor={o => o.id}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="receipt-outline" size={52} color="#E0E0E0" />
                <Text style={styles.emptyText}>No accepted orders yet</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.acceptedCard}
                onPress={() => openPreview(item)}
                activeOpacity={0.8}
              >
                <View style={styles.redemptionTopRow}>
                  <Text style={styles.cardIdText} numberOfLines={1} ellipsizeMode="tail">
                    CARD ID: {item.cardId}
                  </Text>
                  <View style={styles.confirmedChip}>
                    <Ionicons name="checkmark-circle" size={13} color="#4CAF50" />
                    <Text style={styles.confirmedChipText}>Confirmed</Text>
                  </View>
                </View>
                <Text style={styles.acceptedCustomer} numberOfLines={1} ellipsizeMode="tail">
                  Customer: {item.customer}
                </Text>
                <View style={styles.acceptedFooter}>
                  <Text style={styles.acceptedMeta}>{item.totalUnits} Items</Text>
                  <Text style={styles.acceptedMeta}>₹{item.totalValue}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* ── Modals ── */}
      <OrderPreviewModal
        order={previewOrder}
        visible={modalVisible}
        onClose={() => setModal(false)}
        onConfirmRequest={openConfirmDialog}
        onReject={handleReject}
      />

      <ConfirmStrikeModal
        order={confirmOrder}
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        onConfirm={handleConfirm}
      />

      <OrderAcceptedModal
        order={successOrder}
        visible={successVisible}
        onClose={() => setSuccessVisible(false)}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Root ──
  root: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },

  // ── Header ──
  header: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingTop: 27,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
    minWidth: 0, // allow text to shrink
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  vendorAddress: {
    fontSize: 12,
    color: Colors.textMuted,
    flexShrink: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },

  // ── Search ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPlaceholder,
  },

  // ── Filter tabs ──
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
    backgroundColor: '#fff',
    flexShrink: 1,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    flexShrink: 1,
  },
  filterTabTextActive: {
    color: '#fff',
  },

  // ── Sheet ──
  sheet: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },

  // ── Active Redemption Card ──
  redemptionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  redemptionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  cardIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
    flexShrink: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 14,
  },

  // ── Items grid ──
  itemsGrid: {
    flexDirection: 'row',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 14,
    overflow: 'hidden',
  },
  itemCard: {
    flex: 1,
    padding: 12,
    minHeight: 90,
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
  },
  itemCardBorderRight: {
    borderRightWidth: 1,
    borderRightColor: '#E8E8E8',
  },
  itemQty: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textDark,
  },
  itemNameGrid: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: 4,
    flexShrink: 1,
  },
  itemAddOn: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  extraCard: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 1,
    borderLeftColor: '#E8E8E8',
  },
  extraCount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  extraLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  // ── Preview button ──
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF5E7',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F5DFA0',
  },
  previewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
    flex: 1,
    textAlign: 'center',
  },

  // ── Totals ──
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  totalsBlock: {
    flex: 1,
  },
  totalsBlockRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  totalsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  totalsValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
  },

  // ── Confirm / Reject buttons ──
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 50,
    paddingVertical: 16,
    marginBottom: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  rejectBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  // ── Queue section ──
  queueSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  queueTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    flex: 1,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
    flexShrink: 0,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  queueLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  queueRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  queueCardId: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  queueCustomer: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
    marginVertical: 2,
  },
  queueMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // ── Accepted card ──
  acceptedCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  confirmedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  confirmedChipText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 12,
  },
  acceptedCustomer: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginVertical: 6,
  },
  acceptedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  acceptedMeta: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  // ── Empty state ──
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // ── Shared modal base ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // ── Order Preview Modal ──
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 32,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  cardTypePill: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexShrink: 0,
  },
  cardTypePillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalCardId: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
    flexShrink: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  customerAvatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  customerInfo: {
    flex: 1,
    minWidth: 0,
  },
  modalCustomer: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textDark,
  },
  modalPhone: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  timeChipText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 16,
  },
  itemsScroll: {
    paddingHorizontal: 20,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 14,
  },
  categoryGroup: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  qtyBubble: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
  },
  itemMeta: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
  },
  addOnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  addOnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    flexShrink: 1,
  },
  itemCount: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
    flexShrink: 0,
  },
  summaryBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
    flexShrink: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    flexShrink: 0,
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    paddingTop: 10,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  confirmedBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FFF4',
    borderRadius: 50,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
  },
  confirmedBannerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
  },
  rejectModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 50,
    paddingVertical: 14,
  },
  rejectModalText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  confirmModalBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 50,
    paddingVertical: 14,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmModalText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },

  // ── Success Modal ──
  successSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    width: '100%',
  },
  successIconWrap: {
    marginBottom: 20,
    marginTop: 8,
  },
  successBadgeOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(76,175,80,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadgeInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 28,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    padding: 4,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  successDivider: {
    height: 1,
    backgroundColor: '#EBEBEB',
    marginHorizontal: 16,
  },
  successLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
    flexShrink: 0,
  },
  successValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
    flexShrink: 1,
    textAlign: 'right',
  },

  // ── Confirm Strike Modal ──
  confirmSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
    alignItems: 'center',
    width: '100%',
  },
  confirmIconWrap: {
    marginTop: 8,
    marginBottom: 16,
  },
  confirmIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F0FFF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
  },
  confirmSheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmSheetSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmSummaryCard: {
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  confirmSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexWrap: 'wrap',
  },
  confirmSummaryCardId: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
    flexShrink: 1,
  },
  confirmSummaryDivider: {
    height: 1,
    backgroundColor: '#EBEBEB',
  },
  confirmSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 8,
  },
  confirmSummaryLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  confirmSummaryLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  confirmSummaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    flexShrink: 1,
    textAlign: 'right',
  },
  confirmSummaryTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4CAF50',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  confirmProceedBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 50,
    paddingVertical: 15,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmProceedText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});