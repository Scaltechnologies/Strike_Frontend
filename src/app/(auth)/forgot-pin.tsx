// Forgot PIN (also how vendors from the email/password era set their first PIN):
//   1. mobile number → 2. SMS OTP (Firebase) → 3. new PIN
// An approved vendor is signed straight in; one still awaiting approval gets
// the PIN saved and is sent back to Sign in.

import {
  View, TouchableOpacity, StyleSheet, ScrollView, Alert, BackHandler,
  KeyboardAvoidingView, Platform, StatusBar, Keyboard,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import PhoneOtpStep from '../../modules/auth/components/PhoneOtpStep';
import PinSetupStep from '../../modules/auth/components/PinSetupStep';
import { useResetPin, useSignIn } from '../../modules/auth/hooks/useAuth';
import StoreChooserModal from '../../modules/auth/components/StoreChooserModal';
import type { RoleOption, SessionActor } from '../../modules/auth/types/auth.types';
import { isValidMobile } from '../../modules/auth/utils/validation';
import { useKeyboardAwareScroll } from '../../core/keyboard/useKeyboardAwareScroll';

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  info:        '#2563EB',
  infoSoft:    '#EEF4FF',
  warning:     '#D97706',
  warningSoft: '#FFFBEB',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

type Step = 'phone' | 'otp' | 'pin';

export default function ForgotPinScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mobile?: string }>();
  const { handleReset, loading, error, clearError } = useResetPin();
  const kb = useKeyboardAwareScroll();

  const [step, setStep]     = useState<Step>('phone');
  const [mobile, setMobile] = useState(params.mobile ?? '');
  const [touched, setTouched] = useState(false);
  const [token, setToken]   = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  const mobileOk  = isValidMobile(mobile);
  const showError = touched && mobile.length > 0 && !mobileOk;

  const goToStep = useCallback((next: Step) => {
    Keyboard.dismiss();
    clearError();
    setStep(next);
  }, [clearError]);

  const back = useCallback(() => {
    if (loading) return;
    if (step === 'phone') router.back();
    else goToStep(step === 'pin' ? 'otp' : 'phone');
  }, [step, loading, goToStep]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step === 'phone') return false;
        back();
        return true;
      });
      return () => sub.remove();
    }, [step, back]),
  );

  // Number that owns a store AND manages another: PIN saved → pick which to open.
  const signIn = useSignIn();
  const [storeChoice, setStoreChoice] = useState<{ options: RoleOption[]; mobile: string; pin: string } | null>(null);
  const [choosing, setChoosing] = useState<SessionActor | null>(null);

  const chooseStore = async (role: SessionActor) => {
    if (!storeChoice) return;
    setChoosing(role);
    const outcome = await signIn.handleSignIn(storeChoice.mobile, storeChoice.pin, role);
    setChoosing(null);
    if (outcome === 'signed-in') setStoreChoice(null);
  };

  const onSavePin = async (pin: string) => {
    if (!token) { goToStep('otp'); return; }
    const res = await handleReset(token, pin);
    if (res.result === 'choose') {
      setStoreChoice({ options: res.options, mobile: res.mobileNumber, pin });
    } else if (res.result === 'pending') {
      Alert.alert('PIN saved', res.message, [
        { text: 'OK', onPress: () => router.replace({ pathname: '/(auth)/login', params: { mobile } }) },
      ]);
    } else if (res.result === 'failed' && res.otpProblem) {
      setToken(null);
      setOtpNotice('Please verify your mobile number again to finish.');
      goToStep('otp');
    }
    // 'signed-in' navigates Home by itself.
  };

  const title = step === 'phone' ? 'Forgot PIN' : step === 'otp' ? 'Verify mobile' : 'Set new PIN';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />

      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity style={styles.headerSide} onPress={back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={DS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        ref={kb.scrollRef}
        onScroll={kb.onScroll}
        scrollEventThrottle={kb.scrollEventThrottle}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {step === 'phone' && (
            <>
              <Text style={styles.title}>Reset your PIN</Text>
              <Text style={styles.subtitle}>
                Enter your registered mobile number. We'll send an OTP to confirm it's you, then you can set a new PIN.
              </Text>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={[styles.phoneRow, showError && styles.phoneRowError]}>
                <View style={styles.countryChip}>
                  <Text style={styles.countryText}>+91</Text>
                </View>
                <View style={styles.phoneDivider} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="98765 43210"
                  placeholderTextColor={DS.text3}
                  value={mobile}
                  onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))}
                  onBlur={() => setTouched(true)}
                  onFocus={() => kb.ensureVisible(90)}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus={!params.mobile}
                  returnKeyType="done"
                  onSubmitEditing={() => mobileOk && goToStep('otp')}
                />
              </View>
              {showError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
                  <Text style={styles.errorText}>Enter a valid 10-digit mobile number.</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.primaryBtn, !mobileOk && styles.primaryBtnDisabled]}
                onPress={() => { setOtpNotice(null); goToStep('otp'); }}
                disabled={!mobileOk}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Send OTP</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              {!!otpNotice && (
                <View style={styles.noticeRow}>
                  <Ionicons name="information-circle-outline" size={16} color={DS.warning} />
                  <Text style={styles.noticeText}>{otpNotice}</Text>
                </View>
              )}
              <PhoneOtpStep
                mobileNumber={mobile}
                onVerified={(t) => { setToken(t); goToStep('pin'); }}
                onChangeNumber={() => goToStep('phone')}
                onFocusCode={() => kb.ensureVisible(140)}
              />
            </>
          )}

          {step === 'pin' && (
            <PinSetupStep
              title="Create a new 4-digit PIN"
              subtitle="You'll use this new PIN with your mobile number to sign in."
              submitLabel="Save PIN"
              loading={loading}
              error={error}
              onSubmit={onSavePin}
              onFocusField={(extra) => kb.ensureVisible(extra)}
            />
          )}
        </View>
        <View style={{ height: kb.keyboardSpace }} />
      </ScrollView>

      <StoreChooserModal
        visible={!!storeChoice}
        options={storeChoice?.options ?? []}
        pending={choosing}
        error={signIn.error}
        onChoose={chooseStore}
        // PIN is already saved — cancelling just goes to Sign in with the number filled in.
        onCancel={() => {
          const m = storeChoice?.mobile ?? mobile;
          setStoreChoice(null);
          router.replace({ pathname: '/(auth)/login', params: { mobile: m } });
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: DS.surface, paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  headerSide:  { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: DS.text },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: DS.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: DS.border,
  },
  title:    { fontSize: 20, fontWeight: '800', color: DS.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: DS.text2, lineHeight: 20, marginBottom: 20 },
  label:    { fontSize: 13, fontWeight: '600', color: DS.text2, marginBottom: 8 },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DS.bg, borderWidth: 1.5, borderColor: DS.border,
    borderRadius: 12, marginBottom: 16, overflow: 'hidden', height: 56,
  },
  phoneRowError: { borderColor: DS.primary },
  countryChip:  { paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  countryText:  { fontSize: 17, fontWeight: '700', color: DS.text2 },
  phoneDivider: { width: 1, height: 28, backgroundColor: DS.border },
  phoneInput:   { flex: 1, paddingHorizontal: 14, fontSize: 18, fontWeight: '600', color: DS.text, height: '100%', letterSpacing: 1 },

  errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: -6, marginBottom: 12 },
  errorText: { fontSize: 13, color: DS.primary, flex: 1 },
  noticeRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: DS.warningSoft, borderRadius: 10, padding: 10, marginBottom: 16,
  },
  noticeText: { flex: 1, fontSize: 13, color: DS.text2, lineHeight: 18 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary, borderRadius: 14, height: 52,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
