// 6-digit manual code entry, tied to an already-selected pending payment (verify-code requires
// paymentId up front — unlike verify-qr, which resolves the payment from the token alone; see
// VendorPayAtStoreController.java). Opened by tapping a row in the Pending list.
import { useEffect, useRef, useState } from 'react';
import { Modal, View, TouchableOpacity, TextInput, Animated, ActivityIndicator, StyleSheet } from 'react-native';
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
  const inputRef = useRef<TextInput>(null);
  // React state updates aren't synchronous — two onChangeText events firing back-to-back (Android
  // IME/autofill routinely delivers duplicates) can both read `verifying` as still false before
  // either commits `setVerifying(true)`, firing verifyCode twice concurrently for the same
  // payment. A ref flips synchronously, closing that window.
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

  // Modal's onShow fires once the native presentation animation actually
  // finishes, unlike a guessed setTimeout delay — focusing before that on
  // Android silently no-ops because the input isn't attached to a window yet.
  const focusInput = () => inputRef.current?.focus();

  const runShake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleChange = async (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setDigits(clean);
    setError(null);
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

  if (!payment) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={verifying ? undefined : onClose}
      onShow={focusInput}
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
            <View style={styles.digitsWrap}>
              <View style={styles.digitsRow} pointerEvents="none">
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
              {/* A real TextInput stacked exactly over the boxes — so a tap on a
                  box is a genuine tap on the input itself. Calling .focus()
                  programmatically (via onShow, below) is best-effort and can
                  silently no-op on some Android OEM keyboards; a direct native
                  touch on the input never fails to raise the keyboard. */}
              <TextInput
                ref={inputRef}
                value={digits}
                onChangeText={handleChange}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                style={styles.overlayInput}
                editable={!verifying && !locked}
                caretHidden
                contextMenuHidden
              />
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

  digitsWrap: { alignSelf: 'center', marginBottom: 4 },
  digitsRow: { flexDirection: 'row', gap: 8 },
  digitBox: {
    width: 44, height: 54, borderRadius: 12,
    borderWidth: 1.5, borderColor: DS.border, backgroundColor: DS.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  digitBoxFilled: { borderColor: DS.primary, backgroundColor: '#FFF0EE' },
  digitBoxActive: { borderColor: DS.primary, borderWidth: 2 },
  digitBoxError:  { borderColor: DS.error, backgroundColor: DS.errorSoft },
  digitText: { fontSize: 22, fontWeight: '800', color: DS.text },

  // Sits directly on top of digitsRow at its exact size — a real, tappable
  // input rather than an off-to-the-side 1x1 decoy, so the OS always treats
  // the tap as landing on a genuine text field.
  overlayInput: { ...StyleSheet.absoluteFill, opacity: 0 },

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
