// ─────────────────────────────────────────────────────────────────────────
// LEGACY — email + password vendor sign-in. DISABLED.
// Original path: src/app/(auth)/login.tsx (replaced by mobile number + 4-digit PIN sign-in).
// Kept commented out for reference; see ./README.md to re-enable.
// ─────────────────────────────────────────────────────────────────────────
// import {
//   View, TouchableOpacity, StyleSheet, ScrollView,
//   KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
// } from 'react-native';
// import { router, useLocalSearchParams } from 'expo-router';
// import Text from '../../components/Text';
// import TextInput, { type TextInputRef } from '../../components/TextInput';
// import { useEffect, useRef, useState } from 'react';
// import { Ionicons } from '@expo/vector-icons';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useSignIn } from '../../modules/auth/hooks/useAuth';
// import PasswordField from '../../modules/auth/components/PasswordField';
// import { isValidEmail } from '../../modules/auth/utils/validation';
// import { getAccessToken, getMustChangePassword } from '../../core/storage/secureStorage';
// import { useKeyboardAwareScroll } from '../../core/keyboard/useKeyboardAwareScroll';
//
// const DS = {
//   bg:          '#F6F7FA',
//   surface:     '#FFFFFF',
//   border:      '#EAECEF',
//   primary:     '#CC2200',
//   primaryDark: '#991A00',
//   primarySoft: '#FFF0EE',
//   success:     '#16A34A',
//   successSoft: '#F0FDF4',
//   text:        '#1A1A1A',
//   text2:       '#5A6272',
//   text3:       '#9BA3AF',
// };
//
// export default function LoginScreen() {
//   const insets = useSafeAreaInsets();
//   // registered=1 & email=… after a successful registration (useRegister);
//   // the email link (strike-frontend://login) arrives with no params.
//   const params = useLocalSearchParams<{ registered?: string; email?: string }>();
//   const { handleSignIn, loading, error, errorCode } = useSignIn();
//
//   const [email, setEmail]       = useState(params.email ?? '');
//   const [password, setPassword] = useState('');
//   const [emailTouched, setEmailTouched] = useState(false);
//   const passwordRef = useRef<TextInputRef>(null);
//   const kb = useKeyboardAwareScroll();
//   const keyboardOpen = kb.keyboardSpace > 0;
//
//   // Opened from the email link while already signed in — don't make the
//   // vendor sign in again.
//   useEffect(() => {
//     (async () => {
//       try {
//         if (!(await getAccessToken())) return;
//         if (await getMustChangePassword()) {
//           router.replace({ pathname: '/change-password', params: { forced: '1' } });
//         } else {
//           router.replace('/(main)/home');
//         }
//       } catch { /* stay on sign-in */ }
//     })();
//   }, []);
//
//   const emailOk   = isValidEmail(email);
//   const showEmailError = emailTouched && email.trim().length > 0 && !emailOk;
//   const canSubmit = emailOk && password.length > 0 && !loading;
//   const suggestForgot = errorCode === 'PASSWORD_NOT_SET' || errorCode === 'ACCOUNT_LOCKED';
//
//   const onSubmit = () => {
//     if (!canSubmit) return;
//     handleSignIn(email, password);
//   };
//
//   const goForgot = () =>
//     router.push({ pathname: '/(auth)/forgot-password', params: emailOk ? { email: email.trim() } : {} });
//
//   return (
//     <KeyboardAvoidingView
//       style={styles.root}
//       behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//     >
//       <StatusBar barStyle="light-content" backgroundColor={DS.primary} />
//
//       {/* Brand Zone */}
//       {/* Collapses to just the wordmark while typing, to leave room for the form. */}
//       <View style={[styles.brandZone, keyboardOpen && styles.brandZoneCompact]}>
//         <View style={[styles.brandContent, { paddingTop: insets.top + (keyboardOpen ? 10 : 36) }]}>
//           {!keyboardOpen && (
//             <View style={styles.logoMark}>
//               <Text style={styles.logoMarkText}>S</Text>
//             </View>
//           )}
//           <Text style={[styles.wordmark, keyboardOpen && styles.wordmarkCompact]}>STRIKE</Text>
//           {!keyboardOpen && <Text style={styles.tagline}>Your business, powered by loyalty.</Text>}
//         </View>
//       </View>
//
//       {/* Form Zone */}
//       <ScrollView
//         ref={kb.scrollRef}
//         onScroll={kb.onScroll}
//         scrollEventThrottle={kb.scrollEventThrottle}
//         style={styles.formZone}
//         contentContainerStyle={styles.formContent}
//         keyboardShouldPersistTaps="handled"
//         showsVerticalScrollIndicator={false}
//       >
//         {params.registered === '1' && (
//           <View style={styles.noticeCard}>
//             <Ionicons name="checkmark-circle" size={20} color={DS.success} />
//             <View style={{ flex: 1 }}>
//               <Text style={styles.noticeTitle}>Registration submitted</Text>
//               <Text style={styles.noticeText}>
//                 Once our team approves your store, we'll email your login details
//                 {params.email ? ` to ${params.email}` : ''}. Use them to sign in here.
//               </Text>
//             </View>
//           </View>
//         )}
//
//         <Text style={styles.formTitle}>Welcome back</Text>
//         <Text style={styles.formSubtitle}>Sign in to your vendor account</Text>
//
//         <Text style={styles.inputLabel}>Email</Text>
//         <TextInput
//           style={[styles.input, showEmailError && styles.inputInvalid]}
//           placeholder="store@example.com"
//           placeholderTextColor={DS.text3}
//           value={email}
//           onChangeText={setEmail}
//           onBlur={() => setEmailTouched(true)}
//           onFocus={() => kb.ensureVisible()}
//           keyboardType="email-address"
//           autoCapitalize="none"
//           autoCorrect={false}
//           autoComplete="email"
//           textContentType="username"
//           maxLength={254}
//           returnKeyType="next"
//           submitBehavior="submit"
//           onSubmitEditing={() => passwordRef.current?.focus()}
//         />
//         {showEmailError && (
//           <View style={styles.fieldError}>
//             <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
//             <Text style={styles.errorText}>Enter a valid email address.</Text>
//           </View>
//         )}
//
//         <Text style={styles.inputLabel}>Password</Text>
//         <PasswordField
//           ref={passwordRef}
//           placeholder="Your password"
//           value={password}
//           onChangeText={setPassword}
//           // Keep the Sign In button visible under the field too.
//           onFocus={() => kb.ensureVisible(90)}
//           autoComplete="current-password"
//           textContentType="password"
//           returnKeyType="go"
//           onSubmitEditing={onSubmit}
//         />
//
//         <TouchableOpacity style={styles.forgotRow} onPress={goForgot} hitSlop={{ top: 8, bottom: 8 }}>
//           <Text style={[styles.forgotText, suggestForgot && styles.forgotTextStrong]}>Forgot password?</Text>
//         </TouchableOpacity>
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
//               <Ionicons name="log-in-outline" size={18} color="#fff" />
//               <Text style={styles.primaryBtnText}>Sign In</Text>
//             </>
//           )}
//         </TouchableOpacity>
//
//         <View style={styles.dividerRow}>
//           <View style={styles.dividerLine} />
//           <Text style={styles.dividerText}>New to Strike?</Text>
//           <View style={styles.dividerLine} />
//         </View>
//
//         <TouchableOpacity
//           style={styles.secondaryBtn}
//           onPress={() => router.push('/(auth)/signup')}
//           activeOpacity={0.85}
//         >
//           <Text style={styles.secondaryBtnText}>Create an account</Text>
//         </TouchableOpacity>
//
//         <Text style={styles.termsText}>
//           By continuing you agree to our{' '}
//           <Text style={styles.termsLink} onPress={() => router.push('/terms')}>Terms</Text>
//           {' & '}
//           <Text style={styles.termsLink} onPress={() => router.push('/privacy-policy')}>Privacy Policy</Text>
//         </Text>
//         <View style={{ height: kb.keyboardSpace }} />
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }
//
// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: DS.primary },
//
//   // Brand Zone
//   brandZone:    { backgroundColor: DS.primary, paddingBottom: 32 },
//   brandZoneCompact: { paddingBottom: 14 },
//   wordmarkCompact:  { fontSize: 18, letterSpacing: 5, marginBottom: 0 },
//   brandContent: { alignItems: 'center', paddingBottom: 8 },
//   logoMark: {
//     width: 56, height: 56, borderRadius: 16,
//     backgroundColor: 'rgba(255,255,255,0.15)',
//     borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
//     alignItems: 'center', justifyContent: 'center', marginBottom: 14,
//   },
//   logoMarkText: { fontSize: 28, fontWeight: '900', color: '#fff' },
//   wordmark:     { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 6, marginBottom: 10 },
//   tagline:      { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
//
//   // Form Zone
//   formZone: {
//     flex: 1,
//     backgroundColor: DS.surface,
//     borderTopLeftRadius: 28,
//     borderTopRightRadius: 28,
//   },
//   formContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
//   formTitle:    { fontSize: 22, fontWeight: '800', color: DS.text, marginBottom: 4 },
//   formSubtitle: { fontSize: 14, color: DS.text2, marginBottom: 28 },
//
//   // Registered notice
//   noticeCard: {
//     flexDirection: 'row', gap: 10, alignItems: 'flex-start',
//     backgroundColor: DS.successSoft, borderRadius: 14, padding: 14, marginBottom: 24,
//   },
//   noticeTitle: { fontSize: 14, fontWeight: '700', color: DS.success, marginBottom: 2 },
//   noticeText:  { fontSize: 13, color: DS.text2, lineHeight: 19 },
//
//   // Inputs
//   inputLabel: { fontSize: 12, fontWeight: '600', color: DS.text2, marginBottom: 8 },
//   input: {
//     backgroundColor: DS.bg, borderWidth: 1.5, borderColor: DS.border,
//     borderRadius: 12, paddingHorizontal: 14, height: 52,
//     fontSize: 15, color: DS.text, marginBottom: 16,
//   },
//   inputInvalid: { borderColor: DS.primary },
//   fieldError: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 14 },
//
//   forgotRow: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 18 },
//   forgotText: { fontSize: 13, color: DS.primary, fontWeight: '600' },
//   forgotTextStrong: { textDecorationLine: 'underline' },
//
//   // Error
//   errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 14 },
//   errorText: { fontSize: 13, color: DS.primary, flex: 1 },
//
//   // Buttons
//   primaryBtn: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
//     gap: 8, backgroundColor: DS.primary, borderRadius: 14, height: 52, marginBottom: 24,
//   },
//   primaryBtnDisabled: { opacity: 0.4 },
//   primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
//
//   dividerRow: {
//     flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
//   },
//   dividerLine: { flex: 1, height: 1, backgroundColor: DS.border },
//   dividerText: { fontSize: 12, color: DS.text3, fontWeight: '500' },
//
//   secondaryBtn: {
//     alignItems: 'center', justifyContent: 'center',
//     borderWidth: 1.5, borderColor: DS.primary,
//     borderRadius: 14, height: 52, marginBottom: 20,
//   },
//   secondaryBtnText: { fontSize: 16, fontWeight: '700', color: DS.primary },
//
//   termsText: { fontSize: 12, color: DS.text3, textAlign: 'center', lineHeight: 18 },
//   termsLink:  { color: DS.primary, fontWeight: '600' },
// });
