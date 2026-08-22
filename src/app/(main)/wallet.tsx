import { useState, useCallback, useEffect } from 'react';
import {
  View, TouchableOpacity, FlatList, Modal,
  StyleSheet, StatusBar, RefreshControl, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getWithdrawalStats, getWithdrawals, requestWithdrawal, getCommissionHistory, getSavedPayoutMethod,
} from '../../modules/wallet/services/walletService';
import { getUserMessage } from '../../core/api/errorMessage';
import type {
  WithdrawalStats, WithdrawalRequestResponse, WithdrawalStatus, PayoutMethod,
  CommissionRecordResponse, SavedPayoutMethod,
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
function WithdrawalRow({ item, onPress }: { item: WithdrawalRequestResponse; onPress: () => void }) {
  const meta = statusMeta(item.status);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
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
      <Ionicons name="chevron-forward" size={16} color={DS.text3} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

// ── Withdrawal detail sheet ──────────────────────────────────────────────
function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function WithdrawalDetailModal({ item, onClose }: { item: WithdrawalRequestResponse | null; onClose: () => void }) {
  if (!item) return null;
  const meta = statusMeta(item.status);
  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailHeaderLabel}>WITHDRAWAL AMOUNT</Text>
              <Text style={styles.detailHeaderAmount}>{formatCurrency(item.amount)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={12} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>PAYOUT METHOD</Text>
              <DetailRow label="Method" value={item.method === 'UPI' ? 'UPI' : 'Bank Transfer'} />
              {item.method === 'UPI' ? (
                <DetailRow label="UPI ID" value={item.upiId ?? '—'} />
              ) : (
                <>
                  <DetailRow label="Account Holder" value={item.bankAccountName ?? '—'} />
                  <DetailRow label="Account Number" value={item.bankAccountNumber ?? '—'} />
                  <DetailRow label="IFSC Code" value={item.ifscCode ?? '—'} />
                </>
              )}
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>REQUEST INFO</Text>
              <DetailRow label="Requested On" value={formatDate(item.createdAt)} />
              <DetailRow
                label="Reviewed"
                value={item.reviewedAt ? formatDate(item.reviewedAt) : 'Awaiting review'}
                valueColor={item.reviewedAt ? undefined : DS.warning}
              />
              <DetailRow label="Request ID" value={`#${item.id}`} />
              {!!item.note && <DetailRow label="Your Note" value={item.note} />}
            </View>

            {item.status === 'REJECTED' && !!item.adminNote && (
              <View style={[styles.detailCard, { backgroundColor: DS.errorSoft, borderColor: DS.error + '33' }]}>
                <Text style={[styles.detailCardTitle, { color: DS.error }]}>REASON FOR REJECTION</Text>
                <Text style={styles.detailRejectText}>{item.adminNote}</Text>
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

// ── Commission breakdown row ─────────────────────────────────────────────
// Shows exactly how a card purchase turned into wallet credit: gross amount,
// the platform's cut, and the net amount added to the vendor's balance.
// The record's PENDING/SETTLED status is the platform's own internal bookkeeping
// (whether an admin has formally closed the books on it) — it never gates the
// vendor's balance or ability to withdraw, so the row shows "Credited" for both.
// REVERSED is different: a cancelled/duplicate purchase excluded from the vendor's
// totals server-side, so it must render as voided, not as money they actually have.
function CommissionRow({ item, onPress }: { item: CommissionRecordResponse; onPress: () => void }) {
  const net = item.subscriptionAmount - item.commissionAmount;
  const reversed = item.status === 'REVERSED';
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: reversed ? DS.bg : DS.primarySoft }]}>
        <Ionicons name="card-outline" size={18} color={reversed ? DS.text3 : DS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.rowAmount, reversed && { color: DS.text3, textDecorationLine: 'line-through' }]}
          numberOfLines={1}
        >
          {item.cardName ?? 'Card Sale'} · {formatCurrency(net)}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {reversed
            ? 'Cancelled — duplicate purchase, does not count toward your balance'
            : `${formatCurrency(item.subscriptionAmount)} sale − ${formatCurrency(item.commissionAmount)} commission (${item.commissionRate}%)`}
        </Text>
        <Text style={[styles.rowSub, { marginTop: 1 }]} numberOfLines={1}>{formatDate(item.createdAt)}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: reversed ? DS.bg : DS.successSoft }]}>
        <Ionicons
          name={reversed ? 'close-circle-outline' : 'checkmark-done-circle-outline'}
          size={12}
          color={reversed ? DS.text3 : DS.success}
        />
        <Text style={[styles.statusText, { color: reversed ? DS.text3 : DS.success }]}>
          {reversed ? 'Reversed' : 'Credited'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={DS.text3} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

function CommissionDetailModal({ item, onClose }: { item: CommissionRecordResponse | null; onClose: () => void }) {
  if (!item) return null;
  const net = item.subscriptionAmount - item.commissionAmount;
  const reversed = item.status === 'REVERSED';
  const settled = item.status === 'SETTLED';
  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailHeaderLabel}>{reversed ? 'CANCELLED — NOT IN YOUR BALANCE' : 'CREDITED TO YOUR WALLET'}</Text>
              <Text style={[styles.detailHeaderAmount, { color: reversed ? DS.text3 : DS.success }]}>
                {formatCurrency(net)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: reversed ? DS.bg : DS.successSoft }]}>
              <Ionicons
                name={reversed ? 'close-circle-outline' : 'checkmark-done-circle-outline'}
                size={12}
                color={reversed ? DS.text3 : DS.success}
              />
              <Text style={[styles.statusText, { color: reversed ? DS.text3 : DS.success }]}>
                {reversed ? 'Reversed' : 'Credited'}
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>HOW THIS WAS CALCULATED</Text>
              <DetailRow label="Card Sale Amount" value={formatCurrency(item.subscriptionAmount)} />
              <DetailRow
                label={`Platform Commission (${item.commissionRate}%)`}
                value={`− ${formatCurrency(item.commissionAmount)}`}
                valueColor={DS.error}
              />
              <DetailRow label="Net Credited" value={reversed ? '₹0 (reversed)' : formatCurrency(net)} valueColor={reversed ? DS.text3 : DS.success} />
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>SALE INFO</Text>
              <DetailRow label="Card" value={item.cardName ?? 'Card Sale'} />
              <DetailRow label="Purchased On" value={formatDate(item.createdAt)} />
            </View>

            <View style={styles.detailNote}>
              <Ionicons name="information-circle-outline" size={16} color={DS.text2} />
              <Text style={styles.detailNoteText}>
                {reversed
                  ? 'This purchase was cancelled (duplicate purchase). It has been excluded from your available balance and lifetime earnings.'
                  : `This amount is already included in your available balance. "${settled ? 'Settled' : 'Pending'}" ` +
                    'just reflects whether the platform has closed its own books on this sale — it doesn\'t affect what you can withdraw.'}
              </Text>
            </View>

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

// ── Success modal ─────────────────────────────────────────────────────
function SuccessModal({
  visible, title, message, amount, onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  amount: number | null;
  onClose: () => void;
}) {
  const ringScale    = useSharedValue(0.6);
  const ringOpacity  = useSharedValue(0);
  const iconScale    = useSharedValue(0);
  const sheetY       = useSharedValue(24);
  const sheetOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      ringScale.value   = 0.6;
      ringOpacity.value = 0.55;
      iconScale.value   = 0;
      sheetY.value       = 24;
      sheetOpacity.value = 0;

      sheetOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      sheetY.value        = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      iconScale.value    = withDelay(120, withSpring(1, { damping: 9, stiffness: 140 }));
      ringScale.value    = withDelay(120, withTiming(1.9, { duration: 850, easing: Easing.out(Easing.cubic) }));
      ringOpacity.value  = withDelay(120, withTiming(0, { duration: 850, easing: Easing.out(Easing.cubic) }));
    }
  }, [visible]);

  const iconStyle  = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));
  const ringStyle  = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.successOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.successSheet, sheetStyle]}>
          <View style={styles.successBadgeWrap}>
            <Animated.View style={[styles.successRing, ringStyle]} />
            <Animated.View style={[styles.successIconCircle, iconStyle]}>
              <Ionicons name="checkmark" size={34} color="#fff" />
            </Animated.View>
          </View>

          <Text style={styles.successTitle}>{title}</Text>
          <Text style={styles.successSubtitle}>{message}</Text>

          {amount != null && (
            <View style={styles.successAmountPill}>
              <Ionicons name="cash-outline" size={15} color={DS.success} />
              <Text style={styles.successAmountText}>{formatCurrency(amount)} requested</Text>
            </View>
          )}

          <TouchableOpacity style={styles.successDoneBtn} onPress={onClose} activeOpacity={0.88}>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.successDoneText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Request Withdrawal sheet ────────────────────────────────────────────
function RequestWithdrawalModal({
  visible, availableBalance, savedMethod, onClose, onSubmitted,
}: {
  visible: boolean;
  availableBalance: number;
  savedMethod: SavedPayoutMethod | null;
  onClose: () => void;
  onSubmitted: (amount: number) => void;
}) {
  const [amount, setAmount]     = useState('');
  const [method, setMethod]     = useState<PayoutMethod>('BANK_TRANSFER');
  const [holder, setHolder]     = useState('');
  const [acctNum, setAcctNum]   = useState('');
  const [ifsc, setIfsc]         = useState('');
  const [upiId, setUpiId]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [usingSaved, setUsingSaved] = useState(false);

  const amtNum = parseFloat(amount) || 0;
  const amountOk = amtNum > 0 && amtNum <= availableBalance;
  const payoutOk = method === 'UPI'
    ? upiId.trim().length >= 3
    : holder.trim().length > 0 && acctNum.trim().length >= 6 && ifsc.trim().length >= 6;
  const canSubmit = amountOk && payoutOk && !submitting;

  const reset = () => {
    setAmount(''); setMethod('BANK_TRANSFER');
    setHolder(''); setAcctNum(''); setIfsc(''); setUpiId('');
    setUsingSaved(false);
  };
  const handleClose = () => { if (!submitting) { reset(); onClose(); } };

  // Pre-fill from the vendor's last-used payout details every time the sheet opens,
  // so they don't have to retype bank/UPI info on every request.
  useEffect(() => {
    if (visible && savedMethod) {
      setMethod(savedMethod.method);
      setHolder(savedMethod.bankAccountName ?? '');
      setAcctNum(savedMethod.bankAccountNumber ?? '');
      setIfsc(savedMethod.ifscCode ?? '');
      setUpiId(savedMethod.upiId ?? '');
      setUsingSaved(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const useDifferentDetails = () => {
    setHolder(''); setAcctNum(''); setIfsc(''); setUpiId('');
    setUsingSaved(false);
  };

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
      onSubmitted(amtNum);
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

            {usingSaved && (
              <View style={styles.savedBanner}>
                <Ionicons name="checkmark-circle" size={16} color={DS.success} />
                <Text style={styles.savedBannerText}>Using your saved payout details</Text>
                <TouchableOpacity onPress={useDifferentDetails} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.savedBannerAction}>Change</Text>
                </TouchableOpacity>
              </View>
            )}

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
  const [commissions, setCommissions]         = useState<CommissionRecordResponse[]>([]);
  const [commissionsError, setCommissionsError] = useState<string | null>(null);
  const [savedMethod, setSavedMethod] = useState<SavedPayoutMethod | null>(null);
  const [tab, setTab]               = useState<'withdrawals' | 'earnings'>('earnings');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [submittedAmount, setSubmittedAmount] = useState<number | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequestResponse | null>(null);
  const [selectedCommission, setSelectedCommission] = useState<CommissionRecordResponse | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setBalanceError(null);
    setHistoryError(null);
    setCommissionsError(null);
    const [statsResult, historyResult, commissionsResult, payoutMethodResult] = await Promise.allSettled([
      getWithdrawalStats(),
      getWithdrawals(),
      getCommissionHistory(),
      getSavedPayoutMethod(),
    ]);

    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    else setBalanceError(getUserMessage(statsResult.reason, 'Could not load your wallet balance.'));

    if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
    else setHistoryError(getUserMessage(historyResult.reason, 'Could not load withdrawal history.'));

    if (commissionsResult.status === 'fulfilled') setCommissions(commissionsResult.value.content);
    else setCommissionsError(getUserMessage(commissionsResult.reason, 'Could not load your earnings breakdown.'));

    // Best-effort — no saved details just means the form starts blank, not an error state.
    if (payoutMethodResult.status === 'fulfilled') setSavedMethod(payoutMethodResult.value);

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

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'earnings' && styles.tabBtnActive]}
            onPress={() => setTab('earnings')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, tab === 'earnings' && styles.tabBtnTextActive]}>Earnings Breakdown</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'withdrawals' && styles.tabBtnActive]}
            onPress={() => setTab('withdrawals')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, tab === 'withdrawals' && styles.tabBtnTextActive]}>Withdrawal History</Text>
          </TouchableOpacity>
        </View>

        {tab === 'withdrawals' ? (
          <FlatList
            data={loading ? [] : history}
            keyExtractor={item => String(item.id)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[DS.primary]} tintColor={DS.primary} />
            }
            renderItem={({ item }) => <WithdrawalRow item={item} onPress={() => setSelectedWithdrawal(item)} />}
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
        ) : (
          <FlatList
            data={loading ? [] : commissions}
            keyExtractor={item => String(item.id)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[DS.primary]} tintColor={DS.primary} />
            }
            renderItem={({ item }) => <CommissionRow item={item} onPress={() => setSelectedCommission(item)} />}
            ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
            ListHeaderComponent={loading ? (
              <View>{Array(4).fill(0).map((_, i) => <SkeletonRow key={i} />)}</View>
            ) : null}
            ListEmptyComponent={!loading ? (
              <View style={styles.emptyWrap}>
                {commissionsError ? (
                  <>
                    <Ionicons name="cloud-offline-outline" size={44} color={DS.text3} />
                    <Text style={styles.emptyTitle}>Could not load earnings</Text>
                    <Text style={styles.emptyDesc}>{commissionsError}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
                      <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Ionicons name="receipt-outline" size={44} color={DS.text3} />
                    <Text style={styles.emptyTitle}>No earnings yet</Text>
                    <Text style={styles.emptyDesc}>Card purchases will show up here with the commission breakdown</Text>
                  </>
                )}
              </View>
            ) : null}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <RequestWithdrawalModal
        visible={modalVisible}
        availableBalance={availableBalance}
        savedMethod={savedMethod}
        onClose={() => setModalVisible(false)}
        onSubmitted={(amount) => {
          setModalVisible(false);
          setSubmittedAmount(amount);
          load();
          setSuccessVisible(true);
        }}
      />

      <SuccessModal
        visible={successVisible}
        title="Request Submitted"
        message="Your withdrawal request has been sent for admin approval. You'll be notified once it's reviewed."
        amount={submittedAmount}
        onClose={() => setSuccessVisible(false)}
      />

      <WithdrawalDetailModal
        item={selectedWithdrawal}
        onClose={() => setSelectedWithdrawal(null)}
      />

      <CommissionDetailModal
        item={selectedCommission}
        onClose={() => setSelectedCommission(null)}
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

  tabRow: {
    flexDirection: 'row', gap: 8, backgroundColor: DS.bg,
    borderRadius: 12, padding: 4, marginBottom: 14,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  tabBtnActive: { backgroundColor: DS.surface, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: DS.text3 },
  tabBtnTextActive: { color: DS.text },

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

  detailHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailHeaderLabel: { fontSize: 11, fontWeight: '700', color: DS.text3, letterSpacing: 0.8, marginBottom: 6 },
  detailHeaderAmount: { fontSize: 28, fontWeight: '900', color: DS.text },

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
  detailRejectText: { fontSize: 13, color: DS.error, lineHeight: 19 },

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

  successOverlay: { flex: 1, backgroundColor: 'rgba(10,10,12,0.6)', justifyContent: 'flex-end' },
  successSheet: {
    backgroundColor: DS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 28, paddingHorizontal: 24, paddingBottom: 36,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  successBadgeWrap: {
    width: 88, height: 88, alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  successRing: {
    position: 'absolute', width: 76, height: 76, borderRadius: 38,
    backgroundColor: DS.success,
  },
  successIconCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: DS.success, alignItems: 'center', justifyContent: 'center',
    shadowColor: DS.success, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  successTitle: {
    fontSize: 22, fontWeight: '800', color: DS.text, marginBottom: 8, textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14, color: DS.text2, textAlign: 'center', lineHeight: 21, marginBottom: 18,
    paddingHorizontal: 4,
  },
  successAmountPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: DS.successSoft, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9, marginBottom: 22,
  },
  successAmountText: { fontSize: 14, fontWeight: '700', color: DS.success },
  successDoneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: DS.success, borderRadius: 14, paddingVertical: 15, width: '100%',
    shadowColor: DS.success, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  successDoneText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  modalIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: DS.primarySoft,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14,
  },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: DS.text, textAlign: 'center', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: DS.text2, textAlign: 'center', marginBottom: 22 },

  savedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: DS.successSoft, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 16, marginTop: -8,
  },
  savedBannerText:   { flex: 1, fontSize: 12.5, fontWeight: '600', color: DS.success },
  savedBannerAction: { fontSize: 12.5, fontWeight: '700', color: DS.primary },

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
