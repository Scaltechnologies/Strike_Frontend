import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal,
  StyleSheet, StatusBar, RefreshControl, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWithdrawalStats, getWithdrawals, requestWithdrawal } from '../../modules/wallet/services/walletService';
import { getUserMessage } from '../../core/api/errorMessage';
import type {
  WithdrawalStats, WithdrawalRequestResponse, WithdrawalStatus, PayoutMethod,
} from '../../modules/wallet/types/wallet.types';

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

const DARK = { bg: '#1A1A1A', card: '#2A2A2A', text: '#FFFFFF', text2: '#CCCCCC', text3: '#888888' };

function formatCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function maskAccount(num: string) {
  return num.length > 4 ? `••••${num.slice(-4)}` : num;
}

function destinationLabel(item: WithdrawalRequestResponse) {
  if (item.method === 'UPI') return item.upiId ?? 'UPI';
  return item.bankAccountNumber ? `Bank ${maskAccount(item.bankAccountNumber)}` : 'Bank Transfer';
}

function statusMeta(status: WithdrawalStatus) {
  switch (status) {
    case 'PENDING':  return { label: 'Pending',  color: DS.warning, bg: DS.warningSoft, icon: 'time-outline' as const };
    case 'APPROVED': return { label: 'Approved', color: DS.success, bg: DS.successSoft,  icon: 'checkmark-done-circle-outline' as const };
    case 'REJECTED': return { label: 'Rejected', color: DS.error,   bg: DS.errorSoft,    icon: 'close-circle-outline' as const };
    default:         return { label: status,     color: DS.text3,  bg: DS.bg,            icon: 'help-circle-outline' as const };
  }
}

// ── Skeletons ─────────────────────────────────────────────────────────
function SkeletonBalance() {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ width: 120, height: 12, borderRadius: 6, backgroundColor: '#3A3A3A', marginBottom: 10 }} />
      <View style={{ width: 180, height: 34, borderRadius: 8, backgroundColor: '#3A3A3A', marginBottom: 18 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, height: 54, borderRadius: 12, backgroundColor: '#3A3A3A' }} />
        <View style={{ flex: 1, height: 54, borderRadius: 12, backgroundColor: '#3A3A3A' }} />
      </View>
    </View>
  );
}

function SkeletonRow() {
  return (
    <View style={styles.row}>
      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#E8EAED' }} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ width: '50%', height: 13, borderRadius: 6, backgroundColor: '#E8EAED' }} />
        <View style={{ width: '35%', height: 10, borderRadius: 6, backgroundColor: '#E8EAED' }} />
      </View>
      <View style={{ width: 64, height: 22, borderRadius: 11, backgroundColor: '#E8EAED' }} />
    </View>
  );
}

// ── Withdrawal history row ──────────────────────────────────────────────
function WithdrawalRow({ item }: { item: WithdrawalRequestResponse }) {
  const meta = statusMeta(item.status);
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
        <Ionicons
          name={item.method === 'UPI' ? 'phone-portrait-outline' : 'business-outline'}
          size={18}
          color={meta.color}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {destinationLabel(item)} · {formatDate(item.createdAt)}
        </Text>
        {item.status === 'REJECTED' && !!item.adminNote && (
          <Text style={styles.rowRejectNote} numberOfLines={2}>{item.adminNote}</Text>
        )}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={12} color={meta.color} />
        <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
      </View>
    </View>
  );
}

// ── Request Withdrawal sheet ────────────────────────────────────────────
function RequestWithdrawalModal({
  visible, availableBalance, onClose, onSubmitted,
}: {
  visible: boolean;
  availableBalance: number;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [amount, setAmount]     = useState('');
  const [method, setMethod]     = useState<PayoutMethod>('BANK_TRANSFER');
  const [holder, setHolder]     = useState('');
  const [acctNum, setAcctNum]   = useState('');
  const [ifsc, setIfsc]         = useState('');
  const [upiId, setUpiId]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amtNum = parseFloat(amount) || 0;
  const amountOk = amtNum > 0 && amtNum <= availableBalance;
  const payoutOk = method === 'UPI'
    ? upiId.trim().length >= 3
    : holder.trim().length > 0 && acctNum.trim().length >= 6 && ifsc.trim().length >= 6;
  const canSubmit = amountOk && payoutOk && !submitting;

  const reset = () => {
    setAmount(''); setMethod('BANK_TRANSFER');
    setHolder(''); setAcctNum(''); setIfsc(''); setUpiId('');
  };
  const handleClose = () => { if (!submitting) { reset(); onClose(); } };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await requestWithdrawal({
        amount: amtNum,
        method,
        ...(method === 'BANK_TRANSFER'
          ? { bankAccountName: holder.trim(), bankAccountNumber: acctNum.trim(), ifscCode: ifsc.trim().toUpperCase() }
          : { upiId: upiId.trim() }),
      });
      reset();
      onSubmitted();
    } catch (e: any) {
      Alert.alert('Request Failed', getUserMessage(e, 'Could not submit your withdrawal request. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalIconCircle}>
              <Ionicons name="cash-outline" size={30} color={DS.primary} />
            </View>
            <Text style={styles.modalTitle}>Request Withdrawal</Text>
            <Text style={styles.modalSubtitle}>
              Available to withdraw: <Text style={{ fontWeight: '800', color: DS.text }}>{formatCurrency(availableBalance)}</Text>
            </Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Amount (₹) *</Text>
              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }, amount.length > 0 && !amountOk && styles.inputErr]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={DS.text3}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.maxBtn}
                  onPress={() => setAmount(String(availableBalance))}
                  disabled={availableBalance <= 0}
                >
                  <Text style={styles.maxBtnText}>MAX</Text>
                </TouchableOpacity>
              </View>
              {amount.length > 0 && !amountOk && (
                <Text style={styles.errText}>
                  {amtNum <= 0 ? 'Enter a valid amount' : 'Amount exceeds available balance'}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Payout Method *</Text>
              <View style={styles.methodRow}>
                {(['BANK_TRANSFER', 'UPI'] as PayoutMethod[]).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodChip, method === m && styles.methodChipSel]}
                    onPress={() => setMethod(m)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={m === 'UPI' ? 'phone-portrait-outline' : 'business-outline'}
                      size={15}
                      color={method === m ? '#fff' : DS.text2}
                    />
                    <Text style={[styles.methodChipText, method === m && styles.methodChipTextSel]}>
                      {m === 'UPI' ? 'UPI' : 'Bank Transfer'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {method === 'BANK_TRANSFER' ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Account Holder Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={holder}
                    onChangeText={setHolder}
                    placeholder="As per bank records"
                    placeholderTextColor={DS.text3}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Account Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={acctNum}
                    onChangeText={setAcctNum}
                    placeholder="1234567890"
                    placeholderTextColor={DS.text3}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>IFSC Code *</Text>
                  <TextInput
                    style={styles.input}
                    value={ifsc}
                    onChangeText={t => setIfsc(t.toUpperCase())}
                    placeholder="ABCD0123456"
                    placeholderTextColor={DS.text3}
                    autoCapitalize="characters"
                  />
                </View>
              </>
            ) : (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>UPI ID *</Text>
                <TextInput
                  style={styles.input}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="yourname@bank"
                  placeholderTextColor={DS.text3}
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.8} disabled={submitting}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, !canSubmit && { opacity: 0.4 }]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={!canSubmit}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                      <Text style={styles.submitText}>Submit Request</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────
export default function WalletScreen() {
  const router = useRouter();
  const insets  = useSafeAreaInsets();

  const [stats, setStats]           = useState<WithdrawalStats | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [history, setHistory]       = useState<WithdrawalRequestResponse[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setBalanceError(null);
    setHistoryError(null);
    const [statsResult, historyResult] = await Promise.allSettled([
      getWithdrawalStats(),
      getWithdrawals(),
    ]);

    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    else setBalanceError(getUserMessage(statsResult.reason, 'Could not load your wallet balance.'));

    if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
    else setHistoryError(getUserMessage(historyResult.reason, 'Could not load withdrawal history.'));

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const availableBalance = stats?.availableBalance ?? 0;
  const hasPending = history.some(h => h.status === 'PENDING');
  const canRequest = availableBalance > 0 && !hasPending;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />

      {/* Dark balance header */}
      <View style={[styles.darkSection, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Wallet</Text>
          <View style={{ width: 38 }} />
        </View>

        {loading ? (
          <SkeletonBalance />
        ) : balanceError ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={18} color="#f87171" />
            <Text style={styles.errorText}>{balanceError}</Text>
            <TouchableOpacity onPress={() => load()} style={styles.retryDarkBtn}>
              <Text style={styles.retryDarkText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
            <Text style={styles.balanceValue}>{formatCurrency(availableBalance)}</Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatVal}>{formatCurrency(stats?.pendingWithdrawals ?? 0)}</Text>
                <Text style={styles.miniStatLabel}>Pending</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatVal, { color: DS.success }]}>{formatCurrency(stats?.totalEarnings ?? 0)}</Text>
                <Text style={styles.miniStatLabel}>Lifetime Earned</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.requestBtn, !canRequest && { opacity: 0.4 }]}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}
              disabled={!canRequest}
            >
              <Ionicons name="cash-outline" size={17} color="#fff" />
              <Text style={styles.requestBtnText}>Request Withdrawal</Text>
            </TouchableOpacity>
            {hasPending ? (
              <Text style={styles.noBalanceHint}>You already have a pending request — wait for it to be reviewed</Text>
            ) : availableBalance <= 0 ? (
              <Text style={styles.noBalanceHint}>No balance available to withdraw yet</Text>
            ) : null}
          </>
        )}
      </View>

      {/* History sheet */}
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Withdrawal History</Text>

        <FlatList
          data={loading ? [] : history}
          keyExtractor={item => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[DS.primary]} tintColor={DS.primary} />
          }
          renderItem={({ item }) => <WithdrawalRow item={item} />}
          ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
          ListHeaderComponent={loading ? (
            <View>{Array(4).fill(0).map((_, i) => <SkeletonRow key={i} />)}</View>
          ) : null}
          ListEmptyComponent={!loading ? (
            <View style={styles.emptyWrap}>
              {historyError ? (
                <>
                  <Ionicons name="cloud-offline-outline" size={44} color={DS.text3} />
                  <Text style={styles.emptyTitle}>Could not load history</Text>
                  <Text style={styles.emptyDesc}>{historyError}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons name="wallet-outline" size={44} color={DS.text3} />
                  <Text style={styles.emptyTitle}>No withdrawals yet</Text>
                  <Text style={styles.emptyDesc}>Requests you submit will show up here</Text>
                </>
              )}
            </View>
          ) : null}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <RequestWithdrawalModal
        visible={modalVisible}
        availableBalance={availableBalance}
        onClose={() => setModalVisible(false)}
        onSubmitted={() => {
          setModalVisible(false);
          load();
          Alert.alert('Request Submitted', 'Your withdrawal request has been sent for admin approval.');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK.bg },

  darkSection: { backgroundColor: DARK.bg, paddingHorizontal: 20, paddingBottom: 26 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: DARK.card,
    alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { fontSize: 18, fontWeight: '800', color: DARK.text },

  balanceLabel: { fontSize: 11, fontWeight: '700', color: DARK.text3, letterSpacing: 1 },
  balanceValue: { fontSize: 38, fontWeight: '900', color: DARK.text, marginTop: 6 },

  miniStat:      { flex: 1, backgroundColor: DARK.card, borderRadius: 12, padding: 12 },
  miniStatVal:   { fontSize: 15, fontWeight: '800', color: DARK.text, marginBottom: 2 },
  miniStatLabel: { fontSize: 11, color: DARK.text3, fontWeight: '500' },

  requestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: DS.primary, borderRadius: 14, paddingVertical: 15, marginTop: 20,
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  requestBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  noBalanceHint:  { fontSize: 12, color: DARK.text3, textAlign: 'center', marginTop: 10 },

  errorBox:  { backgroundColor: DARK.card, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8 },
  errorText: { fontSize: 13, color: '#f87171', textAlign: 'center' },
  retryDarkBtn:  { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, backgroundColor: DS.primary, marginTop: 4 },
  retryDarkText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  sheet: {
    flex: 1, backgroundColor: DS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: DS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: 17, fontWeight: '800', color: DS.text, marginBottom: 8 },

  listContent: { flexGrow: 1 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowAmount: { fontSize: 15, fontWeight: '700', color: DS.text },
  rowSub:    { fontSize: 12, color: DS.text3, marginTop: 2 },
  rowRejectNote: { fontSize: 12, color: DS.error, marginTop: 4 },
  rowDivider: { height: 1, backgroundColor: DS.border },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  emptyWrap:  { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: DS.text2 },
  emptyDesc:  { fontSize: 13, color: DS.text3, textAlign: 'center' },
  retryBtn:   { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: DS.primary },
  retryText:  { fontSize: 14, fontWeight: '700', color: '#fff' },

  // ── Modal ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: DS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36,
    maxHeight: '88%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: DS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: DS.primarySoft,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14,
  },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: DS.text, textAlign: 'center', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: DS.text2, textAlign: 'center', marginBottom: 22 },

  field:      { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: DS.text2, marginBottom: 7 },
  input: {
    backgroundColor: DS.bg, borderWidth: 1, borderColor: DS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: DS.text,
  },
  inputErr: { borderColor: DS.error },
  errText:  { fontSize: 12, color: DS.error, marginTop: 6 },

  amountRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  maxBtn: {
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: DS.primary,
  },
  maxBtnText: { fontSize: 12, fontWeight: '700', color: DS.primary },

  methodRow: { flexDirection: 'row', gap: 10 },
  methodChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: DS.border, borderRadius: 12, paddingVertical: 12,
  },
  methodChipSel:     { backgroundColor: DS.primary, borderColor: DS.primary },
  methodChipText:    { fontSize: 13, fontWeight: '600', color: DS.text2 },
  methodChipTextSel: { color: '#fff' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: DS.border,
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: DS.text2 },
  submitBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: DS.primary, borderRadius: 14, paddingVertical: 14,
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  submitText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
