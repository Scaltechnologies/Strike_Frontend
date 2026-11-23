// ─────────────────────────────────────────────────────────────────────────
// LEGACY — email + password vendor sign-in. DISABLED.
// Original path: src/app/change-email.tsx (replaced by mobile number + 4-digit PIN sign-in).
// Kept commented out for reference; see ./README.md to re-enable.
// ─────────────────────────────────────────────────────────────────────────
// // Change sign-in email (Profile → Change Sign-in Email):
// //   1. new email + current password → a 6-digit code is emailed to the NEW address
// //   2. enter the code → email changes, old address gets an alert, other devices signed out
//
// import {
//   View, TouchableOpacity, StyleSheet, ScrollView, Alert,
//   KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
// } from 'react-native';
// import { router } from 'expo-router';
// import { useEffect, useRef, useState } from 'react';
// import { Ionicons } from '@expo/vector-icons';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import Text from '../components/Text';
// import TextInput, { type TextInputRef } from '../components/TextInput';
// import PasswordField from '../modules/auth/components/PasswordField';
// import OtpCodeInput, { OTP_LENGTH } from '../modules/auth/components/OtpCodeInput';
// import { requestEmailChange, confirmEmailChange } from '../modules/auth/services/authService';
// import { cleanMessage } from '../modules/auth/hooks/useAuth';
// import { useCountdown, secondsFromCooldownMessage } from '../modules/auth/hooks/useCountdown';
// import { isValidEmail, normalizeEmail } from '../modules/auth/utils/validation';
// import { getSignInEmail, saveSignInEmail, saveTokens } from '../core/storage/secureStorage';
// import { useKeyboardAwareScroll } from '../core/keyboard/useKeyboardAwareScroll';
//
// const DS = {
//   bg:          '#F6F7FA',
//   surface:     '#FFFFFF',
//   border:      '#EAECEF',
//   primary:     '#CC2200',
//   infoSoft:    '#EEF4FF',
//   info:        '#2563EB',
//   text:        '#1A1A1A',
//   text2:       '#5A6272',
//   text3:       '#9BA3AF',
// };
//
// export default function ChangeEmailScreen() {
//   const insets = useSafeAreaInsets();
//   const [currentEmail, setCurrentEmail] = useState<string | null>(null);
//   const [step, setStep]         = useState<'details' | 'code'>('details');
//   const [newEmail, setNewEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [code, setCode]         = useState('');
//   const [loading, setLoading]   = useState(false);
//   const [error, setError]       = useState<string | null>(null);
//   const [emailTouched, setEmailTouched] = useState(false);
//   const { seconds, start }      = useCountdown();
//   const passwordRef = useRef<TextInputRef>(null);
//   const codeRef     = useRef<TextInputRef>(null);
//   const kb = useKeyboardAwareScroll();
//
//   useEffect(() => { getSignInEmail().then(setCurrentEmail).catch(() => {}); }, []);
//
//   const target     = normalizeEmail(newEmail);
//   const emailOk    = isValidEmail(newEmail);
//   const sameAsNow  = !!currentEmail && target === currentEmail.toLowerCase();
//   const showEmailError = emailTouched && newEmail.trim().length > 0 && (!emailOk || sameAsNow);
//   const canSend    = emailOk && !sameAsNow && password.length > 0 && !loading && seconds === 0;
//
//   const sendCode = async () => {
//     if (!canSend && step === 'details') return;
//     try {
//       setLoading(true);
//       setError(null);
//       const res = await requestEmailChange(target, password);
//       start(res.resendAfterSeconds ?? 60);
//       setCode('');
//       setStep('code');
//       setTimeout(() => codeRef.current?.focus(), 150);
//     } catch (err) {
//       const msg = cleanMessage(err, 'Could not send the code. Please try again.');
//       const wait = secondsFromCooldownMessage(msg);
//       if (wait) start(wait);
//       setError(msg);
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const confirm = async (value = code) => {
//     if (value.length !== OTP_LENGTH || loading) return;
//     try {
//       setLoading(true);
//       setError(null);
//       const res = await confirmEmailChange(target, value);
//       if (res?.token && res?.refreshToken) {
//         await saveTokens({ accessToken: res.token, refreshToken: res.refreshToken });
//       }
//       await saveSignInEmail(res?.email ?? target);
//       Alert.alert(
//         'Sign-in email updated',
//         `From now on, sign in with ${res?.email ?? target}. We've let your previous address know about this change.`,
//         [{ text: 'OK', onPress: () => router.back() }],
//       );
//     } catch (err) {
//       setError(cleanMessage(err, 'Could not verify the code. Please try again.'));
//       setCode('');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   return (
//     <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
//       <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />
//
//       <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
//         <TouchableOpacity
//           style={styles.headerSide}
//           onPress={() => (step === 'code' ? (setStep('details'), setError(null)) : router.back())}
//           hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//         >
//           <Ionicons name="arrow-back" size={22} color={DS.text} />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Change Sign-in Email</Text>
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
//         {!!currentEmail && (
//           <View style={styles.currentCard}>
//             <Text style={styles.currentLabel}>Current sign-in email</Text>
//             <Text style={styles.currentValue}>{currentEmail}</Text>
//           </View>
//         )}
//
//         {step === 'details' ? (
//           <View style={styles.card}>
//             <Text style={styles.label}>New email</Text>
//             <TextInput
//               style={[styles.input, showEmailError && styles.inputInvalid]}
//               placeholder="new@example.com"
//               placeholderTextColor={DS.text3}
//               value={newEmail}
//               onChangeText={setNewEmail}
//               onBlur={() => setEmailTouched(true)}
//               onFocus={() => kb.ensureVisible()}
//               keyboardType="email-address"
//               autoCapitalize="none"
//               autoCorrect={false}
//               autoComplete="email"
//               maxLength={254}
//               returnKeyType="next"
//               submitBehavior="submit"
//               onSubmitEditing={() => passwordRef.current?.focus()}
//             />
//             {showEmailError && (
//               <View style={styles.errorRow}>
//                 <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
//                 <Text style={styles.errorText}>
//                   {sameAsNow ? 'This is already your sign-in email.' : 'Enter a valid email address.'}
//                 </Text>
//               </View>
//             )}
//
//             <Text style={styles.label}>Current password</Text>
//             <PasswordField
//               ref={passwordRef}
//               placeholder="Confirm it's you"
//               value={password}
//               onChangeText={setPassword}
//               onFocus={() => kb.ensureVisible(80)}
//               autoComplete="current-password"
//               textContentType="password"
//               returnKeyType="send"
//               onSubmitEditing={sendCode}
//             />
//
//             <View style={styles.infoRow}>
//               <Ionicons name="information-circle-outline" size={16} color={DS.info} />
//               <Text style={styles.infoText}>
//                 We'll email a 6-digit code to the new address. Your email only changes after you enter it.
//               </Text>
//             </View>
//           </View>
//         ) : (
//           <View style={styles.card}>
//             <Text style={styles.sentText}>
//               Enter the 6-digit code we sent to <Text style={styles.bold}>{target}</Text>
//             </Text>
//             <OtpCodeInput
//               ref={codeRef}
//               value={code}
//               onChangeText={setCode}
//               onComplete={c => confirm(c)}
//               invalid={!!error}
//               editable={!loading}
//             />
//             <TouchableOpacity onPress={sendCode} disabled={seconds > 0 || loading} hitSlop={{ top: 8, bottom: 8 }}>
//               <Text style={[styles.link, (seconds > 0 || loading) && styles.linkDisabled]}>
//                 {seconds > 0 ? `Resend code in ${seconds}s` : 'Resend code'}
//               </Text>
//             </TouchableOpacity>
//             <Text style={styles.hint}>Can't find it? Check your spam folder. The code expires in 10 minutes.</Text>
//           </View>
//         )}
//
//         {!!error && (
//           <View style={styles.errorRow}>
//             <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
//             <Text style={styles.errorText}>{error}</Text>
//           </View>
//         )}
//
//         {step === 'details' ? (
//           <TouchableOpacity
//             style={[styles.primaryBtn, !canSend && styles.primaryBtnDisabled]}
//             onPress={sendCode}
//             disabled={!canSend}
//             activeOpacity={0.85}
//           >
//             {loading ? <ActivityIndicator size="small" color="#fff" /> : (
//               <>
//                 <Ionicons name="mail-outline" size={18} color="#fff" />
//                 <Text style={styles.primaryBtnText}>
//                   {seconds > 0 ? `Send code in ${seconds}s` : 'Send verification code'}
//                 </Text>
//               </>
//             )}
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity
//             style={[styles.primaryBtn, (code.length !== OTP_LENGTH || loading) && styles.primaryBtnDisabled]}
//             onPress={() => confirm()}
//             disabled={code.length !== OTP_LENGTH || loading}
//             activeOpacity={0.85}
//           >
//             {loading ? <ActivityIndicator size="small" color="#fff" /> : (
//               <>
//                 <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
//                 <Text style={styles.primaryBtnText}>Verify and update email</Text>
//               </>
//             )}
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
//   currentCard: {
//     backgroundColor: DS.surface, borderRadius: 14, padding: 14, marginBottom: 12,
//     borderWidth: 1, borderColor: DS.border,
//   },
//   currentLabel: { fontSize: 11, color: DS.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
//   currentValue: { fontSize: 15, fontWeight: '700', color: DS.text },
//
//   card: {
//     backgroundColor: DS.surface, borderRadius: 16, padding: 16,
//     borderWidth: 1, borderColor: DS.border, marginBottom: 16,
//   },
//   label: { fontSize: 12, fontWeight: '600', color: DS.text2, marginBottom: 8 },
//   input: {
//     backgroundColor: DS.bg, borderWidth: 1.5, borderColor: DS.border,
//     borderRadius: 12, paddingHorizontal: 14, height: 52,
//     fontSize: 15, color: DS.text, marginBottom: 16,
//   },
//   inputInvalid: { borderColor: DS.primary },
//
//   infoRow: {
//     flexDirection: 'row', gap: 8, alignItems: 'flex-start',
//     backgroundColor: DS.infoSoft, borderRadius: 10, padding: 10,
//   },
//   infoText: { flex: 1, fontSize: 12, color: DS.text2, lineHeight: 17 },
//
//   sentText: { fontSize: 14, color: DS.text2, marginBottom: 12, lineHeight: 20 },
//   bold: { fontWeight: '700', color: DS.text },
//   link: { fontSize: 14, color: DS.primary, fontWeight: '600', marginBottom: 8 },
//   linkDisabled: { color: DS.text3 },
//   hint: { fontSize: 12, color: DS.text3, lineHeight: 17 },
//
//   errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: -6, marginBottom: 12 },
//   errorText: { fontSize: 13, color: DS.primary, flex: 1 },
//
//   primaryBtn: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
//     gap: 8, backgroundColor: DS.primary, borderRadius: 14, height: 52,
//   },
//   primaryBtnDisabled: { opacity: 0.4 },
//   primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
// });
