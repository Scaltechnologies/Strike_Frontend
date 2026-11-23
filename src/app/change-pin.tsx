// Change PIN — Profile → Change PIN. Current PIN + new PIN (twice).
// Forgot the current one? Sign out and use "Forgot PIN?" on the sign-in screen.

import {
  View, TouchableOpacity, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/Text';
import { type TextInputRef } from '../components/TextInput';
import PinInput from '../modules/auth/components/PinInput';
import PinSetupStep from '../modules/auth/components/PinSetupStep';
import { useChangePin } from '../modules/auth/hooks/useAuth';
import { PIN_LENGTH } from '../modules/auth/utils/validation';
import { useKeyboardAwareScroll } from '../core/keyboard/useKeyboardAwareScroll';

const DS = {
  bg:      '#F6F7FA',
  surface: '#FFFFFF',
  border:  '#EAECEF',
  primary: '#CC2200',
  text:    '#1A1A1A',
  text2:   '#5A6272',
  text3:   '#9BA3AF',
};

export default function ChangePinScreen() {
  const insets = useSafeAreaInsets();
  const { handleChange, loading, error, clearError } = useChangePin();
  const kb = useKeyboardAwareScroll();

  const [current, setCurrent] = useState('');
  const [step, setStep]       = useState<'current' | 'new'>('current');
  const currentRef = useRef<TextInputRef>(null);

  const onSave = async (newPin: string) => {
    const ok = await handleChange(current, newPin);
    if (ok) {
      Alert.alert('PIN updated', 'Use your new PIN the next time you sign in.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  // A wrong current PIN is only known after saving — send the vendor back to it.
  const currentWrong = !!error && /current PIN/i.test(error);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />

      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity
          style={styles.headerSide}
          onPress={() => (step === 'new' ? (clearError(), setStep('current')) : router.back())}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={DS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change PIN</Text>
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
          {step === 'current' || currentWrong ? (
            <>
              <Text style={styles.title}>Enter your current PIN</Text>
              <Text style={styles.subtitle}>To keep your account safe, confirm your current PIN first.</Text>
              <PinInput
                ref={currentRef}
                value={current}
                onChangeText={(v) => { setCurrent(v); if (error) clearError(); }}
                onComplete={() => { clearError(); setStep('new'); }}
                onFocus={() => kb.ensureVisible(80)}
                invalid={currentWrong}
                autoFocus
                accessibilityLabel="Current 4-digit PIN"
              />
              {currentWrong && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.primaryBtn, current.length !== PIN_LENGTH && styles.primaryBtnDisabled]}
                onPress={() => { clearError(); setStep('new'); }}
                disabled={current.length !== PIN_LENGTH}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
              </TouchableOpacity>
              <Text style={styles.hint}>
                Forgot your PIN? Sign out, then tap "Forgot PIN?" on the sign-in screen to reset it with an OTP.
              </Text>
            </>
          ) : (
            <PinSetupStep
              title="Create a new 4-digit PIN"
              subtitle="Choose a PIN that's different from your current one."
              submitLabel="Update PIN"
              loading={loading}
              error={error}
              onSubmit={onSave}
              onFocusField={(extra) => kb.ensureVisible(extra)}
            />
          )}
        </View>
        <View style={{ height: kb.keyboardSpace }} />
      </ScrollView>
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
  hint:     { fontSize: 12, color: DS.text3, lineHeight: 17, marginTop: 14 },

  errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 12 },
  errorText: { fontSize: 13, color: DS.primary, flex: 1 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary, borderRadius: 14, height: 52, marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
