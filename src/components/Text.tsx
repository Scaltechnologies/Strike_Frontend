import { forwardRef } from 'react';
import { Text as RNText, StyleSheet, type TextProps } from 'react-native';
import { getFontFamilyForWeight } from '../core/theme/fonts';

const Text = forwardRef<RNText, TextProps>(({ style, ...props }, ref) => {
  const flat = StyleSheet.flatten(style) || {};
  const fontFamily = getFontFamilyForWeight(flat.fontWeight);

  return (
    <RNText
      ref={ref}
      {...props}
      style={[style, { fontFamily, fontWeight: undefined }]}
    />
  );
});

Text.displayName = 'Text';

export default Text;
