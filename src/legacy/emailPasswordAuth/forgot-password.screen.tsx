// ─────────────────────────────────────────────────────────────────────────
// LEGACY — email + password vendor sign-in. DISABLED.
// Original path: src/app/(auth)/forgot-password.tsx (replaced by mobile number + 4-digit PIN sign-in).
// Kept commented out for reference; see ./README.md to re-enable.
// ─────────────────────────────────────────────────────────────────────────
// import {
//   View, TouchableOpacity, StyleSheet, ScrollView,
//   KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
// } from 'react-native';
// import { router, useLocalSearchParams } from 'expo-router';
// import { useState } from 'react';
// import { Ionicons } from '@expo/vector-icons';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import Text from '../../components/Text';
// import TextInput from '../../components/TextInput';
// import { useForgotPassword } from '../../modules/auth/hooks/useAuth';
// import { isValidEmail } from '../../modules/auth/utils/validation';
// import { useKeyboardAwareScroll } from '../../core/keyboard/useKeyboardAwareScroll';
//
// const DS = {
//   bg:          '#F6F7FA',
//   surface:     '#FFFFFF',
//   border:      '#EAECEF',
//   primary:     '#CC2200',
//   success:     '#16A34A',
//   successSoft: '#F0FDF4',
//   text:        '#1A1A1A',
//   text2:       '#5A6272',
//   text3:       '#9BA3AF',
// };
//
// export default function ForgotPasswordScreen() {
//   const insets = useSafeAreaInsets();
//   const params = useLocalSearchParams<{ email?: string }>();
//   const { handleRequest, loading, error, sentMessage, reset } = useForgotPassword();
//   const [email, setEmail] = useState(params.email ?? '');
//   const [touched, setTouched] = useState(false);
//   const kb = useKeyboardAwareScroll();
//
//   const emailOk = isValidEmail(email);
//   const showEmailError = touched && email.trim().length > 0 && !emailOk;
//   const canSubmit = emailOk && !loading;
//
//   const backToSignIn = () => {
//     if (router.canGoBack()) router.back();
//     else router.replace('/(auth)/login');
//   };
//
//   return (
//     <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
//       <StatusBar barStyle="light-content" backgroundColor={DS.primary} />
//
//       <View style={[styles.brandZone, { paddingTop: insets.top + 12 }]}>
//         <TouchableOpacity style={styles.backBtn} onPress={backToSignIn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
//           <Ionicons name="arrow-back" size={22} color="#fff" />
//         </TouchableOpacity>
//         <View style={styles.brandContent}>
//           <View style={styles.iconMark}>
//             <Ionicons name="key-outline" size={26} color="#fff" />
//           </View>
//           <Text style={styles.title}>Forgot password?</Text>
//           <Text style={styles.tagline}>We'll email you a new one</Text>
//         </View>
//       </View>
//
//       <ScrollView
//         ref={kb.scrollRef}
//         onScroll={kb.onScroll}
//         scrollEventThrottle={kb.scrollEventThrottle}
//         style={styles.formZone}
//         contentContainerStyle={styles.formContent}
//         keyboardShouldPersistTaps="handled"
//       >
//         {sentMessage ? (
//           <>
//             <View style={styles.successCard}>
//               <Ionicons name="mail-open-outline" size={22} color={DS.success} />
//               <View style={{ flex: 1 }}>
//                 <Text style={styles.successTitle}>Check your email</Text>
//                 <Text style={styles.successText}>{sentMessage}</Text>
//               </View>
//             </View>
//             <Text style={styles.helpText}>
//               Sign in with the new password from the email — you'll then be asked to choose your own.
//               Your current password keeps working until you use the new one.
//             </Text>
//
//             <TouchableOpacity
//               style={styles.primaryBtn}
//               onPress={() => router.replace({ pathname: '/(auth)/login', params: { email: email.trim() } })}
//               activeOpacity={0.85}
//             >
//               <Ionicons name="log-in-outline" size={18} color="#fff" />
//               <Text style={styles.primaryBtnText}>Back to Sign In</Text>
//             </TouchableOpacity>
//
//             <TouchableOpacity style={styles.linkRow} onPress={reset}>
//               <Text style={styles.linkText}>Didn't get it? Try again</Text>
//             </TouchableOpacity>
//           </>
//         ) : (
//           <>
//             <Text style={styles.formTitle}>Reset your password</Text>
//             <Text style={styles.formSubtitle}>
//               Enter the email you registered with. If your store is approved, we'll send a new password to it.
//             </Text>
//
//             <Text style={styles.inputLabel}>Email</Text>
//             <TextInput
//               style={[styles.input, showEmailError && styles.inputInvalid]}
//               placeholder="store@example.com"
//               placeholderTextColor={DS.text3}
//               value={email}
//               onChangeText={setEmail}
//               onBlur={() => setTouched(true)}
//               // Keep the send button visible under the field.
//               onFocus={() => kb.ensureVisible(80)}
//               keyboardType="email-address"
//               autoCapitalize="none"
//               autoCorrect={false}
//               autoComplete="email"
//               maxLength={254}
//               returnKeyType="send"
//               onSubmitEditing={() => canSubmit && handleRequest(email)}
//             />
//             {showEmailError && (
//               <View style={styles.errorRow}>
//                 <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
//                 <Text style={styles.errorText}>Enter a valid email address.</Text>
//               </View>
//             )}
//
//             {!!error && (
//               <View style={styles.errorRow}>
//                 <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
//                 <Text style={styles.errorText}>{error}</Text>
//               </View>
//             )}
//
//             <TouchableOpacity
//               style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
//               onPress={() => handleRequest(email)}
//               disabled={!canSubmit}
//               activeOpacity={0.85}
//             >
//               {loading ? (
//                 <ActivityIndicator size="small" color="#fff" />
//               ) : (
//                 <>
//                   <Ionicons name="send-outline" size={18} color="#fff" />
//                   <Text style={styles.primaryBtnText}>Email me a new password</Text>
//                 </>
//               )}
//             </TouchableOpacity>
//
//             <TouchableOpacity style={styles.linkRow} onPress={backToSignIn}>
//               <Text style={styles.linkText}>Remembered it? Sign in</Text>
//             </TouchableOpacity>
//           </>
//         )}
//         <View style={{ height: kb.keyboardSpace }} />
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }
//
// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: DS.primary },
//
//   brandZone:    { backgroundColor: DS.primary, paddingBottom: 28, paddingHorizontal: 16 },
//   backBtn:      { width: 36, height: 36, justifyContent: 'center' },
//   brandContent: { alignItems: 'center' },
//   iconMark: {
//     width: 52, height: 52, borderRadius: 16,
//     backgroundColor: 'rgba(255,255,255,0.15)',
//     borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
//     alignItems: 'center', justifyContent: 'center', marginBottom: 12,
//   },
//   title:   { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
//   tagline: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
//
//   formZone:    { flex: 1, backgroundColor: DS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
//   formContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
//   formTitle:    { fontSize: 20, fontWeight: '800', color: DS.text, marginBottom: 6 },
//   formSubtitle: { fontSize: 14, color: DS.text2, marginBottom: 24, lineHeight: 20 },
//
//   inputLabel: { fontSize: 12, fontWeight: '600', color: DS.text2, marginBottom: 8 },
//   input: {
//     backgroundColor: DS.bg, borderWidth: 1.5, borderColor: DS.border,
//     borderRadius: 12, paddingHorizontal: 14, height: 52,
//     fontSize: 15, color: DS.text, marginBottom: 16,
//   },
//   inputInvalid: { borderColor: DS.primary },
//
//   errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: -6, marginBottom: 14 },
//   errorText: { fontSize: 13, color: DS.primary, flex: 1 },
//
//   successCard: {
//     flexDirection: 'row', gap: 12, alignItems: 'flex-start',
//     backgroundColor: DS.successSoft, borderRadius: 14, padding: 16, marginBottom: 16,
//   },
//   successTitle: { fontSize: 15, fontWeight: '700', color: DS.success, marginBottom: 4 },
//   successText:  { fontSize: 13, color: DS.text2, lineHeight: 19 },
//   helpText:     { fontSize: 13, color: DS.text2, lineHeight: 19, marginBottom: 24 },
//
//   primaryBtn: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
//     gap: 8, backgroundColor: DS.primary, borderRadius: 14, height: 52, marginBottom: 16,
//   },
//   primaryBtnDisabled: { opacity: 0.4 },
//   primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
//
//   linkRow:  { alignItems: 'center', paddingVertical: 6 },
//   linkText: { fontSize: 14, color: DS.primary, fontWeight: '600' },
// });
