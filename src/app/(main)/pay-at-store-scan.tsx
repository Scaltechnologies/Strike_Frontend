// QR scanner for Pay-at-Store — verify-qr resolves the payment from the scanned token alone
// (unlike verify-code, which needs a paymentId picked ahead of time), so this screen works as a
// standalone entry point, not tied to a specific pending row.
import { useState, useCallback, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePayAtStore } from '../../modules/payAtStore/store/PayAtStoreContext';
import VerificationResultModal from '../../modules/payAtStore/components/VerificationResultModal';
import PaymentConfirmedModal from '../../modules/payAtStore/components/PaymentConfirmedModal';
import type { PayAtStorePayment } from '../../modules/payAtStore/types';

const DS = {
  primary: '#CC2200', success: '#16A34A', error: '#DC2626',
};

// Every Pay-at-Store QR the User App renders encodes this exact prefix ahead of the raw token
// (see PaymentServiceImpl#createPayment: qrPayload = "STRIKE-PAY-STORE:" + rawQrToken). The
// backend hashes and matches only the raw token — verify-qr must never receive the prefix.
const QR_PREFIX = 'STRIKE-PAY-STORE:';

function extractErrorCopy(e: any): string {
  const code = e?.code;
  if (__DEV__) console.log('[PayAtStore] verify-qr error — status:', e?.status, 'code:', code, 'message:', e?.message);
  if (code === 'INVALID_QR') return "This QR code isn't a valid Strike Pay-at-Store code.";
  if (code === 'WRONG_VENDOR') return 'This order belongs to another store.';
  if (code === 'PAYMENT_EXPIRED') return 'This payment session has expired.';
  if (code === 'PAYMENT_ALREADY_SUCCESSFUL') return 'This payment has already been confirmed.';
  if (code === 'PAYMENT_NOT_CONFIRMABLE') return e.message?.split(' — ').pop() ?? 'This payment can no longer be verified.';
  if (code === 'PAYMENT_NOT_FOUND') return "This order wasn't found — it may have been cancelled.";
  if (code === 'PAY_AT_STORE_NOT_SUPPORTED') return "This card doesn't support Pay at Store.";
  return 'Could not verify this QR code. Check your connection and try again.';
}

export default function PayAtStoreScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { verifyQr } = usePayAtStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PayAtStorePayment | null>(null);
  const [confirmed, setConfirmed] = useState<PayAtStorePayment | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-arm scanning every time this screen regains focus (e.g. after closing the result sheet
  // and coming back to scan the next customer).
  useFocusEffect(useCallback(() => {
    setScanned(false);
    setError(null);
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []));

  const handleScan = async ({ data }: BarcodeScanningResult) => {
    if (scanned || verifying) return;
    setScanned(true);
    setError(null);

    if (!data.startsWith(QR_PREFIX)) {
      setError("This doesn't look like a Strike Pay-at-Store QR code.");
      resumeTimer.current = setTimeout(() => setScanned(false), 1500);
      return;
    }
    const rawToken = data.slice(QR_PREFIX.length);

    setVerifying(true);
    try {
      const payment = await verifyQr(rawToken);
      setResult(payment);
    } catch (e: any) {
      setError(extractErrorCopy(e));
      resumeTimer.current = setTimeout(() => setScanned(false), 1800);
    } finally {
      setVerifying(false);
    }
  };

  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionRoot}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionIconWrap}>
          <Ionicons name="camera-outline" size={40} color={DS.primary} />
        </View>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionDetail}>
          Strike needs your camera to scan a customer's Pay-at-Store QR code.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permissionBtnText}>Allow Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permissionCancel} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.permissionCancelText}>Not now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />

      {/* Dim overlay with a clear frame cut-out */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Scan Customer's QR</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setTorch((t) => !t)} activeOpacity={0.7}>
            <Ionicons name={torch ? 'flash' : 'flash-outline'} size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.frameWrap}>
          <View style={[styles.frame, error && styles.frameError]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.instruction}>Align the QR code within the frame</Text>
        </View>

        {verifying && (
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>Verifying…</Text>
          </View>
        )}
        {error && !verifying && (
          <View style={[styles.statusPill, styles.statusPillError]}>
            <Ionicons name="alert-circle" size={14} color="#fff" />
            <Text style={styles.statusPillText}>{error}</Text>
          </View>
        )}
      </View>

      <VerificationResultModal
        payment={result}
        visible={!!result}
        onClose={() => { setResult(null); setScanned(false); }}
        onConfirmed={(payment) => { setResult(null); setConfirmed(payment); }}
        onError={(message) => { setResult(null); setScanned(false); Alert.alert('Could not confirm payment', message); }}
      />
      <PaymentConfirmedModal
        payment={confirmed}
        visible={!!confirmed}
        onClose={() => { setConfirmed(null); router.back(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center' },

  topBar: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },

  frameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  frame: { width: 240, height: 240, position: 'relative' },
  frameError: { opacity: 0.6 },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: DS.success, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  instruction: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 18, marginBottom: 40,
  },
  statusPillError: { backgroundColor: 'rgba(220,38,38,0.85)' },
  statusPillText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  permissionRoot: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 32 },
  permissionIconWrap: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(204,34,0,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  permissionTitle: { fontSize: 19, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  permissionDetail: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20, marginBottom: 28, maxWidth: 280 },
  permissionBtn: { backgroundColor: DS.primary, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 32 },
  permissionBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  permissionCancel: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 24 },
  permissionCancelText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
});
