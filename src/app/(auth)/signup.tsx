// Vendor registration — three steps:
//   1. details  store info, mobile number, location (email optional)
//   2. otp      Firebase SMS OTP to that mobile number
//   3. pin      choose a 4-digit PIN → submitted for admin review
// After approval the vendor signs in with mobile number + PIN.

import {
  View, TouchableOpacity, StyleSheet, BackHandler,
  KeyboardAvoidingView, Platform, StatusBar,
  ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Text from '../../components/Text';
import TextInput, { type TextInputRef } from '../../components/TextInput';
import { useState, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRegister } from '../../modules/auth/hooks/useAuth';
import BannerPicker from '../../modules/store/components/BannerPicker';
import PhoneOtpStep from '../../modules/auth/components/PhoneOtpStep';
import PinSetupStep from '../../modules/auth/components/PinSetupStep';
import { useKeyboardAwareScroll } from '../../core/keyboard/useKeyboardAwareScroll';
import { isValidMobile, isValidEmail } from '../../modules/auth/utils/validation';

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  primaryDark: '#991A00',
  primarySoft: '#FFF0EE',
  accent:      '#C17B2F',
  accentSoft:  '#FEF6EC',
  success:     '#16A34A',
  successSoft: '#F0FDF4',
  warning:     '#D97706',
  warningSoft: '#FFFBEB',
  error:       '#DC2626',
  errorSoft:   '#FFF1F1',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

type Step = 'details' | 'otp' | 'pin' | 'done';
const STEP_LABEL: Record<Step, string> = {
  details: 'Step 1 of 3 · Store details',
  otp:     'Step 2 of 3 · Verify mobile',
  pin:     'Step 3 of 3 · Create PIN',
  done:    'Registration submitted',
};

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { phoneNumber: paramPhone } = useLocalSearchParams<{ phoneNumber?: string }>();
  const { handleRegister, loading, error, clearError } = useRegister();

  const [step, setStep]                 = useState<Step>('details');
  const [hotelName, setHotelName]       = useState('');
  const [address, setAddress]           = useState('');
  const [email, setEmail]               = useState('');
  const [mobileNumber, setMobileNumber] = useState(paramPhone ?? '');
  const [latitude, setLatitude]         = useState('');
  const [longitude, setLongitude]       = useState('');
  const [locLoading, setLocLoading]     = useState(false);
  const [locError, setLocError]         = useState<string | null>(null);
  const [bannerUri, setBannerUri]       = useState<string | null>(null);
  const [mobileTouched, setMobileTouched] = useState(!!paramPhone);
  const [emailTouched, setEmailTouched]   = useState(false);
  // From the phone OTP; cleared whenever the number changes or the backend
  // says the proof is no longer usable.
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [verifiedFor, setVerifiedFor]     = useState<string | null>(null);
  const [otpNotice, setOtpNotice]         = useState<string | null>(null);

  // Keyboard-aware scrolling: reserves room under the form while the keyboard is
  // open and keeps the focused field above it.
  const kb = useKeyboardAwareScroll();
  const scrollRef = kb.scrollRef;
  const hotelNameRef = useRef<TextInputRef>(null);
  const addressRef   = useRef<TextInputRef>(null);
  const emailRef     = useRef<TextInputRef>(null);
  const mobileRef    = useRef<TextInputRef>(null);
  const latitudeRef  = useRef<TextInputRef>(null);
  const longitudeRef = useRef<TextInputRef>(null);

  const scrollToInput = (ref: { current: TextInputRef | null }) => {
    requestAnimationFrame(() => {
      const scrollNode = scrollRef.current as unknown as {
        getInnerViewRef: () => TextInputRef | null;
      } | null;
      const innerView = scrollNode?.getInnerViewRef();
      if (!innerView) return;
      ref.current?.measureLayout(
        innerView,
        (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(y - 24, 0), animated: true }),
        () => {},
      );
    });
  };

  const goToStep = useCallback((next: Step) => {
    Keyboard.dismiss();
    clearError();
    setStep(next);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  }, [clearError, scrollRef]);

  // Android back: step back inside the form instead of leaving it.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step === 'details') return false;
        if (step === 'done') { goToSignIn(); return true; }
        goToStep(step === 'pin' ? 'otp' : 'details');
        return true;
      });
      return () => sub.remove();
    }, [step, goToStep]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Back to the existing Sign in screen (or a fresh one if there isn't one below).
  const goToSignIn = () => {
    Keyboard.dismiss();
    router.dismissTo({ pathname: '/(auth)/login', params: { registered: '1', mobile } });
  };

  const mobile       = mobileNumber.trim();
  const coordsSet    = latitude.trim().length > 0 && longitude.trim().length > 0;
  const mobileValid  = isValidMobile(mobile);
  const showMobileError = mobileTouched && mobile.length > 0 && !mobileValid;
  const emailFilled  = email.trim().length > 0;
  const emailValid   = !emailFilled || isValidEmail(email);
  const showEmailError = emailTouched && emailFilled && !emailValid;
  const detailsValid = !!(hotelName.trim() && address.trim() && emailValid && mobileValid && coordsSet);

  const handleDetectLocation = async () => {
    try {
      setLocLoading(true);
      setLocError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocError('Location permission denied. Enter coordinates manually.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(loc.coords.latitude.toFixed(6));
      setLongitude(loc.coords.longitude.toFixed(6));
    } catch {
      setLocError('Could not detect location. Please enter manually.');
    } finally {
      setLocLoading(false);
    }
  };

  const onContinue = () => {
    if (!detailsValid) return;
    setOtpNotice(null);
    // Already verified this exact number (e.g. came back to edit details).
    goToStep(firebaseToken && verifiedFor === mobile ? 'pin' : 'otp');
  };

  const onVerified = (token: string) => {
    setFirebaseToken(token);
    setVerifiedFor(mobile);
    goToStep('pin');
  };

  const onCreatePin = async (pin: string) => {
    if (!firebaseToken) { goToStep('otp'); return; }
    const res = await handleRegister({
      hotelName:    hotelName.trim(),
      address:      address.trim(),
      mobileNumber: mobile,
      email:        emailFilled ? email.trim() : undefined,
      latitude:     parseFloat(latitude),
      longitude:    parseFloat(longitude),
      firebaseIdToken: firebaseToken,
      pin,
    }, bannerUri ?? undefined);
    if (res.ok) {
      goToStep('done');
      return;
    }
    if (res.otpProblem) {
      // OTP proof expired (e.g. the app sat on this step for a long time).
      setFirebaseToken(null);
      setVerifiedFor(null);
      setOtpNotice('Please verify your mobile number again to finish.');
      goToStep('otp');
    }
  };

  const renderDetails = () => (
    <>
      <Text style={styles.formTitle}>Create your account</Text>
      <Text style={styles.formSubtitle}>Set up your store on Strike</Text>

      {/* ── BUSINESS INFO ── */}
      <Text style={styles.sectionLabel}>BUSINESS INFO</Text>

      <View style={{ marginBottom: 16 }}>
        <BannerPicker
          uri={bannerUri}
          onPick={setBannerUri}
          onRemove={() => setBannerUri(null)}
          label="Store Banner (optional)"
        />
      </View>

      <Text style={styles.inputLabel}>Business Name *</Text>
      <TextInput
        ref={hotelNameRef}
        style={styles.input}
        placeholder="e.g. Spice Garden"
        placeholderTextColor={DS.text3}
        value={hotelName}
        onChangeText={setHotelName}
        autoCapitalize="words"
        onFocus={() => scrollToInput(hotelNameRef)}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => addressRef.current?.focus()}
      />

      <Text style={styles.inputLabel}>Address *</Text>
      <TextInput
        ref={addressRef}
        style={[styles.input, styles.inputMultiline]}
        placeholder="e.g. 123 Main Street, Hyderabad"
        placeholderTextColor={DS.text3}
        value={address}
        onChangeText={setAddress}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        onFocus={() => scrollToInput(addressRef)}
      />

      {/* ── CONTACT ── */}
      <Text style={styles.sectionLabel}>CONTACT</Text>

      <Text style={styles.inputLabel}>Mobile Number *</Text>
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
          value={mobileNumber}
          onChangeText={(text) => setMobileNumber(text.replace(/[^0-9]/g, ''))}
          keyboardType="phone-pad"
          maxLength={10}
          onFocus={() => scrollToInput(mobileRef)}
          onBlur={() => setMobileTouched(true)}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
      </View>
      {showMobileError ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
          <Text style={styles.errorText}>
            Enter a valid 10-digit mobile number starting with 6-9.
          </Text>
        </View>
      ) : (
        <Text style={styles.fieldHint}>
          We'll send an OTP to this number. You'll sign in with it and a 4-digit PIN.
        </Text>
      )}

      <Text style={styles.inputLabel}>Email (optional)</Text>
      <TextInput
        ref={emailRef}
        style={[styles.input, showEmailError && styles.inputInvalid]}
        placeholder="store@example.com"
        placeholderTextColor={DS.text3}
        value={email}
        onChangeText={setEmail}
        onBlur={() => setEmailTouched(true)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        maxLength={254}
        onFocus={() => scrollToInput(emailRef)}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
      {showEmailError && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
          <Text style={styles.errorText}>Enter a valid email address, or leave it empty.</Text>
        </View>
      )}

      {/* ── LOCATION ── */}
      <Text style={styles.sectionLabel}>LOCATION</Text>

      <TouchableOpacity
        style={styles.detectBtn}
        onPress={handleDetectLocation}
        disabled={locLoading}
        activeOpacity={0.85}
      >
        {locLoading ? (
          <ActivityIndicator size="small" color={DS.primary} />
        ) : (
          <Ionicons name="location-outline" size={18} color={DS.primary} />
        )}
        <Text style={styles.detectBtnText}>
          {locLoading ? 'Detecting…' : coordsSet ? 'Re-detect Location' : 'Auto Detect Location'}
        </Text>
      </TouchableOpacity>

      {coordsSet && !locError && (
        <View style={styles.locationSuccess}>
          <Ionicons name="checkmark-circle" size={14} color={DS.success} />
          <Text style={styles.locationSuccessText}>{latitude}, {longitude}</Text>
        </View>
      )}

      {!!locError && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
          <Text style={styles.errorText}>{locError}</Text>
        </View>
      )}

      <Text style={styles.manualLabel}>Or enter coordinates manually:</Text>
      <View style={styles.coordRow}>
        <View style={styles.coordField}>
          <Text style={styles.inputLabel}>Latitude</Text>
          <TextInput
            ref={latitudeRef}
            style={styles.input}
            placeholder="17.3850"
            placeholderTextColor={DS.text3}
            value={latitude}
            onChangeText={setLatitude}
            keyboardType="decimal-pad"
            onFocus={() => scrollToInput(latitudeRef)}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => longitudeRef.current?.focus()}
          />
        </View>
        <View style={styles.coordField}>
          <Text style={styles.inputLabel}>Longitude</Text>
          <TextInput
            ref={longitudeRef}
            style={styles.input}
            placeholder="78.4867"
            placeholderTextColor={DS.text3}
            value={longitude}
            onChangeText={setLongitude}
            keyboardType="decimal-pad"
            onFocus={() => scrollToInput(longitudeRef)}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, !detailsValid && styles.primaryBtnDisabled]}
        onPress={onContinue}
        disabled={!detailsValid}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.termsText}>
        By signing up you agree to our{' '}
        <Text style={styles.termsLink} onPress={() => router.push('/terms')}>Terms & Conditions</Text>
        {' and '}
        <Text style={styles.termsLink} onPress={() => router.push('/privacy-policy')}>Privacy Policy</Text>
      </Text>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={DS.primary} />

      {/* Brand Zone */}
      <View style={styles.brandZone}>
        <View style={[styles.brandContent, { paddingTop: insets.top + 24 }]}>
          {step !== 'details' && step !== 'done' && (
            <TouchableOpacity
              style={[styles.backBtn, { top: insets.top + 18 }]}
              onPress={() => goToStep(step === 'pin' ? 'otp' : 'details')}
              disabled={loading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>S</Text>
          </View>
          <Text style={styles.wordmark}>STRIKE</Text>
          <Text style={styles.tagline}>{STEP_LABEL[step]}</Text>
        </View>
      </View>

      {/* Form Zone */}
      <ScrollView
        ref={scrollRef}
        onScroll={kb.onScroll}
        scrollEventThrottle={kb.scrollEventThrottle}
        style={styles.formZone}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 'details' && renderDetails()}

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
              onVerified={onVerified}
              onChangeNumber={() => goToStep('details')}
              onFocusCode={() => kb.ensureVisible(140)}
            />
          </>
        )}

        {step === 'pin' && (
          <PinSetupStep
            submitLabel="Register Store"
            loading={loading}
            error={error}
            onSubmit={onCreatePin}
            onFocusField={(extra) => kb.ensureVisible(extra)}
          />
        )}

        {step === 'done' && (
          <View style={styles.doneWrap}>
            <View style={styles.doneIcon}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>
            <Text style={styles.doneTitle}>Registration submitted</Text>
            <Text style={styles.doneText}>
              Thank you! Our team will review <Text style={styles.doneBold}>{hotelName.trim()}</Text>.
            </Text>
            <View style={styles.doneCard}>
              <View style={styles.doneRow}>
                <Ionicons name="notifications-outline" size={18} color={DS.primary} />
                <Text style={styles.doneRowText}>We'll send a notification to this phone when your store is approved.</Text>
              </View>
              <View style={styles.doneRow}>
                <Ionicons name="keypad-outline" size={18} color={DS.primary} />
                <Text style={styles.doneRowText}>
                  Then sign in with <Text style={styles.doneBold}>+91 {mobile}</Text> and the PIN you just created.
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={goToSignIn} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Go to Sign in</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: kb.keyboardSpace }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.primary },

  // Brand Zone
  brandZone:    { backgroundColor: DS.primary, paddingBottom: 20 },
  brandContent: { alignItems: 'center', paddingBottom: 4 },
  backBtn:      { position: 'absolute', left: 20, width: 36, height: 36, justifyContent: 'center' },
  logoMark: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  logoMarkText: { fontSize: 24, fontWeight: '900', color: '#fff' },
  wordmark:     { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 5, marginBottom: 6 },
  tagline:      { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  // Form Zone
  formZone:    { flex: 1, backgroundColor: DS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  formContent: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48 },
  formTitle:    { fontSize: 20, fontWeight: '800', color: DS.text, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: DS.text2, marginBottom: 24 },

  // Section
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: DS.text3,
    letterSpacing: 1, marginBottom: 14, marginTop: 8,
    textTransform: 'uppercase',
  },

  // Input
  inputLabel: { fontSize: 12, fontWeight: '600', color: DS.text2, marginBottom: 7 },
  input: {
    backgroundColor: DS.bg, borderWidth: 1.5, borderColor: DS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: DS.text, marginBottom: 16,
  },
  inputMultiline: { height: 84, paddingTop: 12, textAlignVertical: 'top' },
  inputInvalid:   { borderColor: DS.primary },
  fieldHint:      { fontSize: 12, color: DS.text3, marginTop: -10, marginBottom: 16, lineHeight: 17 },

  // Phone
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DS.bg, borderWidth: 1.5, borderColor: DS.border,
    borderRadius: 12, marginBottom: 16, overflow: 'hidden', height: 52,
  },
  phoneRowError: { borderColor: DS.primary },
  countryChip:  { paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  countryText:  { fontSize: 15, fontWeight: '600', color: DS.text2 },
  phoneDivider: { width: 1, height: 28, backgroundColor: DS.border },
  phoneInput:   { flex: 1, paddingHorizontal: 14, fontSize: 15, color: DS.text, height: '100%' },

  // Location
  detectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: DS.primary, borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 16, marginBottom: 10,
  },
  detectBtnText:       { fontSize: 15, fontWeight: '600', color: DS.primary },
  locationSuccess:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  locationSuccessText: { fontSize: 13, color: DS.success, fontWeight: '500' },
  manualLabel:         { fontSize: 12, color: DS.text3, marginBottom: 10 },
  coordRow:            { flexDirection: 'row', gap: 12 },
  coordField:          { flex: 1 },

  // Error / notice
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  errorText: { fontSize: 13, color: DS.primary, flex: 1 },
  noticeRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: DS.warningSoft, borderRadius: 10, padding: 10, marginBottom: 16,
  },
  noticeText: { flex: 1, fontSize: 13, color: DS.text2, lineHeight: 18 },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary, borderRadius: 14, height: 52,
    marginTop: 8, marginBottom: 16,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText:     { fontSize: 16, fontWeight: '700', color: '#fff' },

  termsText: { fontSize: 12, color: DS.text3, textAlign: 'center', lineHeight: 18 },
  termsLink:  { color: DS.primary, fontWeight: '600' },

  // Done step
  doneWrap:  { alignItems: 'stretch', paddingTop: 8 },
  doneIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: DS.success,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18,
  },
  doneTitle: { fontSize: 22, fontWeight: '800', color: DS.text, textAlign: 'center', marginBottom: 8 },
  doneText:  { fontSize: 15, color: DS.text2, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  doneBold:  { fontWeight: '700', color: DS.text },
  doneCard:  { backgroundColor: DS.bg, borderRadius: 14, padding: 16, gap: 14, marginBottom: 20 },
  doneRow:   { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  doneRowText: { flex: 1, fontSize: 14, color: DS.text2, lineHeight: 20 },
});
