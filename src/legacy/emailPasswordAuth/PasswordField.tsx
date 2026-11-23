// ─────────────────────────────────────────────────────────────────────────
// LEGACY — email + password vendor sign-in. DISABLED.
// Original path: src/modules/auth/components/PasswordField.tsx (replaced by mobile number + 4-digit PIN sign-in).
// Kept commented out for reference; see ./README.md to re-enable.
// ─────────────────────────────────────────────────────────────────────────
// // src/modules/auth/components/PasswordField.tsx
// //
// // Password input with a show/hide toggle, styled like the auth screens' inputs.
//
// import { forwardRef, useState } from 'react';
// import { View, TouchableOpacity, StyleSheet, type TextInputProps } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import TextInput, { type TextInputRef } from '../../../components/TextInput';
//
// const C = {
//   bg: '#F6F7FA',
//   border: '#EAECEF',
//   primary: '#CC2200',
//   text: '#1A1A1A',
//   text2: '#5A6272',
//   text3: '#9BA3AF',
// };
//
// type Props = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
//   invalid?: boolean;
// };
//
// const PasswordField = forwardRef<TextInputRef, Props>(({ invalid, ...props }, ref) => {
//   const [visible, setVisible] = useState(false);
//   return (
//     <View style={[styles.row, invalid && styles.rowInvalid]}>
//       <TextInput
//         ref={ref}
//         style={styles.input}
//         placeholderTextColor={C.text3}
//         secureTextEntry={!visible}
//         autoCapitalize="none"
//         autoCorrect={false}
//         spellCheck={false}
//         maxLength={128}
//         {...props}
//       />
//       <TouchableOpacity
//         style={styles.eye}
//         onPress={() => setVisible(v => !v)}
//         hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//         accessibilityRole="button"
//         accessibilityLabel={visible ? 'Hide password' : 'Show password'}
//       >
//         <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.text2} />
//       </TouchableOpacity>
//     </View>
//   );
// });
//
// PasswordField.displayName = 'PasswordField';
// export default PasswordField;
//
// const styles = StyleSheet.create({
//   row: {
//     flexDirection: 'row', alignItems: 'center',
//     backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
//     borderRadius: 12, height: 52, marginBottom: 16, overflow: 'hidden',
//   },
//   rowInvalid: { borderColor: C.primary },
//   input: { flex: 1, paddingHorizontal: 14, fontSize: 15, color: C.text, height: '100%' },
//   eye: { paddingHorizontal: 14, height: '100%', justifyContent: 'center' },
// });
