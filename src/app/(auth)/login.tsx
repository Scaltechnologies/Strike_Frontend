import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSendOtp } from '../../modules/auth/hooks/useAuth';

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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [phoneNumber, setPhoneNumber] = useState('');
  const { handleSendOtp, loading, error } = useSendOtp();

  const canSubmit = phoneNumber.length === 10 && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={DS.primary} />

      {/* Brand Zone */}
      <View style={styles.brandZone}>
        <View style={[styles.brandContent, { paddingTop: insets.top + 36 }]}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>S</Text>
          </View>
          <Text style={styles.wordmark}>STRIKE</Text>
          <Text style={styles.tagline}>Your business, powered by loyalty.</Text>
        </View>
      </View>

      {/* Form Zone */}
      <View style={styles.formZone}>
        <Text style={styles.formTitle}>Welcome back</Text>
        <Text style={styles.formSubtitle}>Sign in to your vendor account</Text>

        <Text style={styles.inputLabel}>Mobile Number</Text>
        <View style={styles.phoneRow}>
          <View style={styles.countryChip}>
            <Text style={styles.countryText}>+91</Text>
          </View>
          <View style={styles.phoneDivider} />
          <TextInput
            style={styles.phoneInput}
            placeholder="98765 43210"
            placeholderTextColor={DS.text3}
            keyboardType="phone-pad"
            maxLength={10}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        {!!error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
          onPress={() => handleSendOtp(phoneNumber)}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Get OTP</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Create an account</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing you agree to our{' '}
          <Text style={styles.termsLink}>Terms</Text>
          {' & '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.primary },

  // Brand Zone
  brandZone:    { backgroundColor: DS.primary, paddingBottom: 32 },
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
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  formTitle:    { fontSize: 22, fontWeight: '800', color: DS.text, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: DS.text2, marginBottom: 28 },

  // Phone input
  inputLabel: { fontSize: 12, fontWeight: '600', color: DS.text2, marginBottom: 8 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DS.bg, borderWidth: 1.5, borderColor: DS.border,
    borderRadius: 12, marginBottom: 16, overflow: 'hidden', height: 52,
  },
  countryChip:  { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  countryText:  { fontSize: 15, fontWeight: '600', color: DS.text2 },
  phoneDivider: { width: 1, height: 28, backgroundColor: DS.border },
  phoneInput:   { flex: 1, paddingHorizontal: 16, fontSize: 15, color: DS.text, height: '100%' },

  // Error
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: -8, marginBottom: 12,
  },
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
  secondaryBtnText: { fontSize: 16, fontWeight: '700', color: DS.primary },

  termsText: { fontSize: 12, color: DS.text3, textAlign: 'center', lineHeight: 18 },
  termsLink:  { color: DS.primary, fontWeight: '600' },
});
