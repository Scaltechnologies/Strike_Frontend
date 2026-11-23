// src/modules/auth/components/OtpCodeInput.tsx
//
// Single 6-digit field (wide letter-spacing) for emailed verification codes.
// One input rather than six boxes so paste and OS autofill always work.

import { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import TextInput, { type TextInputRef } from '../../../components/TextInput';

export const OTP_LENGTH = 6;

type Props = {
  value: string;
  onChangeText: (digits: string) => void;
  onComplete?: (code: string) => void;
  invalid?: boolean;
  editable?: boolean;
};

const OtpCodeInput = forwardRef<TextInputRef, Props>(
  ({ value, onChangeText, onComplete, invalid, editable = true }, ref) => (
    <TextInput
      ref={ref}
      style={[styles.input, invalid && styles.invalid, !editable && styles.disabled]}
      value={value}
      onChangeText={text => {
        const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
        onChangeText(digits);
        if (digits.length === OTP_LENGTH) onComplete?.(digits);
      }}
      placeholder="••••••"
      placeholderTextColor="#C4C9D1"
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      maxLength={OTP_LENGTH + 2}
      editable={editable}
      accessibilityLabel="6-digit verification code"
    />
  ),
);

OtpCodeInput.displayName = 'OtpCodeInput';
export default OtpCodeInput;

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#F6F7FA', borderWidth: 1.5, borderColor: '#EAECEF',
    borderRadius: 12, height: 56, marginBottom: 12,
    fontSize: 24, fontWeight: '800', color: '#1A1A1A',
    textAlign: 'center', letterSpacing: 10,
  },
  invalid:  { borderColor: '#CC2200' },
  disabled: { opacity: 0.6 },
});
