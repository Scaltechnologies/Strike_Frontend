// src/app/(auth)/login.tsx

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import Colors from '../../core/constants/colors';
import { useSendOtp } from '../../modules/auth/hooks/useAuth';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const { handleSendOtp, loading, error } = useSendOtp();

  const onGetOtp = () => {
    if (phoneNumber.length < 10) return;
    handleSendOtp({ phoneNumber });
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

      {/* ── Illustration placeholder ── */}
      <View style={styles.illustrationPlaceholder} />

      {/* ── Bottom white card ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.cardWrapper}
      >
        <View style={styles.card}>

          {/* Phone input */}
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="000000000"
            placeholderTextColor={Colors.textPlaceholder}
            keyboardType="phone-pad"
            maxLength={10}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />

          {/* Error */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Get OTP button */}
          <TouchableOpacity
            style={[
              styles.otpButton,
              (loading || phoneNumber.length < 10) && styles.otpButtonDisabled,
            ]}
            onPress={onGetOtp}
            disabled={loading || phoneNumber.length < 10}
            activeOpacity={0.85}
          >
            <Text style={styles.otpButtonText}>
              {loading ? 'Sending...' : 'Get OTP'}
            </Text>
            {!loading && <Text style={styles.otpArrow}>→</Text>}
          </TouchableOpacity>

          {/* Divider text */}
          <Text style={styles.newHereText}>
            New here? Want to join us?
          </Text>

          {/* Sign Up button */}
          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.85}
          >
            <Text style={styles.signupButtonText}>SIGN UP</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgWarm,
  },

  // ── Decorative circles ──
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

  // ── Logo ──
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.accent,
  },

  // ── Illustration space ──
  illustrationPlaceholder: {
    height: height * 0.18,
  },

  // ── White card ──
  cardWrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 40,
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },

  // ── Phone input ──
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

  // ── Error ──
  errorText: {
    color: Colors.primary,
    fontSize: 13,
    marginBottom: 10,
    marginTop: -10,
  },

  // ── Get OTP button ──
  otpButton: {
    backgroundColor: Colors.primary,
    borderRadius: 50,
    paddingVertical: 18,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpButtonDisabled: {
    opacity: 0.5,
  },
  otpButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  otpArrow: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '600',
  },

  // ── New here text ──
  newHereText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 14,
    marginBottom: 16,
  },

  // ── Sign Up button ──
  signupButton: {
    borderWidth: 1.5,
    borderColor: Colors.borderPrimary,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signupButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
});