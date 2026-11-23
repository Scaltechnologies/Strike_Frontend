// ─────────────────────────────────────────────────────────────────────────
// LEGACY — email + password vendor sign-in. DISABLED.
// Original path: src/app/change-password.tsx (replaced by mobile number + 4-digit PIN sign-in).
// Kept commented out for reference; see ./README.md to re-enable.
// ─────────────────────────────────────────────────────────────────────────
// // Change password — two modes:
// //   forced=1  right after signing in with a generated password (approval or
// //             forgot-password email). No way back into the app until done;
// //             the only other option is signing out.
// //   default   opened from Profile → Change Password.
//
// import {
//   View, TouchableOpacity, StyleSheet, ScrollView, Alert, BackHandler,
//   KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
// } from 'react-native';
// import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
// import { useCallback, useRef, useState } from 'react';
// import { Ionicons } from '@expo/vector-icons';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import Text from '../components/Text';
// import { type TextInputRef } from '../components/TextInput';
// import PasswordField from '../modules/auth/components/PasswordField';
// import { useChangePassword, signOutLocally } from '../modules/auth/hooks/useAuth';
// import { isStrongPassword, passwordRules } from '../modules/auth/utils/validation';
// import { useKeyboardAwareScroll } from '../core/keyboard/useKeyboardAwareScroll';
//
// const DS = {
//   bg:          '#F6F7FA',
//   surface:     '#FFFFFF',
//   border:      '#EAECEF',
//   primary:     '#CC2200',
//   primarySoft: '#FFF0EE',
//   success:     '#16A34A',
//   warning:     '#D97706',
//   warningSoft: '#FFFBEB',
//   text:        '#1A1A1A',
//   text2:       '#5A6272',
//   text3:       '#9BA3AF',
// };
//
// export default function ChangePasswordScreen() {
//   const insets = useSafeAreaInsets();
//   const { forced } = useLocalSearchParams<{ forced?: string }>();
//   const isForced = forced === '1';
//   const { handleChange, loading, error } = useChangePassword();
//
//   const [current, setCurrent]   = useState('');
//   const [next, setNext]         = useState('');
//   const [confirm, setConfirm]   = useState('');
//   const [confirmTouched, setConfirmTouched] = useState(false);
//   const nextRef    = useRef<TextInputRef>(null);
//   const confirmRef = useRef<TextInputRef>(null);
//   const kb = useKeyboardAwareScroll();
//
//   // Forced mode: Android back must not escape to the app.
//   useFocusEffect(
//     useCallback(() => {
//       if (!isForced) return undefined;
//       const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
//       return () => sub.remove();
//     }, [isForced]),
//   );
//
//   const rules       = passwordRules(next);
//   const strong      = isStrongPassword(next);
//   const matches     = next.length > 0 && next === confirm;
//   const sameAsOld   = next.length > 0 && next === current;
//   const showMismatch = confirmTouched && confirm.length > 0 && !matches;
//   const canSubmit   = current.length > 0 && strong && matches && !sameAsOld && !loading;
//
//   const onSubmit = async () => {
//     if (!canSubmit) return;
//     const ok = await handleChange(current, next);
//     if (!ok) return;
//     if (isForced) {
//       router.replace('/(main)/home');
//     } else {
//       Alert.alert('Password updated', 'Use your new password the next time you sign in.', [
//         { text: 'OK', onPress: () => router.back() },
//       ]);
//     }
//   };
//
//   const confirmSignOut = () =>
//     Alert.alert('Sign out?', 'You can sign in again with the password from your email.', [
//       { text: 'Cancel', style: 'cancel' },
//       { text: 'Sign out', style: 'destructive', onPress: () => { signOutLocally(); } },
//     ]);
//
//   return (
//     <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
//       <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />
//
//       <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
//         {isForced ? (
//           <View style={styles.headerSide} />
//         ) : (
//           <TouchableOpacity style={styles.headerSide} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
//             <Ionicons name="arrow-back" size={22} color={DS.text} />
//           </TouchableOpacity>
//         )}
//         <Text style={styles.headerTitle}>{isForced ? 'Set your password' : 'Change Password'}</Text>
//         <View style={styles.headerSide} />
//       </View>
//
//       <ScrollView
//         ref={kb.scrollRef}
//         onScroll={kb.onScroll}
//         scrollEventThrottle={kb.scrollEventThrottle}
//         style={styles.scroll}
//         contentContainerStyle={styles.scrollContent}
//         keyboardShouldPersistTaps="handled"
//         showsVerticalScrollIndicator={false}
//       >
//         {isForced && (
//           <View style={styles.infoCard}>
//             <Ionicons name="shield-checkmark-outline" size={20} color={DS.warning} />
//             <Text style={styles.infoText}>
//               You signed in with a password we emailed you. Please choose your own password to keep your account secure.
//             </Text>
//           </View>
//         )}
//
//         <View style={styles.card}>
//           <Text style={styles.label}>{isForced ? 'Password from your email' : 'Current password'}</Text>
//           <PasswordField
//             placeholder={isForced ? 'Emailed password' : 'Current password'}
//             value={current}
//             onChangeText={setCurrent}
//             onFocus={() => kb.ensureVisible()}
//             autoComplete="current-password"
//             textContentType="password"
//             returnKeyType="next"
//             submitBehavior="submit"
//             onSubmitEditing={() => nextRef.current?.focus()}
//           />
//
//           <Text style={styles.label}>New password</Text>
//           <PasswordField
//             ref={nextRef}
//             placeholder="New password"
//             value={next}
//             onChangeText={setNext}
//             // Keep the live rules list under this field in view while typing.
//             onFocus={() => kb.ensureVisible(100)}
//             autoComplete="new-password"
//             textContentType="newPassword"
//             returnKeyType="next"
//             submitBehavior="submit"
//             onSubmitEditing={() => confirmRef.current?.focus()}
//           />
//
//           <View style={styles.rules}>
//             {rules.map(r => (
//               <View key={r.id} style={styles.ruleRow}>
//                 <Ionicons
//                   name={r.met ? 'checkmark-circle' : 'ellipse-outline'}
//                   size={15}
//                   color={r.met ? DS.success : DS.text3}
//                 />
//                 <Text style={[styles.ruleText, r.met && styles.ruleTextMet]}>{r.label}</Text>
//               </View>
//             ))}
//             {sameAsOld && (
//               <View style={styles.ruleRow}>
//                 <Ionicons name="close-circle" size={15} color={DS.primary} />
//                 <Text style={[styles.ruleText, { color: DS.primary }]}>Must be different from your current password</Text>
//               </View>
//             )}
//           </View>
//
//           <Text style={styles.label}>Confirm new password</Text>
//           <PasswordField
//             ref={confirmRef}
//             placeholder="Re-enter new password"
//             value={confirm}
//             onChangeText={setConfirm}
//             onBlur={() => setConfirmTouched(true)}
//             // Keep the Save button visible under the last field.
//             onFocus={() => kb.ensureVisible(80)}
//             invalid={showMismatch}
//             autoComplete="new-password"
//             textContentType="newPassword"
//             returnKeyType="done"
//             onSubmitEditing={onSubmit}
//           />
//           {showMismatch && (
//             <View style={styles.errorRow}>
//               <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
//               <Text style={styles.errorText}>Passwords don't match.</Text>
//             </View>
//           )}
//         </View>
//
//         {!!error && (
//           <View style={styles.errorRow}>
//             <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
//             <Text style={styles.errorText}>{error}</Text>
//           </View>
//         )}
//
//         <TouchableOpacity
//           style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
//           onPress={onSubmit}
//           disabled={!canSubmit}
//           activeOpacity={0.85}
//         >
//           {loading ? (
//             <ActivityIndicator size="small" color="#fff" />
//           ) : (
//             <>
//               <Ionicons name="lock-closed-outline" size={18} color="#fff" />
//               <Text style={styles.primaryBtnText}>{isForced ? 'Save and continue' : 'Update password'}</Text>
//             </>
//           )}
//         </TouchableOpacity>
//
//         {isForced && (
//           <TouchableOpacity style={styles.linkRow} onPress={confirmSignOut}>
//             <Text style={styles.linkText}>Sign out</Text>
//           </TouchableOpacity>
//         )}
//         <View style={{ height: kb.keyboardSpace }} />
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }
//
// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: DS.bg },
//
//   header: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
//     backgroundColor: DS.surface, paddingHorizontal: 16, paddingBottom: 14,
//     borderBottomWidth: 1, borderBottomColor: DS.border,
//   },
//   headerSide:  { width: 32, height: 32, justifyContent: 'center' },
//   headerTitle: { fontSize: 17, fontWeight: '700', color: DS.text },
//
//   scroll:        { flex: 1 },
//   scrollContent: { padding: 16, paddingBottom: 40 },
//
//   infoCard: {
//     flexDirection: 'row', gap: 10, alignItems: 'flex-start',
//     backgroundColor: DS.warningSoft, borderRadius: 14, padding: 14, marginBottom: 16,
//   },
//   infoText: { flex: 1, fontSize: 13, color: DS.text2, lineHeight: 19 },
//
//   card: {
//     backgroundColor: DS.surface, borderRadius: 16, padding: 16,
//     borderWidth: 1, borderColor: DS.border, marginBottom: 16,
//   },
//   label: { fontSize: 12, fontWeight: '600', color: DS.text2, marginBottom: 8 },
//
//   rules:       { marginTop: -6, marginBottom: 16, gap: 6 },
//   ruleRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
//   ruleText:    { fontSize: 12, color: DS.text3 },
//   ruleTextMet: { color: DS.success },
//
//   errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: -6, marginBottom: 12 },
//   errorText: { fontSize: 13, color: DS.primary, flex: 1 },
//
//   primaryBtn: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
//     gap: 8, backgroundColor: DS.primary, borderRadius: 14, height: 52, marginBottom: 16,
//   },
//   primaryBtnDisabled: { opacity: 0.4 },
//   primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
//
//   linkRow:  { alignItems: 'center', paddingVertical: 8 },
//   linkText: { fontSize: 14, color: DS.primary, fontWeight: '600' },
// });
