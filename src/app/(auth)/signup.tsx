import {
  View, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, StatusBar,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRegister } from '../../modules/auth/hooks/useAuth';
import BannerPicker from '../../modules/store/components/BannerPicker';

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

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { phoneNumber: paramPhone } = useLocalSearchParams<{ phoneNumber: string }>();
  const { handleRegister, loading, error } = useRegister();

  const [hotelName, setHotelName]       = useState('');
  const [address, setAddress]           = useState('');
  const [email, setEmail]               = useState('');
  const [mobileNumber, setMobileNumber] = useState(paramPhone ?? '');
  const [latitude, setLatitude]         = useState('');
  const [longitude, setLongitude]       = useState('');
  const [locLoading, setLocLoading]     = useState(false);
  const [locError, setLocError]         = useState<string | null>(null);
  const [bannerUri, setBannerUri]       = useState<string | null>(null);

  const coordsSet    = latitude.trim().length > 0 && longitude.trim().length > 0;
  const isFormValid  = !!(hotelName.trim() && address.trim() && email.trim() && mobileNumber.trim() && coordsSet);

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

  const onSignup = () => {
    if (!isFormValid) return;
    handleRegister({
      hotelName:    hotelName.trim(),
      address:      address.trim(),
      mobileNumber: mobileNumber.trim(),
      email:        email.trim(),
      latitude:     parseFloat(latitude),
      longitude:    parseFloat(longitude),
    }, bannerUri ?? undefined);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={DS.primary} />

      {/* Brand Zone */}
      <View style={styles.brandZone}>
     <View style={[styles.brandContent, { paddingTop: insets.top + 24 }]}>
      <View style={styles.logoMark}>
     <Text style={styles.logoMarkText}>S</Text>
     </View>

    <Text style={styles.wordmark}>STRIKE</Text>
    <Text style={styles.tagline}>Register your business</Text>
  </View>
</View>

      {/* Form Zone */}
      <ScrollView
        style={styles.formZone}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
          style={styles.input}
          placeholder="e.g. Spice Garden"
          placeholderTextColor={DS.text3}
          value={hotelName}
          onChangeText={setHotelName}
          autoCapitalize="words"
        />

        <Text style={styles.inputLabel}>Address *</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="e.g. 123 Main Street, Hyderabad"
          placeholderTextColor={DS.text3}
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* ── CONTACT ── */}
        <Text style={styles.sectionLabel}>CONTACT</Text>

        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="store@example.com"
          placeholderTextColor={DS.text3}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Mobile Number *</Text>
        <View style={styles.phoneRow}>
          <View style={styles.countryChip}>
            <Text style={styles.countryText}>+91</Text>
          </View>
          <View style={styles.phoneDivider} />
          <TextInput
            style={styles.phoneInput}
            placeholder="98765 43210"
            placeholderTextColor={DS.text3}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="phone-pad"
            maxLength={10}
            editable={!paramPhone}
          />
        </View>

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
              style={styles.input}
              placeholder="17.3850"
              placeholderTextColor={DS.text3}
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.coordField}>
            <Text style={styles.inputLabel}>Longitude</Text>
            <TextInput
              style={styles.input}
              placeholder="78.4867"
              placeholderTextColor={DS.text3}
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {!!error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, (!isFormValid || loading) && styles.primaryBtnDisabled]}
          onPress={onSignup}
          disabled={!isFormValid || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="storefront-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Register Store</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By signing up you agree to our{' '}
          <Text style={styles.termsLink}>Terms & Conditions</Text>
          {' and '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.primary },

  // Brand Zone
  brandZone:    { backgroundColor: DS.primary, paddingBottom: 20 },
  brandContent: { alignItems: 'center', paddingBottom: 4 },
  logoMark: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  logoMarkText: { fontSize: 24, fontWeight: '900', color: '#fff' },
  wordmark:     { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 5, marginBottom: 6 },
  tagline:      { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

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

  // Phone
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DS.bg, borderWidth: 1.5, borderColor: DS.border,
    borderRadius: 12, marginBottom: 16, overflow: 'hidden', height: 52,
  },
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

  // Error
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  errorText: { fontSize: 13, color: DS.primary, flex: 1 },

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
});
