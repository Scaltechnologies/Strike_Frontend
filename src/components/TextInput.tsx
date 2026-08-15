import { forwardRef } from 'react';
import { TextInput as RNTextInput, StyleSheet, type TextInputProps } from 'react-native';
import { getFontFamilyForWeight } from '../core/theme/fonts';

export type TextInputRef = RNTextInput;

const TextInput = forwardRef<RNTextInput, TextInputProps>(({ style, ...props }, ref) => {
  const flat = StyleSheet.flatten(style) || {};
  const fontFamily = getFontFamilyForWeight(flat.fontWeight);

  return (
    <RNTextInput
      ref={ref}
      {...props}
      style={[style, { fontFamily, fontWeight: undefined }]}
    />
  );
});

TextInput.displayName = 'TextInput';

export default TextInput;
