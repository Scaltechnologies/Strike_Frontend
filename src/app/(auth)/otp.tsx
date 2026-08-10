import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Dimensions, KeyboardAvoidingView, Platform, StatusBar,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useVerifyOtp } from '../../modules/auth/hooks/useAuth';

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  primarySoft: '#FFF0EE',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

const { width } = Dimensions.get('window');
const OTP_LENGTH = 6;
const BOX_GAP = 10;
const BOX_SIZE = (width - 48 - (OTP_LENGTH - 1) * BOX_GAP) / OTP_LENGTH;

export default function OtpScreen() {
  const { phoneNumber, bannerUri } = useLocalSearchParams<{ phoneNumber: string; bannerUri?: string }>();
  const { handleVerifyOtp, loading, error } = useVerifyOtp();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    if (!/^\d*$/.test(text)) return;
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const onVerify = () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) return;
    handleVerifyOtp(phoneNumber, code, bannerUri || undefined);
  };

  const maskedPhone = phoneNumber ? `+91 XXXXXX${phoneNumber.slice(-4)}` : '';
  const canSubmit = otp.join('').length === OTP_LENGTH && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={DS.primary} />

      {/* Brand Zone */}
      <View style={styles.brandZone}>
        <SafeAreaView style={styles.brandContent}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>S</Text>
          </View>
          <Text style={styles.wordmark}>STRIKE</Text>
          <Text style={styles.tagline}>Verify your identity</Text>
        </SafeAreaView>
      </View>

      {/* Form Zone */}
      <View style={styles.formZone}>
        <Text style={styles.formTitle}>Enter OTP</Text>
        <Text style={styles.formSubtitle}>
          {maskedPhone ? `Code sent to ${maskedPhone}` : 'Enter the 6-digit code sent to your number'}
        </Text>

        <View style={styles.otpRow}>
          {Array(OTP_LENGTH).fill(0).map((_, index) => (
            <TextInput
              key={index}
              ref={ref => { inputs.current[index] = ref; }}
              style={[styles.otpBox, otp[index] ? styles.otpBoxFilled : null]}
              maxLength={1}
              keyboardType="number-pad"
              value={otp[index]}
              onChangeText={text => handleChange(text, index)}
              onKeyPress={e => handleKeyPress(e, index)}
            />
          ))}
        </View>

        {!!error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.resendRow} activeOpacity={0.7}>
          <Text style={styles.resendText}>
            Didn't receive?{' '}
            <Text style={styles.resendLink}>Resend OTP</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
          onPress={onVerify}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Verify OTP</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.primary },

  brandZone:    { backgroundColor: DS.primary, paddingBottom: 28 },
  brandContent: { alignItems: 'center', paddingTop: 44, paddingBottom: 4 },
  logoMark: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  logoMarkText: { fontSize: 24, fontWeight: '900', color: '#fff' },
  wordmark:     { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 5, marginBottom: 6 },
  tagline:      { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  formZone: {
    flex: 1,
    backgroundColor: DS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40,
  },
  formTitle:    { fontSize: 22, fontWeight: '800', color: DS.text, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: DS.text2, marginBottom: 32 },

  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    gap: BOX_GAP, marginBottom: 24,
  },
  otpBox: {
    width: BOX_SIZE, height: 56, borderRadius: 14,
    backgroundColor: DS.bg, borderWidth: 1.5, borderColor: DS.border,
    textAlign: 'center', fontSize: 22, fontWeight: '800', color: DS.text,
  },
  otpBoxFilled: { backgroundColor: DS.primarySoft, borderColor: DS.primary },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  errorText: { fontSize: 13, color: DS.primary, flex: 1 },

  resendRow:  { alignItems: 'center', marginBottom: 28 },
  resendText: { fontSize: 14, color: DS.text2 },
  resendLink: { color: DS.primary, fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary, borderRadius: 14, height: 52,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
