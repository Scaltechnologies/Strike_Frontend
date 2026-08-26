// Mirrors home.tsx's OrderAcceptedModal exactly — same success-sheet shape, reused so the
// vendor sees one consistent "confirmed" moment whether it came from a redemption or a
// Pay-at-Store payment.
import { View, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import type { PayAtStorePayment } from '../types';

const DS = {
  bg: '#F6F7FA', surface: '#FFFFFF', border: '#EAECEF',
  primary: '#CC2200', text: '#1A1A1A', text2: '#5A6272', text3: '#9BA3AF',
  success: '#16A34A',
};

function fmt(n: number): string {
  return n % 1 === 0 ? `₹${n}` : `₹${n.toFixed(2)}`;
}

interface PaymentConfirmedModalProps {
  payment: PayAtStorePayment | null;
  visible: boolean;
  onClose: () => void;
}

export default function PaymentConfirmedModal({ payment, visible, onClose }: PaymentConfirmedModalProps) {
  if (!payment) return null;

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
          <Text style={[styles.sheetTitle, { marginTop: 16 }]}>Payment Confirmed</Text>
          <Text style={styles.sheetSubtitle}>
            Card activated successfully. The customer can now use it.
          </Text>

          <View style={styles.summaryCard}>
            {[
              { label: 'Amount',   value: fmt(payment.amount) },
              { label: 'Card',     value: payment.cardName },
              { label: 'Order',    value: `#${payment.paymentId}` },
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

          <TouchableOpacity style={styles.proceedBtn} onPress={onClose} activeOpacity={0.85}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.proceedBtnText}>Done</Text>
          </TouchableOpacity>
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
  summaryLabel:   { fontSize: 13, color: DS.text2, fontWeight: '500' },
  summaryValue:   { fontSize: 14, fontWeight: '700', color: DS.text, flexShrink: 1, textAlign: 'right' },
  summaryDivider: { height: 1, backgroundColor: DS.border },

  proceedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.success, borderRadius: 14, paddingVertical: 14,
    alignSelf: 'stretch',
    shadowColor: DS.success, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  proceedBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
