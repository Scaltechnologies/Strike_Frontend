import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  StatusBar, ScrollView, Alert, Modal,
  useWindowDimensions, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchRedemptionQueue,
  confirmRedemption,
  rejectRedemption,
} from '../../modules/redemption/services/redemptionService';
import type { RedemptionRequest } from '../../modules/redemption/services/redemptionService';
import axiosInstance from '../../core/api/axiosInstance';
import endpoints from '../../core/api/endpoints';

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  primaryDark: '#991A00',
  primarySoft: '#FFF0EE',
  accent:      '#C17B2F',
  accentSoft:  '#FEF6EC',
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

// ─── Skeleton ────────────────────────────────────────────────────────
function SkeletonBlock({ w, h, radius = 8 }: { w: number | string; h: number; radius?: number }) {
  return <View style={{ width: w as number, height: h, borderRadius: radius, backgroundColor: '#E8EAED' }} />;
}

function SkeletonCard() {
  return (
    <View style={styles.activeCard}>
      <SkeletonBlock w="40%" h={11} radius={6} />
      <View style={{ height: 12 }} />
      <SkeletonBlock w="60%" h={22} radius={8} />
      <View style={{ height: 6 }} />
      <SkeletonBlock w="35%" h={14} radius={6} />
      <View style={{ height: 16 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><SkeletonBlock w="100%" h={72} radius={10} /></View>
        <View style={{ flex: 1 }}><SkeletonBlock w="100%" h={72} radius={10} /></View>
      </View>
      <View style={{ height: 16 }} />
      <SkeletonBlock w="100%" h={50} radius={12} />
      <View style={{ height: 8 }} />
      <SkeletonBlock w="100%" h={40} radius={12} />
    </View>
  );
}

// ─── Confirm Strike Modal ────────────────────────────────────────────
function ConfirmStrikeModal({ order, visible, onClose, onConfirm }: {
  order: RedemptionRequest | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}) {
  const { height: SH } = useWindowDimensions();
  if (!order) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { maxHeight: SH * 0.88 }]}>
          <View style={styles.handle} />
          <View style={styles.confirmIconWrap}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="shield-checkmark-outline" size={36} color={DS.success} />
            </View>
          </View>
          <Text style={styles.sheetTitle}>Confirm Strike?</Text>
          <Text style={styles.sheetSubtitle}>
            Deducts from the customer's wallet.{'\n'}This action cannot be undone.
          </Text>

          <View style={styles.summaryCard}>
            {[
              { icon: 'person-outline' as const, label: 'Customer', value: order.customer },
              { icon: 'fast-food-outline' as const, label: 'Items', value: `${order.totalUnits} items` },
            ].map((row, i, arr) => (
              <View key={row.label}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryLabelWrap}>
                    <Ionicons name={row.icon} size={14} color={DS.text3} />
                    <Text style={styles.summaryLabel}>{row.label}</Text>
                  </View>
                  <Text style={styles.summaryValue}>{row.value}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.summaryDivider} />}
              </View>
            ))}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelWrap}>
                <Ionicons name="pricetag-outline" size={14} color={DS.text3} />
                <Text style={styles.summaryLabel}>Total Value</Text>
              </View>
              <Text style={[styles.summaryValue, { color: DS.success, fontWeight: '800', fontSize: 16 }]}>
                ₹{order.totalValue}
              </Text>
            </View>
          </View>

          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.proceedBtn}
              onPress={() => { onConfirm(order.id); onClose(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.proceedBtnText}>Yes, Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Order Accepted Modal ────────────────────────────────────────────
function OrderAcceptedModal({ order, visible, onClose }: {
  order: RedemptionRequest | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!order) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.successBadgeOuter}>
            <View style={styles.successBadgeInner}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>
          </View>
          <Text style={[styles.sheetTitle, { marginTop: 16 }]}>Strike Confirmed!</Text>

          <View style={styles.summaryCard}>
            {[
              { label: 'Subscription', value: order.cardId },
              { label: 'Customer',     value: order.customer },
              { label: 'Total Value',  value: `₹${order.totalValue}` },
              { label: 'Date',         value: order.orderedAt },
            ].map((row, i, arr) => (
              <View key={row.label}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                  <Text style={styles.summaryValue}>{row.value}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.summaryDivider} />}
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.proceedBtn, { marginHorizontal: 0, marginTop: 20 }]}
            onPress={onClose} activeOpacity={0.85}
          >
            <Text style={styles.proceedBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Order Preview Modal ─────────────────────────────────────────────
function OrderPreviewModal({ order, visible, onClose, onConfirmRequest, onReject }: {
  order: RedemptionRequest | null;
  visible: boolean;
  onClose: () => void;
  onConfirmRequest: (o: RedemptionRequest) => void;
  onReject: (id: string) => void;
}) {
  const { height: SH } = useWindowDimensions();
  if (!order) return null;
  const isAccepted = order.status === 'accepted';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[styles.previewSheet, { maxHeight: SH * 0.92 }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.previewHeader}>
            <View style={styles.previewHeaderLeft}>
              <View style={styles.subPill}>
                <Text style={styles.subPillText}>Sub {order.cardId}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={DS.text} />
            </TouchableOpacity>
          </View>

          {/* Customer */}
          <View style={styles.previewCustomerRow}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>{order.customer.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.customerName}>{order.customer}</Text>
              <Text style={styles.customerHandle}>{order.customerHandle}</Text>
            </View>
            <View style={styles.timeChip}>
              <Ionicons name="time-outline" size={11} color={DS.text3} />
              <Text style={styles.timeChipText}>{order.timeAgo}</Text>
            </View>
          </View>

          <View style={styles.previewDivider} />

          {/* Items */}
          <ScrollView
            style={[styles.itemsScroll, { maxHeight: SH * 0.38 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.itemsTitle}>Order Items</Text>
            {order.items.map(item => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.qtyBubble}>
                  <Text style={styles.qtyText}>{item.qty}</Text>
                </View>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              </View>
            ))}
            <View style={styles.itemSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Items</Text>
                <Text style={styles.summaryValue}>{order.totalUnits}</Text>
              </View>
              <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: DS.border, paddingTop: 10, marginTop: 4 }]}>
                <Text style={[styles.summaryLabel, { fontWeight: '800', color: DS.text, fontSize: 15 }]}>Total Value</Text>
                <Text style={[styles.summaryValue, { fontWeight: '800', fontSize: 18, color: DS.text }]}>₹{order.totalValue}</Text>
              </View>
            </View>
            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Actions */}
          {isAccepted ? (
            <View style={styles.previewActions}>
              <View style={styles.confirmedBanner}>
                <Ionicons name="checkmark-circle" size={18} color={DS.success} />
                <Text style={styles.confirmedBannerText}>Strike Confirmed</Text>
              </View>
            </View>
          ) : (
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.rejectModalBtn}
                onPress={() => {
                  onClose();
                  Alert.alert('Reject Request', 'Are you sure you want to reject this redemption?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reject', style: 'destructive', onPress: () => onReject(order.id) },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={17} color={DS.primary} />
                <Text style={styles.rejectModalText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalBtn}
                onPress={() => { onClose(); onConfirmRequest(order); }}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={17} color="#fff" />
                <Text style={styles.confirmModalText}>Confirm Strike</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Active Redemption Card ──────────────────────────────────────────
function ActiveRedemptionCard({ order, onPreview, onConfirmRequest, onReject }: {
  order: RedemptionRequest;
  onPreview: (o: RedemptionRequest) => void;
  onConfirmRequest: (o: RedemptionRequest) => void;
  onReject: (id: string) => void;
}) {
  const visibleItems = order.items.slice(0, 3);
  const extraCount   = order.items.length - 3;

  return (
    <View style={styles.activeCard}>
      <View style={styles.activeCardHeader}>
        <Text style={styles.activeCardLabel}>ACTIVE REQUEST</Text>
        <View style={styles.timeChip}>
          <Ionicons name="time-outline" size={11} color={DS.text3} />
          <Text style={styles.timeChipText}>{order.timeAgo}</Text>
        </View>
      </View>

      <Text style={styles.activeCustomer}>{order.customer}</Text>
      <Text style={styles.activeCardId}>Subscription {order.cardId}</Text>

      <View style={styles.activeItemsWrap}>
        {visibleItems.map(item => (
          <View key={item.id} style={styles.activeItemRow}>
            <View style={styles.activeItemQty}>
              <Text style={styles.activeItemQtyText}>{item.qty}</Text>
            </View>
            <Text style={styles.activeItemName} numberOfLines={1}>{item.name}</Text>
          </View>
        ))}
        {extraCount > 0 && (
          <TouchableOpacity onPress={() => onPreview(order)} activeOpacity={0.7}>
            <Text style={styles.moreItems}>+{extraCount} more — tap to view all</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.activeTotalsRow}>
        <View>
          <Text style={styles.activeTotalsLabel}>ITEMS</Text>
          <Text style={styles.activeTotalsValue}>{order.totalUnits}</Text>
        </View>
        <View style={styles.activeTotalsDivider} />
        <View>
          <Text style={styles.activeTotalsLabel}>TOTAL VALUE</Text>
          <Text style={styles.activeTotalsValue}>₹{order.totalValue}</Text>
        </View>
        <TouchableOpacity style={styles.previewBtn} onPress={() => onPreview(order)} activeOpacity={0.8}>
          <Ionicons name="eye-outline" size={13} color={DS.accent} />
          <Text style={styles.previewBtnText}>Preview</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.confirmBtn}
        onPress={() => onConfirmRequest(order)}
        activeOpacity={0.85}
      >
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.confirmBtnText}>Confirm Strike</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(order.id)} activeOpacity={0.7}>
        <Text style={styles.rejectBtnText}>Reject Request</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Queue Row ────────────────────────────────────────────────────────
function QueueRow({ order, onPreview }: {
  order: RedemptionRequest;
  onPreview: (o: RedemptionRequest) => void;
}) {
  return (
    <TouchableOpacity style={styles.queueRow} onPress={() => onPreview(order)} activeOpacity={0.7}>
      <View style={styles.queueAvatar}>
        <Text style={styles.queueAvatarText}>{order.customer.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.queueCustomer} numberOfLines={1}>{order.customer}</Text>
        <Text style={styles.queueMeta}>{order.totalUnits} items · ₹{order.totalValue} · {order.timeAgo}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={DS.text3} />
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [storeName, setStoreName]         = useState('');
  const [storeAddress, setStoreAddress]   = useState('');
  const [storeId, setStoreId]             = useState<number | null>(null);
  const [orders, setOrders]               = useState<RedemptionRequest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [filter, setFilter]               = useState<'pending' | 'accepted'>('pending');
  const [previewOrder, setPreview]        = useState<RedemptionRequest | null>(null);
  const [modalVisible, setModal]          = useState(false);
  const [confirmOrder, setConfirmOrder]   = useState<RedemptionRequest | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successOrder, setSuccessOrder]   = useState<RedemptionRequest | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const loadStore = useCallback(async () => {
    try {
      type StoreData = { id: number; name: string; address: string };
      type SR = { success: boolean; data: StoreData; message?: string; timestamp: string };
      const res = await axiosInstance.get<SR>(endpoints.store.my);
      const s = res.data.data;
      setStoreName(s.name);
      setStoreAddress(s.address);
      setStoreId(s.id);
      return s.id;
    } catch {
      return null;
    }
  }, []);

  const loadQueue = useCallback(async (sid: number, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const data = await fetchRedemptionQueue(sid);
      setOrders(data);
    } catch {
      Alert.alert('Error', 'Failed to load redemption queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    if (storeId != null) await loadQueue(storeId, true);
  }, [storeId, loadQueue]);

  useEffect(() => {
    loadStore().then(sid => {
      if (sid != null) loadQueue(sid);
      else setLoading(false);
    });
  }, [loadStore, loadQueue]);

  const pendingOrders  = orders.filter(o => o.status === 'pending');
  const acceptedOrders = orders.filter(o => o.status === 'accepted');
  const activeOrder    = pendingOrders[0] ?? null;
  const queueOrders    = pendingOrders.slice(1);

  const openPreview = (order: RedemptionRequest) => {
    setPreview(orders.find(o => o.id === order.id) ?? order);
    setModal(true);
  };

  const openConfirmDialog = (order: RedemptionRequest) => {
    setConfirmOrder(orders.find(o => o.id === order.id) ?? order);
    setConfirmVisible(true);
  };

  const handleConfirm = async (id: string) => {
    try {
      await confirmRedemption(id);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'accepted' as const } : o));
      const confirmed = orders.find(o => o.id === id);
      if (confirmed) {
        setSuccessOrder({ ...confirmed, status: 'accepted' });
        setSuccessVisible(true);
      }
    } catch {
      Alert.alert('Error', 'Failed to confirm redemption. Please try again.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectRedemption(id);
      setOrders(prev => prev.filter(o => o.id !== id));
      setModal(false);
    } catch {
      Alert.alert('Error', 'Failed to reject redemption. Please try again.');
    }
  };

  const storeInitials = storeName.split(' ').slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || 'S';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View style={styles.storeAvatar}>
            <Text style={styles.storeAvatarText}>{storeInitials}</Text>
          </View>
          <View style={styles.headerMid}>
            <Text style={styles.storeName} numberOfLines={1}>{storeName || '…'}</Text>
            {!!storeAddress && (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={11} color={DS.text3} />
                <Text style={styles.storeAddress} numberOfLines={1}>{storeAddress}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="qr-code-outline" size={20} color={DS.text} />
          </TouchableOpacity>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingOrders.length}</Text>
            <Text style={styles.statLabel}>PENDING</Text>
          </View>
          <View style={[styles.statCard, { marginLeft: 10 }]}>
            <Text style={styles.statNumber}>{acceptedOrders.length}</Text>
            <Text style={styles.statLabel}>CONFIRMED TODAY</Text>
          </View>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {(['pending', 'accepted'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f === 'pending'
                  ? `Pending (${pendingOrders.length})`
                  : `Accepted (${acceptedOrders.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <SkeletonCard />
          </ScrollView>
        ) : filter === 'pending' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                colors={[DS.primary]} tintColor={DS.primary} />
            }
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
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="checkmark-done-circle-outline" size={40} color={DS.success} />
                </View>
                <Text style={styles.emptyTitle}>All clear!</Text>
                <Text style={styles.emptyText}>No pending redemption requests right now.</Text>
              </View>
            )}

            {queueOrders.length > 0 && (
              <View style={styles.queueSection}>
                <Text style={styles.queueSectionLabel}>UP NEXT · {queueOrders.length} WAITING</Text>
                {queueOrders.map(order => (
                  <QueueRow key={order.id} order={order} onPreview={openPreview} />
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <FlatList
            data={acceptedOrders}
            keyExtractor={o => o.id}
            contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                colors={[DS.primary]} tintColor={DS.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="receipt-outline" size={40} color={DS.text3} />
                </View>
                <Text style={styles.emptyTitle}>No confirmations yet</Text>
                <Text style={styles.emptyText}>Confirmed strikes will appear here.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.acceptedCard}
                onPress={() => openPreview(item)}
                activeOpacity={0.8}
              >
                <View style={styles.acceptedCardTop}>
                  <Text style={styles.acceptedCustomer} numberOfLines={1}>{item.customer}</Text>
                  <View style={styles.confirmedChip}>
                    <Ionicons name="checkmark-circle" size={12} color={DS.success} />
                    <Text style={styles.confirmedChipText}>Confirmed</Text>
                  </View>
                </View>
                <View style={styles.acceptedCardFooter}>
                  <Text style={styles.acceptedMeta}>{item.totalUnits} items</Text>
                  <Text style={[styles.acceptedMeta, { fontWeight: '700', color: DS.text }]}>₹{item.totalValue}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

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

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: DS.bg },
  content: { flex: 1, backgroundColor: DS.bg },

  // Header
  header: {
    backgroundColor: DS.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: DS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14,
  },
  storeAvatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: DS.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  storeAvatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  headerMid:       { flex: 1, minWidth: 0 },
  storeName:       { fontSize: 17, fontWeight: '800', color: DS.text },
  addressRow:      { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  storeAddress:    { fontSize: 12, color: DS.text3, flex: 1 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: DS.bg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  // Stats row
  statsRow:   { flexDirection: 'row', marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: DS.bg, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: DS.border,
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: DS.primary },
  statLabel:  { fontSize: 10, fontWeight: '700', color: DS.text3, letterSpacing: 0.5, marginTop: 2 },

  // Filter tabs
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  filterTab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: DS.border, backgroundColor: DS.bg,
  },
  filterTabActive:     { backgroundColor: DS.primary, borderColor: DS.primary },
  filterTabText:       { fontSize: 13, fontWeight: '600', color: DS.text2 },
  filterTabTextActive: { color: '#fff' },

  // Scroll
  scrollContent: { padding: 16, paddingBottom: 32 },

  // Active card
  activeCard: {
    backgroundColor: DS.surface, borderRadius: 20,
    padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: DS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  activeCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  activeCardLabel: {
    fontSize: 11, fontWeight: '700', color: DS.text3, letterSpacing: 1,
  },
  activeCustomer: { fontSize: 20, fontWeight: '800', color: DS.text, marginBottom: 4 },
  activeCardId:   { fontSize: 12, color: DS.text3, fontWeight: '600', marginBottom: 14 },

  // Items in active card
  activeItemsWrap: { marginBottom: 14 },
  activeItemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  activeItemQty: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: DS.bg, alignItems: 'center', justifyContent: 'center',
  },
  activeItemQtyText: { fontSize: 14, fontWeight: '800', color: DS.text },
  activeItemName:    { fontSize: 14, fontWeight: '500', color: DS.text, flex: 1 },
  moreItems:         { fontSize: 13, color: DS.accent, fontWeight: '600', marginTop: 8 },

  // Totals row
  activeTotalsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: DS.border,
  },
  activeTotalsLabel: { fontSize: 10, fontWeight: '700', color: DS.text3, letterSpacing: 0.5, marginBottom: 3 },
  activeTotalsValue: { fontSize: 17, fontWeight: '800', color: DS.text },
  activeTotalsDivider: { width: 1, height: 36, backgroundColor: DS.border },
  previewBtn: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: DS.accentSoft, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  previewBtnText: { fontSize: 12, fontWeight: '700', color: DS.accent },

  // Confirm / Reject buttons
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.success,
    borderRadius: 14, height: 52, marginBottom: 10,
    shadowColor: DS.success, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  rejectBtn:      { alignItems: 'center', paddingVertical: 8 },
  rejectBtnText:  { fontSize: 14, fontWeight: '600', color: DS.text3 },

  // Queue section
  queueSection: {
    backgroundColor: DS.surface, borderRadius: 20,
    padding: 16, borderWidth: 1, borderColor: DS.border,
  },
  queueSectionLabel: {
    fontSize: 11, fontWeight: '700', color: DS.text3,
    letterSpacing: 0.8, marginBottom: 8,
  },
  queueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: DS.border,
  },
  queueAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: DS.bg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  queueAvatarText: { fontSize: 14, fontWeight: '700', color: DS.text2 },
  queueCustomer:   { fontSize: 15, fontWeight: '700', color: DS.text, marginBottom: 2 },
  queueMeta:       { fontSize: 12, color: DS.text3 },

  // Accepted card
  acceptedCard: {
    backgroundColor: DS.surface, borderRadius: 16,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: DS.border,
  },
  acceptedCardTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  acceptedCustomer:  { fontSize: 15, fontWeight: '700', color: DS.text, flex: 1 },
  confirmedChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  confirmedChipText: { fontSize: 12, fontWeight: '600', color: DS.success },
  acceptedCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  acceptedMeta:      { fontSize: 13, color: DS.text2 },

  // Empty state
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 12,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: DS.bg, alignItems: 'center',
    justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: DS.text },
  emptyText:  { fontSize: 14, color: DS.text2, textAlign: 'center' },

  // Time chip
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: DS.bg, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  timeChipText: { fontSize: 11, color: DS.text3, fontWeight: '500' },

  // Skeleton
  skeletonCard: {
    backgroundColor: DS.surface, borderRadius: 20,
    padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: DS.border,
  },

  // Modal shared
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  handle:  { width: 40, height: 4, backgroundColor: DS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  // Sheet (confirm + success)
  sheet: {
    backgroundColor: DS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36,
    alignItems: 'center', width: '100%',
  },
  confirmIconWrap:   { marginTop: 8, marginBottom: 16 },
  confirmIconCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: DS.successSoft, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#A3D9B4',
  },
  sheetTitle:    { fontSize: 22, fontWeight: '800', color: DS.text, marginBottom: 8, textAlign: 'center' },
  sheetSubtitle: { fontSize: 13, color: DS.text2, textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  summaryCard: {
    width: '100%', backgroundColor: DS.bg,
    borderRadius: 16, marginBottom: 24,
    borderWidth: 1, borderColor: DS.border, overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 8,
  },
  summaryLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  summaryLabel:     { fontSize: 13, color: DS.text2, fontWeight: '500' },
  summaryValue:     { fontSize: 14, fontWeight: '700', color: DS.text, flexShrink: 1, textAlign: 'right' },
  summaryDivider:   { height: 1, backgroundColor: DS.border },

  sheetActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: DS.border,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: DS.text2 },
  proceedBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.success, borderRadius: 14, paddingVertical: 14,
    shadowColor: DS.success, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  proceedBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Success modal
  successBadgeOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(22,163,74,0.12)',
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  successBadgeInner: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: DS.success, alignItems: 'center', justifyContent: 'center',
    shadowColor: DS.success, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },

  // Preview sheet
  previewSheet: {
    backgroundColor: DS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingBottom: 32, width: '100%',
  },
  previewHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, gap: 8,
  },
  previewHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  subPill: {
    backgroundColor: DS.primary, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  subPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: DS.bg, alignItems: 'center', justifyContent: 'center',
  },
  previewCustomerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, marginBottom: 16,
  },
  customerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: DS.accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  customerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  customerName:       { fontSize: 17, fontWeight: '800', color: DS.text },
  customerHandle:     { fontSize: 13, color: DS.text3, marginTop: 2 },
  previewDivider:     { height: 1, backgroundColor: DS.border, marginBottom: 16 },

  itemsScroll:   { paddingHorizontal: 20 },
  itemsTitle:    { fontSize: 16, fontWeight: '800', color: DS.text, marginBottom: 14 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: DS.bg,
  },
  qtyBubble: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: DS.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  qtyText:  { fontSize: 16, fontWeight: '800', color: DS.text },
  itemName: { fontSize: 15, fontWeight: '500', color: DS.text, flex: 1 },

  itemSummaryBox: {
    backgroundColor: DS.bg, borderRadius: 14,
    padding: 16, marginTop: 8, gap: 10,
  },

  previewActions: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: DS.border,
  },
  confirmedBanner: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.successSoft, borderRadius: 14,
    paddingVertical: 14, borderWidth: 1.5, borderColor: '#A3D9B4',
  },
  confirmedBannerText: { fontSize: 15, fontWeight: '700', color: DS.success },
  rejectModalBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderColor: DS.primary, borderRadius: 14, paddingVertical: 13,
  },
  rejectModalText: { color: DS.primary, fontWeight: '700', fontSize: 14 },
  confirmModalBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: DS.success, borderRadius: 14, paddingVertical: 13,
    shadowColor: DS.success, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  confirmModalText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
