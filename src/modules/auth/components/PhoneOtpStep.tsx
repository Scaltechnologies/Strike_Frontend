// src/modules/auth/components/PhoneOtpStep.tsx
//
// "Enter the OTP sent to +91 …" — sends a Firebase phone OTP as soon as it
// mounts, lets the vendor type the 6-digit code (or continues by itself when
// Android verifies the number automatically), and hands back the Firebase ID
// token that proves the number to the backend.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import { type TextInputRef } from '../../../components/TextInput';
import OtpCodeInput, { OTP_LENGTH } from './OtpCodeInput';
import { useCountdown } from '../hooks/useCountdown';
import {
  sendPhoneOtp,
  confirmPhoneOtp,
  getFirebaseIdToken,
  onPhoneAutoVerified,
} from '../../../core/firebase/firebaseAuth';

const RESEND_SECONDS = 60;

const DS = {
  primary: '#CC2200',
  success: '#16A34A',
  info:    '#2563EB',
  infoSoft:'#EEF4FF',
  text:    '#1A1A1A',
  text2:   '#5A6272',
  text3:   '#9BA3AF',
};

type Props = {
  mobileNumber: string;
  /** Called once with the Firebase ID token after the number is verified. */
  onVerified: (firebaseIdToken: string) => void;
  onChangeNumber?: () => void;
  /** e.g. keyboard-aware scrolling */
  onFocusCode?: () => void;
};

export default function PhoneOtpStep({ mobileNumber, onVerified, onChangeNumber, onFocusCode }: Props) {
  const [code, setCode]           = useState('');
  const [sending, setSending]     = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [autoNote, setAutoNote]   = useState(false);
  const { seconds, start }        = useCountdown();
  const codeRef   = useRef<TextInputRef>(null);
  const done      = useRef(false);
  const mounted   = useRef(true);
  const startedFor = useRef<string | null>(null);
  // Parent usually passes an inline callback — keep the latest without
  // re-running the effects below.
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  const finish = useCallback(async (getToken: () => Promise<string>) => {
    if (done.current) return;
    try {
      setVerifying(true);
      setError(null);
      const token = await getToken();
      if (done.current || !mounted.current) return;
      done.current = true;
      onVerifiedRef.current(token);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      setCode('');
      setTimeout(() => codeRef.current?.focus(), 100);
    } finally {
      if (mounted.current) setVerifying(false);
    }
  }, []);

  const send = useCallback(async (forceResend: boolean) => {
    try {
      setSending(true);
      setError(null);
      setCode('');
      await sendPhoneOtp(mobileNumber, { forceResend });
      if (!mounted.current) return;
      start(RESEND_SECONDS);
      setTimeout(() => codeRef.current?.focus(), 150);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : 'Could not send the OTP. Please try again.');
    } finally {
      if (mounted.current) setSending(false);
    }
  }, [mobileNumber, start]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    // Guard against a second send for the same number (React dev double-mount).
    if (startedFor.current === mobileNumber) return;
    startedFor.current = mobileNumber;
    done.current = false;
    void send(false);
  }, [mobileNumber, send]);

  useEffect(() => onPhoneAutoVerified((user) => {
    setAutoNote(true);
    void finish(() => getFirebaseIdToken(user));
  }), [finish]);

  const verify = (value = code) => {
    if (value.length !== OTP_LENGTH || verifying) return;
    void finish(async () => getFirebaseIdToken(await confirmPhoneOtp(value)));
  };

  const busy = sending || verifying;

  return (
    <View>
      <Text style={styles.title}>Verify your mobile number</Text>
      <Text style={styles.sentText}>
        {sending ? 'Sending an OTP to ' : 'Enter the 6-digit OTP sent by SMS to '}
        <Text style={styles.bold}>+91 {mobileNumber}</Text>
      </Text>
      {!!onChangeNumber && (
        <TouchableOpacity onPress={onChangeNumber} disabled={verifying} hitSlop={{ top: 8, bottom: 8 }}>
          <Text style={styles.changeLink}>Change number</Text>
        </TouchableOpacity>
      )}

      <OtpCodeInput
        ref={codeRef}
        value={code}
        onChangeText={(t) => { setCode(t); if (error) setError(null); }}
        onComplete={c => verify(c)}
        invalid={!!error}
        editable={!verifying}
        onFocus={onFocusCode}
      />

      {autoNote && verifying && (
        <View style={styles.infoRow}>
          <Ionicons name="checkmark-circle" size={16} color={DS.success} />
          <Text style={styles.infoText}>Number verified automatically.</Text>
        </View>
      )}

      {!!error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, (code.length !== OTP_LENGTH || busy) && styles.primaryBtnDisabled]}
        onPress={() => verify()}
        disabled={code.length !== OTP_LENGTH || busy}
        activeOpacity={0.85}
      >
        {verifying ? <ActivityIndicator size="small" color="#fff" /> : (
          <>
            <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Verify OTP</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendRow}
        onPress={() => send(true)}
        disabled={seconds > 0 || busy}
        hitSlop={{ top: 8, bottom: 8 }}
      >
        {sending ? <ActivityIndicator size="small" color={DS.primary} /> : (
          <Text style={[styles.resend, (seconds > 0 || busy) && styles.resendDisabled]}>
            {seconds > 0 ? `Resend OTP in ${seconds}s` : 'Resend OTP'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  title:     { fontSize: 20, fontWeight: '800', color: DS.text, marginBottom: 6 },
  sentText:  { fontSize: 14, color: DS.text2, lineHeight: 20, marginBottom: 6 },
  bold:      { fontWeight: '700', color: DS.text },
  changeLink:{ fontSize: 13, color: DS.primary, fontWeight: '600', marginBottom: 16 },

  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  infoText: { fontSize: 13, color: DS.success, fontWeight: '600' },

  errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 12 },
  errorText: { fontSize: 13, color: DS.primary, flex: 1 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary, borderRadius: 14, height: 52, marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  resendRow:      { alignItems: 'center', paddingVertical: 14, minHeight: 48, justifyContent: 'center' },
  resend:         { fontSize: 14, color: DS.primary, fontWeight: '700' },
  resendDisabled: { color: DS.text3 },
});
