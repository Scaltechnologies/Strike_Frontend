// 6-digit manual code entry, tied to an already-selected pending payment (verify-code requires
// paymentId up front — unlike verify-qr, which resolves the payment from the token alone; see
// VendorPayAtStoreController.java). Opened by tapping a row in the Pending list.
import { useEffect, useRef, useState } from 'react';
import { Modal, View, TouchableOpacity, Animated, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import { usePayAtStore } from '../store/PayAtStoreContext';
import type { PayAtStorePayment } from '../types';

const DS = {
  bg: '#F6F7FA', surface: '#FFFFFF', border: '#EAECEF',
  primary: '#CC2200', primaryDark: '#991A00',
  error: '#DC2626', errorSoft: '#FFF1F1',
  text: '#1A1A1A', text2: '#5A6272', text3: '#9BA3AF',
};

const CODE_LENGTH = 6;

function extractErrorCopy(e: any): { message: string; locked: boolean } {
  const code = e?.code;
  // The fallback below is deliberately generic for the vendor, but that means
  // a code the switch below doesn't recognize (wrong enum name, no code at
  // all, plain network failure) otherwise vanishes silently — log the real
  // status/code/message unconditionally so a failure here is diagnosable
  // from Metro instead of just "doesn't work".
  if (__DEV__) console.log('[PayAtStore] verify-code error — status:', e?.status, 'code:', code, 'message:', e?.message);
  if (code === 'TOO_MANY_ATTEMPTS') return { message: e.message?.split(' — ').pop() ?? 'Too many incorrect attempts. Try again later.', locked: true };
  if (code === 'INVALID_PAYMENT_CODE') return { message: 'Incorrect code. Please check with the customer and try again.', locked: false };
  if (code === 'WRONG_VENDOR') return { message: 'This order belongs to another store.', locked: false };
  if (code === 'PAYMENT_EXPIRED') return { message: 'This payment session has expired.', locked: false };
  if (code === 'PAYMENT_ALREADY_SUCCESSFUL') return { message: 'This payment has already been confirmed.', locked: false };
  if (code === 'PAYMENT_NOT_CONFIRMABLE') return { message: e.message?.split(' — ').pop() ?? 'This payment can no longer be verified.', locked: false };
  if (code === 'PAYMENT_NOT_FOUND') return { message: "This order wasn't found — it may have been cancelled. Pull to refresh and try again.", locked: false };
  if (code === 'PAY_AT_STORE_NOT_SUPPORTED') return { message: "This card doesn't support Pay at Store.", locked: false };
  // Gateway-level auth failures (expired/invalid/missing vendor session) — distinct from a real
  // network problem, but easy to confuse with one if not called out by name (see JwtAuthFilter).
  if (code === 'TOKEN_EXPIRED' || code === 'AUTH_REQUIRED') return { message: 'Your session has expired. Please log out and log back in.', locked: false };
  if (code === 'TOKEN_INVALID') return { message: 'Your session is invalid. Please log out and log back in.', locked: false };
  // An unrecognized 409 with no PaymentErrorCode is a raw DB write-conflict (two verify attempts
  // landing at once) surfaced by the backend's generic DataIntegrityViolationException handler —
  // a transient collision, not a connectivity problem. Retrying (this exact code is still valid)
  // resolves it once the first attempt's transaction has committed.
  if (e?.status === 409) return { message: 'That took a moment to process — please try entering the code again.', locked: false };
  return { message: 'Could not verify this code. Check your connection and try again.', locked: false };
}

interface CodeEntryModalProps {
  payment: PayAtStorePayment | null;
  visible: boolean;
  onClose: () => void;
  onVerified: (payment: PayAtStorePayment) => void;
}

export default function CodeEntryModal({ payment, visible, onClose, onVerified }: CodeEntryModalProps) {
  const { verifyCode } = usePayAtStore();
  const [digits, setDigits] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const shakeX = useRef(new Animated.Value(0)).current;
  // Two rapid keypad taps landing before either commits `setVerifying(true)`
  // could both pass the `!verifyingRef.current` check below. A ref flips
  // synchronously, closing that window.
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setDigits('');
      setError(null);
      setLocked(false);
      setVerifying(false);
      verifyingRef.current = false;
    }
  }, [visible]);

  const runShake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const submitIfComplete = async (clean: string) => {
    if (clean.length === CODE_LENGTH && payment && !verifyingRef.current) {
      verifyingRef.current = true;
      setVerifying(true);
      try {
        const result = await verifyCode(payment.paymentId, clean);
        onVerified(result);
      } catch (e: any) {
        const { message, locked: isLocked } = extractErrorCopy(e);
        setError(message);
        setLocked(isLocked);
        if (!isLocked) {
          runShake();
          setDigits('');
        }
      } finally {
        verifyingRef.current = false;
        setVerifying(false);
      }
    }
  };

  const handleKeyTap = (digit: string) => {
    if (verifying || locked || digits.length >= CODE_LENGTH) return;
    const next = digits + digit;
    setDigits(next);
    setError(null);
    submitIfComplete(next);
  };

  const handleBackspace = () => {
    if (verifying || locked || digits.length === 0) return;
    setDigits(digits.slice(0, -1));
    setError(null);
  };

  if (!payment) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={verifying ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={verifying ? undefined : onClose} activeOpacity={1} disabled={verifying} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.iconCircle}>
            <Ionicons name="keypad-outline" size={30} color={DS.primary} />
          </View>
          <Text style={styles.title}>Enter Payment Code</Text>
          <Text style={styles.subtitle}>Ask the customer for the 6-digit code shown on their screen.</Text>

          <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
            <View style={styles.digitsRow}>
              {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.digitBox,
                    i < digits.length && styles.digitBoxFilled,
                    i === digits.length && !verifying && !locked && styles.digitBoxActive,
                    error && !locked && styles.digitBoxError,
                  ]}
                >
                  <Text style={styles.digitText}>{digits[i] ?? ''}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {verifying && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={DS.primary} />
              <Text style={styles.statusText}>Verifying…</Text>
            </View>
          )}

          {error && (
            <View style={[styles.errorBanner, locked && { backgroundColor: DS.errorSoft }]}>
              <Ionicons name="alert-circle" size={16} color={DS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Self-contained keypad instead of the system keyboard — a bottom
              sheet has no reliable way to stay above a native keyboard on
              Android without clipping its own content, and this keeps the
              layout identical (and fully visible) on every device. */}
          <View style={styles.keypad}>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, ri) => (
              <View key={ri} style={styles.keypadRow}>
                {row.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={styles.key}
                    onPress={() => handleKeyTap(d)}
                    activeOpacity={0.6}
                    disabled={verifying || locked}
                  >
                    <Text style={styles.keyText}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            <View style={styles.keypadRow}>
              <View style={styles.key} />
              <TouchableOpacity
                style={styles.key}
                onPress={() => handleKeyTap('0')}
                activeOpacity={0.6}
                disabled={verifying || locked}
              >
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.key}
                onPress={handleBackspace}
                activeOpacity={0.6}
                disabled={verifying || locked || digits.length === 0}
              >
                <Ionicons name="backspace-outline" size={22} color={DS.text2} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8} disabled={verifying}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
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
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FFF0EE', alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 12,
  },
  title:    { fontSize: 20, fontWeight: '800', color: DS.text, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, color: DS.text2, textAlign: 'center', lineHeight: 19, marginBottom: 24, maxWidth: 280 },

  digitsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 4 },
  digitBox: {
    width: 44, height: 54, borderRadius: 12,
    borderWidth: 1.5, borderColor: DS.border, backgroundColor: DS.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  digitBoxFilled: { borderColor: DS.primary, backgroundColor: '#FFF0EE' },
  digitBoxActive: { borderColor: DS.primary, borderWidth: 2 },
  digitBoxError:  { borderColor: DS.error, backgroundColor: DS.errorSoft },
  digitText: { fontSize: 22, fontWeight: '800', color: DS.text },

  keypad: { width: '100%', marginTop: 20, gap: 12 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  key: {
    flex: 1, height: 54, borderRadius: 14,
    backgroundColor: DS.bg, borderWidth: 1, borderColor: DS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  keyText: { fontSize: 20, fontWeight: '700', color: DS.text },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  statusText: { fontSize: 13, color: DS.text2, fontWeight: '600' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF1F1', borderRadius: 12, padding: 12,
    marginTop: 16, width: '100%',
  },
  errorText: { flex: 1, fontSize: 13, color: DS.error, fontWeight: '600', lineHeight: 18 },

  cancelBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24 },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: DS.text2 },
});
