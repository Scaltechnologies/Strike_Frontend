import {
  View, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Text from '../../components/Text';
import TextInput, { type TextInputRef } from '../../components/TextInput';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSignIn } from '../../modules/auth/hooks/useAuth';
import PinInput from '../../modules/auth/components/PinInput';
import { isValidMobile, PIN_LENGTH } from '../../modules/auth/utils/validation';
import { getAccessToken, getLastMobile } from '../../core/storage/secureStorage';
import { useKeyboardAwareScroll } from '../../core/keyboard/useKeyboardAwareScroll';

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  primaryDark: '#991A00',
  primarySoft: '#FFF0EE',
  success:     '#16A34A',
  successSoft: '#F0FDF4',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

// Errors where "Forgot PIN?" is the way forward.
const FORGOT_CODES = new Set(['PIN_NOT_SET', 'ACCOUNT_LOCKED', 'PIN_RESET_REQUIRED']);

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  // registered=1 & mobile=… after a successful registration (useRegister).
  const params = useLocalSearchParams<{ registered?: string; mobile?: string }>();
  const { handleSignIn, loading, error, errorCode, clearError } = useSignIn();

  const [mobile, setMobile] = useState(params.mobile ?? '');
  const [pin, setPin]       = useState('');
  const [reveal, setReveal] = useState(false);
  const [mobileTouched, setMobileTouched] = useState(false);
  const mobileRef = useRef<TextInputRef>(null);
  const pinRef    = useRef<TextInputRef>(null);
  const kb = useKeyboardAwareScroll();
  const keyboardOpen = kb.keyboardSpace > 0;

  // Coming back from registration to this (already mounted) screen: use the new number.
  useEffect(() => {
    if (params.mobile) { setMobile(params.mobile); setPin(''); }
  }, [params.mobile]);

  // Already signed in (e.g. opened from a link) — go straight in.
  // Otherwise pre-fill the number used last time, so only the PIN is needed.
  useEffect(() => {
    (async () => {
      try {
        if (await getAccessToken()) {
          router.replace('/(main)/home');
          return;
        }
        if (!params.mobile) {
          const last = await getLastMobile();
          if (last) setMobile(m => m || last);
        }
      } catch { /* stay on sign-in */ }
    })();
  }, [params.mobile]);

  const mobileOk = isValidMobile(mobile);
  const showMobileError = mobileTouched && mobile.length > 0 && !mobileOk;
  const canSubmit = mobileOk && pin.length === PIN_LENGTH && !loading;
  const suggestForgot = FORGOT_CODES.has(errorCode ?? '');
  const notRegistered = errorCode === 'NOT_REGISTERED';

  const submit = async (p = pin) => {
    if (!mobileOk || p.length !== PIN_LENGTH || loading) return;
    const ok = await handleSignIn(mobile, p);
    if (!ok) {
      setPin('');
    }
  };

  const goForgot = () =>
    router.push({ pathname: '/(auth)/forgot-pin', params: mobileOk ? { mobile } : {} });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={DS.primary} />

      {/* Brand Zone — collapses to just the wordmark while typing. */}
      <View style={[styles.brandZone, keyboardOpen && styles.brandZoneCompact]}>
        <View style={[styles.brandContent, { paddingTop: insets.top + (keyboardOpen ? 10 : 36) }]}>
          {!keyboardOpen && (
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>S</Text>
            </View>
          )}
          <Text style={[styles.wordmark, keyboardOpen && styles.wordmarkCompact]}>STRIKE</Text>
          {!keyboardOpen && <Text style={styles.tagline}>Your business, powered by loyalty.</Text>}
        </View>
      </View>

      {/* Form Zone */}
      <ScrollView
        ref={kb.scrollRef}
        onScroll={kb.onScroll}
        scrollEventThrottle={kb.scrollEventThrottle}
        style={styles.formZone}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {params.registered === '1' && (
          <View style={styles.noticeCard}>
            <Ionicons name="checkmark-circle" size={20} color={DS.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Registration submitted</Text>
              <Text style={styles.noticeText}>
                Once our team approves your store, sign in here with your mobile number and the PIN you just created.
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.formTitle}>Welcome back</Text>
        <Text style={styles.formSubtitle}>Sign in with your mobile number and PIN</Text>

        <Text style={styles.inputLabel}>Mobile Number</Text>
        <View style={[styles.phoneRow, showMobileError && styles.phoneRowError]}>
          <View style={styles.countryChip}>
            <Text style={styles.countryText}>+91</Text>
          </View>
          <View style={styles.phoneDivider} />
          <TextInput
            ref={mobileRef}
            style={styles.phoneInput}
            placeholder="98765 43210"
            placeholderTextColor={DS.text3}
            value={mobile}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '').slice(0, 10);
              setMobile(digits);
              if (error) clearError();
              if (isValidMobile(digits) && pin.length < PIN_LENGTH) {
                setTimeout(() => pinRef.current?.focus(), 50);
              }
            }}
            onBlur={() => setMobileTouched(true)}
            onFocus={() => kb.ensureVisible(140)}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={10}
            returnKeyType="next"
            onSubmitEditing={() => pinRef.current?.focus()}
          />
        </View>
        {showMobileError && (
          <View style={styles.fieldError}>
            <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
            <Text style={styles.errorText}>Enter a valid 10-digit mobile number.</Text>
          </View>
        )}

        <View style={styles.labelRow}>
          <Text style={styles.inputLabel}>4-digit PIN</Text>
          <TouchableOpacity onPress={() => setReveal(r => !r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={styles.revealRow}>
              <Ionicons name={reveal ? 'eye-off-outline' : 'eye-outline'} size={16} color={DS.text2} />
              <Text style={styles.revealText}>{reveal ? 'Hide' : 'Show'}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <PinInput
          ref={pinRef}
          value={pin}
          onChangeText={(v) => { setPin(v); if (error) clearError(); }}
          onComplete={(p) => submit(p)}
          // Keep the Sign In button visible under the boxes.
          onFocus={() => kb.ensureVisible(90)}
          reveal={reveal}
          invalid={!!error && !notRegistered}
          editable={!loading}
        />

        <TouchableOpacity style={styles.forgotRow} onPress={goForgot} hitSlop={{ top: 8, bottom: 8 }}>
          <Text style={[styles.forgotText, suggestForgot && styles.forgotTextStrong]}>Forgot PIN?</Text>
        </TouchableOpacity>

        {!!error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
          onPress={() => submit()}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Sign In</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>New to Strike?</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.secondaryBtn, notRegistered && styles.secondaryBtnStrong]}
          onPress={() => router.push({ pathname: '/(auth)/signup', params: mobileOk ? { phoneNumber: mobile } : {} })}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Create an account</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing you agree to our{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/terms')}>Terms</Text>
          {' & '}
          <Text style={styles.termsLink} onPress={() => router.push('/privacy-policy')}>Privacy Policy</Text>
        </Text>
        <View style={{ height: kb.keyboardSpace }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.primary },

  // Brand Zone
  brandZone:    { backgroundColor: DS.primary, paddingBottom: 32 },
  brandZoneCompact: { paddingBottom: 14 },
  wordmarkCompact:  { fontSize: 18, letterSpacing: 5, marginBottom: 0 },
  brandContent: { alignItems: 'center', paddingBottom: 8 },
  logoMark: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoMarkText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  wordmark:     { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 6, marginBottom: 10 },
  tagline:      { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  // Form Zone
  formZone: {
    flex: 1,
    backgroundColor: DS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  formContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  formTitle:    { fontSize: 22, fontWeight: '800', color: DS.text, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: DS.text2, marginBottom: 28 },

  // Registered notice
  noticeCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: DS.successSoft, borderRadius: 14, padding: 14, marginBottom: 24,
  },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: DS.success, marginBottom: 2 },
  noticeText:  { fontSize: 13, color: DS.text2, lineHeight: 19 },

  // Inputs
  inputLabel: { fontSize: 13, fontWeight: '600', color: DS.text2, marginBottom: 8 },
  labelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revealRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  revealText: { fontSize: 13, color: DS.text2, fontWeight: '600' },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DS.bg, borderWidth: 1.5, borderColor: DS.border,
    borderRadius: 12, marginBottom: 18, overflow: 'hidden', height: 56,
  },
  phoneRowError: { borderColor: DS.primary },
  countryChip:  { paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  countryText:  { fontSize: 17, fontWeight: '700', color: DS.text2 },
  phoneDivider: { width: 1, height: 28, backgroundColor: DS.border },
  phoneInput:   { flex: 1, paddingHorizontal: 14, fontSize: 18, fontWeight: '600', color: DS.text, height: '100%', letterSpacing: 1 },
  fieldError: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -10, marginBottom: 14 },

  forgotRow: { alignSelf: 'flex-end', marginTop: 2, marginBottom: 18, paddingVertical: 4 },
  forgotText: { fontSize: 14, color: DS.primary, fontWeight: '700' },
  forgotTextStrong: { textDecorationLine: 'underline' },

  // Error
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 14 },
  errorText: { fontSize: 13, color: DS.primary, flex: 1 },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary, borderRadius: 14, height: 52, marginBottom: 24,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: DS.border },
  dividerText: { fontSize: 12, color: DS.text3, fontWeight: '500' },

  secondaryBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: DS.primary,
    borderRadius: 14, height: 52, marginBottom: 20,
  },
  secondaryBtnStrong: { backgroundColor: DS.primarySoft, borderWidth: 2 },
  secondaryBtnText: { fontSize: 16, fontWeight: '700', color: DS.primary },

  termsText: { fontSize: 12, color: DS.text3, textAlign: 'center', lineHeight: 18 },
  termsLink:  { color: DS.primary, fontWeight: '600' },
});
