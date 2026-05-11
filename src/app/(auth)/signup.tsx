// src/app/(auth)/signup.tsx

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import * as Location from 'expo-location';
import Colors from '../../core/constants/colors';
import { useSignup } from '../../modules/auth/hooks/useAuth';

const { height } = Dimensions.get('window');

export default function SignupScreen() {
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const { handleSignup, loading, error } = useSignup();

  const [hotelName, setHotelName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const isFormValid =
    hotelName.trim() &&
    address.trim() &&
    email.trim() &&
    latitude.trim() &&
    longitude.trim();

  // ── Auto detect location ───────────────────────
  const handleDetectLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Enter manually.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(loc.coords.latitude.toFixed(6));
      setLongitude(loc.coords.longitude.toFixed(6));
    } catch (err) {
      setLocationError('Could not fetch location. Enter manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Submit ─────────────────────────────────────
  const onSignup = () => {
    if (!isFormValid) return;
    handleSignup({
      hotelName: hotelName.trim(),
      address: address.trim(),
      mobileNumber: phoneNumber,
      email: email.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    });
  };

  return (
    <View style={styles.container}>

      {/* ── Decorative circles ── */}
      <View style={styles.circleLarge} />
      <View style={styles.circleSmall} />

      {/* ── Logo ── */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Strike</Text>
      </View>

      <View style={styles.illustrationPlaceholder} />

      {/* ── White card ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.cardWrapper}
      >
        <ScrollView
          contentContainerStyle={styles.card}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Heading */}
          <Text style={styles.heading}>Vendor Signup</Text>
          <Text style={styles.subheading}>
            Register your hotel on Strike 🍱
          </Text>

          {/* Hotel Name */}
          <Text style={styles.label}>Hotel Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Spice Garden"
            placeholderTextColor={Colors.textPlaceholder}
            value={hotelName}
            onChangeText={setHotelName}
            autoCapitalize="words"
          />

          {/* Address */}
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="e.g. 123 Main Street, Hyderabad"
            placeholderTextColor={Colors.textPlaceholder}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. hotel@example.com"
            placeholderTextColor={Colors.textPlaceholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Mobile (read only) */}
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.inputReadOnly}>
            <Text style={styles.inputReadOnlyText}>
              {phoneNumber || '—'}
            </Text>
            <Text style={styles.verifiedBadge}>✓ Verified</Text>
          </View>

          {/* Location heading */}
          <Text style={styles.label}>Location</Text>

          {/* Auto detect button */}
          <TouchableOpacity
            style={styles.detectButton}
            onPress={handleDetectLocation}
            disabled={locationLoading}
            activeOpacity={0.85}
          >
            {locationLoading ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.detectIcon}>📍</Text>
            )}
            <Text style={styles.detectText}>
              {locationLoading
                ? 'Detecting...'
                : latitude
                ? 'Re-detect Location'
                : 'Auto Detect Location'}
            </Text>
          </TouchableOpacity>

          {/* Location error */}
          {locationError && (
            <Text style={styles.errorText}>{locationError}</Text>
          )}

          {/* Lat / Long inputs */}
          <View style={styles.coordRow}>
            <View style={styles.coordField}>
              <Text style={styles.coordLabel}>Latitude</Text>
              <TextInput
                style={styles.coordInput}
                placeholder="e.g. 17.3850"
                placeholderTextColor={Colors.textPlaceholder}
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.coordField}>
              <Text style={styles.coordLabel}>Longitude</Text>
              <TextInput
                style={styles.coordInput}
                placeholder="e.g. 78.4867"
                placeholderTextColor={Colors.textPlaceholder}
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Form error */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.signupButton,
              (!isFormValid || loading) && styles.signupButtonDisabled,
            ]}
            onPress={onSignup}
            disabled={!isFormValid || loading}
            activeOpacity={0.85}
          >
            <Text style={styles.signupButtonText}>
              {loading ? 'Registering...' : 'Register Hotel'}
            </Text>
            {!loading && <Text style={styles.signupArrow}>→</Text>}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.termsText}>
            By signing up you agree to our{' '}
            <Text style={styles.termsLink}>Terms & Conditions</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgWarm,
  },
  circleLarge: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.circleMid,
    opacity: 0.5,
  },
  circleSmall: {
    position: 'absolute',
    top: 30,
    left: 60,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.circleLight,
    opacity: 0.6,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.accent,
  },
  illustrationPlaceholder: {
    height: height * 0.08,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 48,
    flexGrow: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 28,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: 20,
  },
  inputMultiline: {
    height: 90,
    textAlignVertical: 'top',
  },
  inputReadOnly: {
    backgroundColor: Colors.bgInput,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputReadOnlyText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  verifiedBadge: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },

  // ── Location ──
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.borderPrimary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 14,
    gap: 10,
  },
  detectIcon: {
    fontSize: 18,
  },
  detectText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  coordRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  coordField: {
    flex: 1,
  },
  coordLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  coordInput: {
    backgroundColor: Colors.bgInput,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textDark,
  },

  // ── Error ──
  errorText: {
    color: Colors.primary,
    fontSize: 13,
    marginBottom: 12,
  },

  // ── Submit ──
  signupButton: {
    backgroundColor: Colors.primary,
    borderRadius: 50,
    paddingVertical: 18,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  signupButtonDisabled: {
    opacity: 0.5,
  },
  signupButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  signupArrow: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '600',
  },
  termsText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});