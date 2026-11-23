// src/modules/auth/components/PinSetupStep.tsx
//
// "Create your 4-digit PIN" + "Enter it again". Used after the phone OTP at
// registration and for Forgot PIN. Rejects PINs the backend would refuse
// (1111, 1234, …) as soon as the 4th digit is typed.

import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import { type TextInputRef } from '../../../components/TextInput';
import PinInput from './PinInput';
import { PIN_LENGTH, pinProblem } from '../utils/validation';

const DS = {
  primary: '#CC2200',
  success: '#16A34A',
  text:    '#1A1A1A',
  text2:   '#5A6272',
  text3:   '#9BA3AF',
};

type Props = {
  title?: string;
  subtitle?: string;
  submitLabel: string;
  loading?: boolean;
  /** Server error (e.g. registration failed) — shown under the fields. */
  error?: string | null;
  onSubmit: (pin: string) => void;
  /** e.g. keyboard-aware scrolling; `extraBelow` keeps the button visible too. */
  onFocusField?: (extraBelow: number) => void;
};

export default function PinSetupStep({
  title = 'Create your 4-digit PIN',
  subtitle = "You'll use this PIN with your mobile number to sign in. Keep it secret.",
  submitLabel,
  loading,
  error,
  onSubmit,
  onFocusField,
}: Props) {
  const [pin, setPin]         = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal]   = useState(false);
  const confirmRef = useRef<TextInputRef>(null);

  const problem   = pin.length === PIN_LENGTH ? pinProblem(pin) : null;
  const mismatch  = confirm.length === PIN_LENGTH && confirm !== pin;
  const canSubmit = pin.length === PIN_LENGTH && !problem && confirm === pin && !loading;

  const submit = (c = confirm) => {
    if (pin.length !== PIN_LENGTH || pinProblem(pin) || c !== pin || loading) return;
    onSubmit(pin);
  };

  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.labelRow}>
        <Text style={styles.label}>New PIN</Text>
        <TouchableOpacity onPress={() => setReveal(r => !r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={styles.revealRow}>
            <Ionicons name={reveal ? 'eye-off-outline' : 'eye-outline'} size={16} color={DS.text2} />
            <Text style={styles.revealText}>{reveal ? 'Hide' : 'Show'}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <PinInput
        value={pin}
        onChangeText={(v) => { setPin(v); if (confirm) setConfirm(''); }}
        onComplete={(p) => { if (!pinProblem(p)) setTimeout(() => confirmRef.current?.focus(), 50); }}
        onFocus={() => onFocusField?.(160)}
        reveal={reveal}
        invalid={!!problem}
        editable={!loading}
        autoFocus
        accessibilityLabel="New 4-digit PIN"
      />
      {!!problem && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
          <Text style={styles.errorText}>{problem}</Text>
        </View>
      )}

      <Text style={[styles.label, { marginTop: 8 }]}>Enter the same PIN again</Text>
      <PinInput
        ref={confirmRef}
        value={confirm}
        onChangeText={setConfirm}
        onComplete={(c) => submit(c)}
        onFocus={() => onFocusField?.(90)}
        reveal={reveal}
        invalid={mismatch}
        editable={!loading && pin.length === PIN_LENGTH && !problem}
        accessibilityLabel="Confirm 4-digit PIN"
      />
      {mismatch && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
          <Text style={styles.errorText}>The PINs don't match. Please try again.</Text>
        </View>
      )}
      {!mismatch && confirm.length === PIN_LENGTH && confirm === pin && (
        <View style={styles.okRow}>
          <Ionicons name="checkmark-circle" size={14} color={DS.success} />
          <Text style={styles.okText}>PINs match</Text>
        </View>
      )}

      {!!error && (
        <View style={[styles.errorRow, { marginTop: 4 }]}>
          <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
        onPress={() => submit()}
        disabled={!canSubmit}
        activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator size="small" color="#fff" /> : (
          <>
            <Ionicons name="lock-closed-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{submitLabel}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  title:    { fontSize: 20, fontWeight: '800', color: DS.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: DS.text2, lineHeight: 20, marginBottom: 20 },

  labelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label:      { fontSize: 13, fontWeight: '600', color: DS.text2, marginBottom: 8 },
  revealRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  revealText: { fontSize: 13, color: DS.text2, fontWeight: '600' },

  errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 12 },
  errorText: { fontSize: 13, color: DS.primary, flex: 1 },
  okRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  okText:    { fontSize: 13, color: DS.success, fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary, borderRadius: 14, height: 52, marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
