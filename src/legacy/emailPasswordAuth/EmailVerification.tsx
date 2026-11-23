// ─────────────────────────────────────────────────────────────────────────
// LEGACY — email + password vendor sign-in. DISABLED.
// Original path: src/modules/auth/components/EmailVerification.tsx (replaced by mobile number + 4-digit PIN sign-in).
// Kept commented out for reference; see ./README.md to re-enable.
// ─────────────────────────────────────────────────────────────────────────
// // src/modules/auth/components/EmailVerification.tsx
// //
// // Inline "verify your email" block for the signup form:
// //   Send code → enter 6-digit code (auto-submits) → ✓ verified.
// // Reports the emailVerificationToken (needed by /register) via onVerified.
// // The parent resets it (verified=false) whenever the email text changes.
//
// import { useRef, useState } from 'react';
// import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import Text from '../../../components/Text';
// import { type TextInputRef } from '../../../components/TextInput';
// import OtpCodeInput, { OTP_LENGTH } from './OtpCodeInput';
// import { sendRegistrationEmailCode, verifyRegistrationEmailCode } from '../services/authService';
// import { cleanMessage } from '../hooks/useAuth';
// import { useCountdown, secondsFromCooldownMessage } from '../hooks/useCountdown';
// import { normalizeEmail } from '../utils/validation';
//
// const C = {
//   primary: '#CC2200', primarySoft: '#FFF0EE',
//   success: '#16A34A', successSoft: '#F0FDF4',
//   text: '#1A1A1A', text2: '#5A6272', text3: '#9BA3AF', border: '#EAECEF',
// };
//
// type Props = {
//   email: string;
//   emailValid: boolean;
//   verified: boolean;
//   onVerified: (token: string) => void;
// };
//
// export default function EmailVerification({ email, emailValid, verified, onVerified }: Props) {
//   const [sentTo, setSentTo]   = useState<string | null>(null);
//   const [code, setCode]       = useState('');
//   const [sending, setSending] = useState(false);
//   const [checking, setChecking] = useState(false);
//   const [error, setError]     = useState<string | null>(null);
//   const { seconds, start }    = useCountdown();
//   const codeRef = useRef<TextInputRef>(null);
//
//   const normalized = normalizeEmail(email);
//   // Code was sent to a different address than what's typed now → start over.
//   const codeStale = sentTo !== null && sentTo !== normalized;
//
//   if (verified) {
//     return (
//       <View style={styles.verifiedRow}>
//         <Ionicons name="checkmark-circle" size={16} color={C.success} />
//         <Text style={styles.verifiedText}>Email verified</Text>
//       </View>
//     );
//   }
//
//   const send = async () => {
//     if (!emailValid || sending || seconds > 0) return;
//     try {
//       setSending(true);
//       setError(null);
//       const res = await sendRegistrationEmailCode(normalized);
//       setSentTo(normalized);
//       setCode('');
//       start(res.resendAfterSeconds ?? 60);
//       setTimeout(() => codeRef.current?.focus(), 150);
//     } catch (err) {
//       const msg = cleanMessage(err, 'Could not send the code. Please try again.');
//       const wait = secondsFromCooldownMessage(msg);
//       if (wait) {
//         start(wait);
//         if (sentTo === normalized) { setError(null); return; } // code already on its way
//       }
//       setError(msg);
//     } finally {
//       setSending(false);
//     }
//   };
//
//   const verify = async (value = code) => {
//     if (value.length !== OTP_LENGTH || checking || !sentTo) return;
//     try {
//       setChecking(true);
//       setError(null);
//       const token = await verifyRegistrationEmailCode(sentTo, value);
//       onVerified(token);
//     } catch (err) {
//       setError(cleanMessage(err, 'Could not verify the code. Please try again.'));
//       setCode('');
//     } finally {
//       setChecking(false);
//     }
//   };
//
//   // Step 1 — not sent yet (or email edited since).
//   if (!sentTo || codeStale) {
//     return (
//       <View style={styles.wrap}>
//         <TouchableOpacity
//           style={[styles.sendBtn, (!emailValid || sending || seconds > 0) && styles.btnDisabled]}
//           onPress={send}
//           disabled={!emailValid || sending || seconds > 0}
//           activeOpacity={0.85}
//         >
//           {sending ? (
//             <ActivityIndicator size="small" color={C.primary} />
//           ) : (
//             <Ionicons name="mail-outline" size={17} color={C.primary} />
//           )}
//           <Text style={styles.sendBtnText}>
//             {seconds > 0 ? `Send code in ${seconds}s` : 'Send verification code'}
//           </Text>
//         </TouchableOpacity>
//         <Text style={styles.hint}>
//           {emailValid
//             ? "We'll email you a 6-digit code to confirm this address."
//             : 'Enter your email above, then verify it with a code.'}
//         </Text>
//         {!!error && <ErrorLine text={error} />}
//       </View>
//     );
//   }
//
//   // Step 2 — enter code.
//   return (
//     <View style={styles.wrap}>
//       <Text style={styles.sentText}>
//         Enter the 6-digit code sent to <Text style={styles.bold}>{sentTo}</Text>
//       </Text>
//       <OtpCodeInput
//         ref={codeRef}
//         value={code}
//         onChangeText={setCode}
//         onComplete={c => verify(c)}
//         invalid={!!error}
//         editable={!checking}
//       />
//       {!!error && <ErrorLine text={error} />}
//
//       <View style={styles.row}>
//         <TouchableOpacity onPress={send} disabled={seconds > 0 || sending} hitSlop={{ top: 8, bottom: 8 }}>
//           <Text style={[styles.link, (seconds > 0 || sending) && styles.linkDisabled]}>
//             {sending ? 'Sending…' : seconds > 0 ? `Resend code in ${seconds}s` : 'Resend code'}
//           </Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.verifyBtn, (code.length !== OTP_LENGTH || checking) && styles.btnDisabled]}
//           onPress={() => verify()}
//           disabled={code.length !== OTP_LENGTH || checking}
//         >
//           {checking ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.verifyBtnText}>Verify</Text>}
//         </TouchableOpacity>
//       </View>
//       <Text style={styles.hint}>Can't find it? Check your spam folder. The code expires in 10 minutes.</Text>
//     </View>
//   );
// }
//
// function ErrorLine({ text }: { text: string }) {
//   return (
//     <View style={styles.errorRow}>
//       <Ionicons name="alert-circle-outline" size={14} color={C.primary} />
//       <Text style={styles.errorText}>{text}</Text>
//     </View>
//   );
// }
//
// const styles = StyleSheet.create({
//   wrap: { marginTop: -6, marginBottom: 16 },
//
//   sendBtn: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
//     borderWidth: 1.5, borderColor: C.primary, borderRadius: 12, height: 46,
//     backgroundColor: C.primarySoft, marginBottom: 8,
//   },
//   sendBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },
//   btnDisabled: { opacity: 0.45 },
//
//   sentText: { fontSize: 13, color: C.text2, marginBottom: 10, lineHeight: 19 },
//   bold: { fontWeight: '700', color: C.text },
//
//   row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
//   link: { fontSize: 13, color: C.primary, fontWeight: '600' },
//   linkDisabled: { color: C.text3 },
//   verifyBtn: {
//     backgroundColor: C.primary, borderRadius: 10, height: 38, minWidth: 92,
//     paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
//   },
//   verifyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
//
//   hint: { fontSize: 12, color: C.text3, lineHeight: 17 },
//
//   errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 8 },
//   errorText: { fontSize: 13, color: C.primary, flex: 1 },
//
//   verifiedRow: {
//     flexDirection: 'row', alignItems: 'center', gap: 6,
//     backgroundColor: C.successSoft, borderRadius: 10,
//     paddingHorizontal: 12, paddingVertical: 8, marginTop: -6, marginBottom: 16, alignSelf: 'flex-start',
//   },
//   verifiedText: { fontSize: 13, fontWeight: '700', color: C.success },
// });
