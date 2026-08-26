// Shown after a successful verify-qr or verify-code call, from either the scanner or the
// code-entry sheet — one shared confirmation step for both paths. Verifying only proves the
// vendor is looking at the right session (see PaymentServiceImpl#resolveVerification); this
// modal's "Yes, Payment Received" button is the explicit, separate confirm step the backend
// requires. Styled identically to home.tsx's ConfirmStrikeModal (same overlay/sheet/summaryCard
// shapes) so the vendor sees one consistent confirm pattern across the app.
import { useState } from 'react';
import { Modal, View, TouchableOpacity, ActivityIndicator, useWindowDimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import { usePayAtStore } from '../store/PayAtStoreContext';
import type { PayAtStorePayment } from '../types';

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

function fmt(n: number): string {
  return n % 1 === 0 ? `₹${n}` : `₹${n.toFixed(2)}`;
}

interface VerificationResultModalProps {
  payment: PayAtStorePayment | null;
  visible: boolean;
  onClose: () => void;
  onConfirmed: (payment: PayAtStorePayment) => void;
  onError: (message: string) => void;
}

export default function VerificationResultModal({
  payment, visible, onClose, onConfirmed, onError,
}: VerificationResultModalProps) {
  const { confirm } = usePayAtStore();
  const { height: SH } = useWindowDimensions();
  const [processing, setProcessing] = useState(false);
  if (!payment) return null;

  // Never dismiss immediately on tap — a lost network response after the request actually
  // landed must not read as "nothing happened, tap again" (see spec: never create a duplicate
  // confirmation). confirmPayment is idempotent server-side regardless, but staying open until
  // we know the outcome is what keeps the vendor from tapping twice in the first place.
  const handleConfirmPress = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const result = await confirm(payment.paymentId);
      onClose();
      onConfirmed(result);
    } catch (e: any) {
      onClose();
      onError(e?.message ?? 'Could not confirm this payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={processing ? undefined : onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={processing ? undefined : onClose} activeOpacity={1} disabled={processing} />
        <View style={[styles.sheet, { maxHeight: SH * 0.88 }]}>
          <View style={styles.handle} />
          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Ionicons name="wallet-outline" size={36} color={DS.success} />
            </View>
          </View>
          <Text style={styles.amount}>{fmt(payment.amount)}</Text>
          <Text style={styles.sheetTitle}>Confirm Payment</Text>
          <Text style={styles.sheetSubtitle}>
            Have you received {fmt(payment.amount)} from this customer?
          </Text>

          <View style={styles.summaryCard}>
            {[
              { icon: 'card-outline' as const, label: 'Card', value: payment.cardName },
              { icon: 'pricetag-outline' as const, label: 'Order', value: `#${payment.paymentId}` },
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
          </View>

          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={[styles.cancelBtn, processing && { opacity: 0.5 }]}
              onPress={onClose} activeOpacity={0.8} disabled={processing}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.proceedBtn, processing && { opacity: 0.75 }]}
              onPress={handleConfirmPress} activeOpacity={0.85} disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.proceedBtnText}>Yes, Payment Received</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  handle:  { width: 40, height: 4, backgroundColor: DS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheet: {
    backgroundColor: DS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36,
    alignItems: 'center', width: '100%',
  },
  iconWrap:   { marginTop: 8, marginBottom: 12 },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: DS.successSoft, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#A3D9B4',
  },
  amount: { fontSize: 30, fontWeight: '900', color: DS.text, marginBottom: 4, letterSpacing: -0.5 },
  sheetTitle:    { fontSize: 20, fontWeight: '800', color: DS.text, marginBottom: 8, textAlign: 'center' },
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
});
