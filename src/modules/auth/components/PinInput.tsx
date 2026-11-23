// src/modules/auth/components/PinInput.tsx
//
// Four big boxes for a 4-digit PIN. A single transparent TextInput sits over
// the boxes, so tapping anywhere on them opens the number pad, and paste /
// backspace behave like a normal field. Digits show as dots unless `reveal`.

import { forwardRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '../../../components/Text';
import TextInput, { type TextInputRef } from '../../../components/TextInput';
import { PIN_LENGTH } from '../utils/validation';

type Props = {
  value: string;
  onChangeText: (digits: string) => void;
  onComplete?: (pin: string) => void;
  onFocus?: () => void;
  reveal?: boolean;
  invalid?: boolean;
  editable?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
};

const PinInput = forwardRef<TextInputRef, Props>(
  ({ value, onChangeText, onComplete, onFocus, reveal = false, invalid, editable = true, autoFocus, accessibilityLabel }, ref) => {
    const [focused, setFocused] = useState(false);
    const active = Math.min(value.length, PIN_LENGTH - 1);

    return (
      <View style={[styles.row, !editable && styles.disabled]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const digit = value[i];
          const isActive = focused && i === active;
          return (
            <View
              key={i}
              style={[
                styles.box,
                digit != null && styles.boxFilled,
                isActive && styles.boxActive,
                invalid && styles.boxInvalid,
              ]}
            >
              {digit != null ? (
                reveal ? <Text style={styles.digit}>{digit}</Text> : <View style={styles.dot} />
              ) : null}
            </View>
          );
        })}
        <TextInput
          ref={ref}
          style={styles.hiddenInput}
          value={value}
          onChangeText={text => {
            const digits = text.replace(/\D/g, '').slice(0, PIN_LENGTH);
            onChangeText(digits);
            if (digits.length === PIN_LENGTH && digits !== value) onComplete?.(digits);
          }}
          onFocus={() => { setFocused(true); onFocus?.(); }}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          maxLength={PIN_LENGTH}
          editable={editable}
          autoFocus={autoFocus}
          caretHidden
          contextMenuHidden
          autoComplete="off"
          importantForAutofill="no"
          secureTextEntry={false}
          accessibilityLabel={accessibilityLabel ?? '4-digit PIN'}
        />
      </View>
    );
  },
);

PinInput.displayName = 'PinInput';
export default PinInput;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  box: {
    flex: 1, maxWidth: 72, height: 64, borderRadius: 14,
    backgroundColor: '#F6F7FA', borderWidth: 1.5, borderColor: '#EAECEF',
    alignItems: 'center', justifyContent: 'center',
  },
  boxFilled:  { borderColor: '#D6DAE0', backgroundColor: '#FFFFFF' },
  boxActive:  { borderColor: '#CC2200', borderWidth: 2 },
  boxInvalid: { borderColor: '#CC2200' },
  dot:   { width: 14, height: 14, borderRadius: 7, backgroundColor: '#1A1A1A' },
  digit: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
  disabled: { opacity: 0.6 },
  // Covers the boxes so a tap anywhere focuses it; invisible but still touchable.
  hiddenInput: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    color: 'transparent', backgroundColor: 'transparent',
    opacity: 0.02, fontSize: 1,
  },
});
