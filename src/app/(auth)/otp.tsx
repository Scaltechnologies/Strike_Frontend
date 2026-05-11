// src/app/(auth)/otp.tsx

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
import { useLocalSearchParams } from 'expo-router';
import { useState, useRef } from 'react';
import Colors from '../../core/constants/colors';
import { useVerifyOtp } from '../../modules/auth/hooks/useAuth';

const { width, height } = Dimensions.get('window');
const OTP_LENGTH = 6;

export default function OtpScreen() {
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const { handleVerifyOtp, loading, error } = useVerifyOtp();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    if (!/^\d*$/.test(text)) return;
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const onVerify = () => {
    const otpString = otp.join('');
    if (otpString.length < OTP_LENGTH) return;
    handleVerifyOtp({ phoneNumber, otp: otpString });
  };

  const maskedPhone = phoneNumber
    ? `+91 XXXXXX${phoneNumber.slice(-4)}`
    : '';

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
        <View style={styles.card}>

          {/* Heading */}
          <Text style={styles.heading}>Enter OTP</Text>
          <Text style={styles.subheading}>
            Sent to {maskedPhone}
          </Text>

          {/* OTP boxes */}
          <View style={styles.otpRow}>
            {Array(OTP_LENGTH).fill(0).map((_, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputs.current[index] = ref; }}
                style={[
                  styles.otpBox,
                  otp[index] ? styles.otpBoxFilled : null,
                ]}
                maxLength={1}
                keyboardType="number-pad"
                value={otp[index]}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
              />
            ))}
          </View>

          {/* Error */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Resend */}
          <TouchableOpacity style={styles.resendRow}>
            <Text style={styles.resendText}>
              Didn't receive?{' '}
              <Text style={styles.resendLink}>Resend OTP</Text>
            </Text>
          </TouchableOpacity>

          {/* Verify button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (loading || otp.join('').length < OTP_LENGTH) &&
                styles.verifyButtonDisabled,
            ]}
            onPress={onVerify}
            disabled={loading || otp.join('').length < OTP_LENGTH}
            activeOpacity={0.85}
          >
            <Text style={styles.verifyButtonText}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Text>
            {!loading && <Text style={styles.verifyArrow}>→</Text>}
          </TouchableOpacity>

          {/* Hint */}
          <Text style={styles.hintText}>
            💡 Use OTP{' '}
            <Text style={styles.hintCode}>9999</Text>
            {' '}to login as existing user
          </Text>

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
    height: height * 0.18,
  },
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBox: {
    width: (width - 56 - 40) / OTP_LENGTH,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.bgInput,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textDark,
  },
  otpBoxFilled: {
    backgroundColor: Colors.bgWarm,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  errorText: {
    color: Colors.primary,
    fontSize: 13,
    marginBottom: 10,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 28,
  },
  resendText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  resendLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 50,
    paddingVertical: 18,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  verifyArrow: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '600',
  },
  hintText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 13,
  },
  hintCode: {
    fontWeight: '700',
    color: Colors.textDark,
  },
});