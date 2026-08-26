// Pay at Store hub — Pending / History, plus the entry point into the QR scanner.
// Verification (QR or code) never confirms by itself — it only proves the vendor is looking at
// the right session; VerificationResultModal always requires an explicit "Yes, Payment Received"
// tap (see VendorPayAtStoreController.java / PaymentServiceImpl#resolveVerification).
import { useState, useCallback } from 'react';
import {
  View, TouchableOpacity, FlatList, StyleSheet, StatusBar, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePayAtStore } from '../../modules/payAtStore/store/PayAtStoreContext';
import CodeEntryModal from '../../modules/payAtStore/components/CodeEntryModal';
import VerificationResultModal from '../../modules/payAtStore/components/VerificationResultModal';
import PaymentConfirmedModal from '../../modules/payAtStore/components/PaymentConfirmedModal';
import type { PayAtStorePayment, PayAtStoreStatus } from '../../modules/payAtStore/types';

const DS = {
  bg: '#F6F7FA', surface: '#FFFFFF', border: '#EAECEF',
  primary: '#CC2200', primaryDark: '#991A00', primarySoft: '#FFF0EE',
  accent: '#C17B2F', accentSoft: '#FEF6EC',
  success: '#16A34A', successSoft: '#F0FDF4',
  warning: '#D97706', warningSoft: '#FFFBEB',
  error: '#DC2626', errorSoft: '#FFF1F1',
  text: '#1A1A1A', text2: '#5A6272', text3: '#9BA3AF',
};

const DARK = { bg: '#1A1A1A', text: '#FFFFFF', text2: '#CCCCCC', text3: '#888888' };

// Same pragmatic stand-in as the redemption queue — no push/WebSocket infra yet.
const PENDING_POLL_INTERVAL_MS = 15000;

type Tab = 'pending' | 'history';

function fmt(n: number): string {
  return n % 1 === 0 ? `₹${n}` : `₹${n.toFixed(2)}`;
}

// card-service's Payment.createdAt/confirmedAt are a LocalDateTime stamped by a server clock
// that runs in UTC, serialized with no zone suffix (e.g. "2026-08-26T12:12:00"). Parsing that
// directly with `new Date(iso)` makes JS treat the digits as *device*-local time — on an IST
// device a payment created seconds ago then reads as ~5.5h in the past. Appending 'Z' tells JS
// to parse it as the UTC instant it actually is. This is the OPPOSITE fix from redemption-
// service's timestamps (see redemptionService.ts) — that service's server clock runs in IST,
// so its naive strings are correctly left as-is.
function parseServerDate(iso: string): Date {
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasZone ? iso : `${iso}Z`);
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - parseServerDate(iso).getTime()) / 1000);
  if (diff < 0) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function statusMeta(status: PayAtStoreStatus) {
  switch (status) {
    case 'PENDING':
      return { label: 'Waiting',   color: DS.warning, bg: DS.warningSoft, icon: 'time-outline' as const };
    case 'AWAITING_VENDOR_CONFIRMATION':
      return { label: 'Verifying', color: DS.accent,  bg: DS.accentSoft,  icon: 'sync-outline' as const };
    case 'SUCCESS':
      return { label: 'Confirmed', color: DS.success, bg: DS.successSoft, icon: 'checkmark-circle-outline' as const };
    case 'FAILED':
      return { label: 'Failed',    color: DS.error,   bg: DS.errorSoft,   icon: 'alert-circle-outline' as const };
    case 'CANCELLED':
      return { label: 'Cancelled', color: DS.text3,   bg: DS.bg,          icon: 'close-circle-outline' as const };
    case 'EXPIRED':
      return { label: 'Expired',   color: DS.text3,   bg: DS.bg,          icon: 'hourglass-outline' as const };
    default:
      return { label: status, color: DS.text3, bg: DS.bg, icon: 'help-circle-outline' as const };
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8EAED' }} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ width: '55%', height: 13, borderRadius: 6, backgroundColor: '#E8EAED' }} />
          <View style={{ width: '35%', height: 10, borderRadius: 6, backgroundColor: '#E8EAED' }} />
        </View>
        <View style={{ width: 60, height: 20, borderRadius: 10, backgroundColor: '#E8EAED' }} />
      </View>
    </View>
  );
}

// ─── Payment Card ────────────────────────────────────────────────────
function PaymentCard({ item, onPress }: { item: PayAtStorePayment; onPress?: () => void }) {
  const meta = statusMeta(item.status);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.8 : 1} disabled={!onPress}>
      <View style={styles.cardTop}>
        <View style={[styles.cardAvatar, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardCustomer} numberOfLines={1}>{item.cardName}</Text>
          <Text style={styles.cardSub}>#{item.paymentId} · {timeAgo(item.createdAt)}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>{fmt(item.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
      </View>
      {onPress && (
        <View style={styles.verifyRow}>
          <Ionicons name="keypad-outline" size={14} color={DS.primary} />
          <Text style={styles.verifyRowText}>Tap to verify with code</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────
export default function PayAtStoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    pending, history, loadingPending, loadingHistory,
    refreshingPending, refreshingHistory, errorPending, errorHistory,
    loadPending, loadHistory,
  } = usePayAtStore();

  const [tab, setTab] = useState<Tab>('pending');
  const [codeEntryPayment, setCodeEntryPayment] = useState<PayAtStorePayment | null>(null);
  const [verificationResult, setVerificationResult] = useState<PayAtStorePayment | null>(null);
  const [confirmedPayment, setConfirmedPayment] = useState<PayAtStorePayment | null>(null);

  // Reload on focus, keep polling the pending list silently while this screen stays open —
  // matches redemption-history.tsx's exact pattern.
  useFocusEffect(useCallback(() => {
    loadPending();
    loadHistory();
    const poll = setInterval(() => { loadPending(false, true); }, PENDING_POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [loadPending, loadHistory]));

  const todayConfirmed = history.filter((h) => {
    if (h.status !== 'SUCCESS' || !h.confirmedAt) return false;
    const d = parseServerDate(h.confirmedAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });
  const todayTotal = todayConfirmed.reduce((sum, h) => sum + h.amount, 0);

  const list = tab === 'pending' ? pending : history;
  const loading = tab === 'pending' ? loadingPending : loadingHistory;
  const refreshing = tab === 'pending' ? refreshingPending : refreshingHistory;
  const error = tab === 'pending' ? errorPending : errorHistory;
  const onRefresh = () => (tab === 'pending' ? loadPending(true) : loadHistory(true));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />

      {/* Dark header */}
      <View style={[styles.darkHeader, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={DARK.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Pay at Store</Text>
            <Text style={styles.headerSubtitle}>{pending.length} pending</Text>
          </View>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => router.push('/(main)/pay-at-store-scan')}
            activeOpacity={0.85}
          >
            <Ionicons name="qr-code-outline" size={18} color="#fff" />
            <Text style={styles.scanBtnText}>Scan QR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(217,119,6,0.14)' }]}>
              <Ionicons name="time-outline" size={14} color={DS.warning} />
            </View>
            <Text style={[styles.statValue, { color: DS.warning }]}>{pending.length}</Text>
            <Text style={styles.statLabel}>PENDING</Text>
          </View>
          <View style={styles.statChip}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(22,163,74,0.14)' }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color={DS.success} />
            </View>
            <Text style={[styles.statValue, { color: DS.success }]}>{fmt(todayTotal)}</Text>
            <Text style={styles.statLabel}>TODAY</Text>
          </View>
        </View>
      </View>

      {/* White sheet */}
      <View style={styles.sheet}>
        <View style={styles.tabRow}>
          {(['pending', 'history'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'pending' ? 'Pending' : 'History'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={loading ? [] : list}
          keyExtractor={(item) => String(item.paymentId)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[DS.primary]} tintColor={DS.primary} />
          }
          renderItem={({ item }) => (
            <PaymentCard
              item={item}
              onPress={tab === 'pending' ? () => setCodeEntryPayment(item) : undefined}
            />
          )}
          ListHeaderComponent={
            loading ? (
              <View>{Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)}</View>
            ) : error ? (
              <View style={styles.errorState}>
                <Ionicons name="wifi-outline" size={48} color={DS.text3} />
                <Text style={styles.errorTitle}>Something went wrong</Text>
                <Text style={styles.errorDetail}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={onRefresh} activeOpacity={0.8}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading && !error ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons
                    name={tab === 'pending' ? 'checkmark-done-circle-outline' : 'receipt-outline'}
                    size={32} color={DS.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>{tab === 'pending' ? 'All clear!' : 'No payments yet'}</Text>
                <Text style={styles.emptyDetail}>
                  {tab === 'pending'
                    ? 'New customer Pay-at-Store payments will appear here.'
                    : 'Confirmed and past Pay-at-Store payments will appear here.'}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        />
      </View>

      <CodeEntryModal
        payment={codeEntryPayment}
        visible={!!codeEntryPayment}
        onClose={() => setCodeEntryPayment(null)}
        onVerified={(result) => {
          setCodeEntryPayment(null);
          setVerificationResult(result);
        }}
      />
      <VerificationResultModal
        payment={verificationResult}
        visible={!!verificationResult}
        onClose={() => setVerificationResult(null)}
        onConfirmed={(result) => {
          setVerificationResult(null);
          setConfirmedPayment(result);
        }}
        onError={(message) => Alert.alert('Could not confirm payment', message)}
      />
      <PaymentConfirmedModal
        payment={confirmedPayment}
        visible={!!confirmedPayment}
        onClose={() => setConfirmedPayment(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.bg },

  darkHeader: { backgroundColor: DARK.bg, paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: DARK.text },
  headerSubtitle: { fontSize: 12, color: DARK.text2, marginTop: 2 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: DS.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
  },
  scanBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statChip: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    padding: 12, alignItems: 'flex-start',
  },
  statIconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', color: DARK.text3, letterSpacing: 0.5, marginTop: 2 },

  sheet: {
    flex: 1, backgroundColor: DS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -16, paddingTop: 16,
  },
  tabRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8,
  },
  tabBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: DS.bg,
  },
  tabBtnActive: { backgroundColor: DS.primarySoft },
  tabText: { fontSize: 13.5, fontWeight: '700', color: DS.text2 },
  tabTextActive: { color: DS.primary },

  card: {
    backgroundColor: DS.surface, borderRadius: 16, borderWidth: 1, borderColor: DS.border,
    padding: 14, marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, minWidth: 0 },
  cardCustomer: { fontSize: 14.5, fontWeight: '700', color: DS.text },
  cardSub: { fontSize: 12, color: DS.text3, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cardAmount: { fontSize: 15, fontWeight: '800', color: DS.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  verifyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: DS.border,
  },
  verifyRowText: { fontSize: 12.5, fontWeight: '700', color: DS.primary },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: DS.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: DS.text, marginBottom: 6 },
  emptyDetail: { fontSize: 14, color: DS.text2, textAlign: 'center', lineHeight: 20, maxWidth: 260 },

  errorState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: DS.text, marginTop: 12 },
  errorDetail: { fontSize: 13, color: DS.text2, textAlign: 'center', marginTop: 4 },
  retryBtn: { marginTop: 16, borderWidth: 1.5, borderColor: DS.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: DS.primary },
});
