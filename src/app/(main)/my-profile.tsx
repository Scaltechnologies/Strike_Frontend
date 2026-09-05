import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/Text';
import TextInput, { type TextInputRef } from '../../components/TextInput';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getVendorProfile,
  getVendorProfileStatus,
  patchVendorProfile,
} from '../../modules/vendor/services/vendorProfileService';
import type {
  VendorProfileResponse,
  VendorProfileStatus,
  UpdateVendorProfileRequest,
} from '../../modules/vendor/types/vendor.types';

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

function statusColors(s: string) {
  if (s === 'ACTIVE')                        return { bg: DS.successSoft, fg: DS.success };
  if (s === 'SUSPENDED' || s === 'REJECTED') return { bg: DS.errorSoft,   fg: DS.error   };
  return { bg: DS.warningSoft, fg: DS.warning };
}

interface Field {
  key: keyof UpdateVendorProfileRequest;
  label: string;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}

const FIELDS: Field[] = [
  { key: 'shopName',    label: 'Shop Name',    placeholder: 'e.g. Sri Raghava Curry Point' },
  { key: 'ownerName',  label: 'Owner Name',   placeholder: 'e.g. Ravi Kumar' },
  { key: 'email',      label: 'Email',        placeholder: 'you@example.com', keyboardType: 'email-address' },
  { key: 'mobile',     label: 'Mobile',       placeholder: '+91 98765 43210', keyboardType: 'phone-pad' },
  { key: 'category',   label: 'Category',     placeholder: 'e.g. Restaurant, Cafe' },
  { key: 'description',label: 'Description',  placeholder: 'Brief description of your business', multiline: true },
];

export default function MyProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile]   = useState<VendorProfileResponse | null>(null);
  const [vstatus, setVstatus]   = useState<VendorProfileStatus | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState<UpdateVendorProfileRequest>({});

  const scrollRef = useRef<ScrollView>(null);
  const fieldRefs  = useRef<Record<string, TextInputRef | null>>({});

  const scrollToInput = (key: string) => {
    requestAnimationFrame(() => {
      const scrollNode = scrollRef.current as unknown as {
        getInnerViewRef: () => TextInputRef | null;
      } | null;
      const innerView = scrollNode?.getInnerViewRef();
      const target = fieldRefs.current[key];
      if (!innerView || !target) return;
      target.measureLayout(
        innerView,
        (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(y - 24, 0), animated: true }),
        () => {},
      );
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([getVendorProfile(), getVendorProfileStatus()]);
      setProfile(p);
      setVstatus(s);
      setForm({
        shopName:    p.shopName    ?? '',
        ownerName:   p.ownerName   ?? '',
        email:       p.email       ?? '',
        mobile:      p.mobile      ?? '',
        category:    p.category    ?? '',
        description: p.description ?? '',
      });
    } catch {
      Alert.alert('Error', 'Failed to load profile. Please try again.', [
        { text: 'Retry', onPress: load },
        { text: 'Cancel', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.shopName?.trim()) {
      Alert.alert('Validation', 'Shop name is required.');
      return;
    }
    setSaving(true);
    try {
      await patchVendorProfile(form);
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sc = statusColors(vstatus?.status ?? '');

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={DS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={DS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Status info card */}
        {vstatus && (
          <View style={[styles.statusCard, { backgroundColor: sc.bg, borderColor: sc.fg + '33' }]}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: sc.fg }]} />
              <Text style={[styles.statusText, { color: sc.fg }]}>
                Account {vstatus.status}
              </Text>
            </View>
            {vstatus.commissionRate > 0 && (
              <Text style={[styles.commissionText, { color: sc.fg }]}>
                Commission rate: {vstatus.commissionRate}%
              </Text>
            )}
            {vstatus.rejectionReason && (
              <Text style={styles.rejectionText}>{vstatus.rejectionReason}</Text>
            )}
          </View>
        )}

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.formCardTitle}>Business Information</Text>

          {FIELDS.map((field, idx) => (
            <View key={field.key} style={idx < FIELDS.length - 1 ? styles.fieldWrap : styles.fieldWrapLast}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                ref={ref => { fieldRefs.current[field.key] = ref; }}
                style={[styles.input, field.multiline && styles.inputMultiline]}
                value={String(form[field.key] ?? '')}
                onChangeText={val => setForm(prev => ({ ...prev, [field.key]: val }))}
                onFocus={() => scrollToInput(field.key)}
                placeholder={field.placeholder}
                placeholderTextColor={DS.text3}
                keyboardType={field.keyboardType ?? 'default'}
                autoCapitalize={field.keyboardType === 'email-address' ? 'none' : 'sentences'}
                multiline={field.multiline}
                numberOfLines={field.multiline ? 3 : 1}
                textAlignVertical={field.multiline ? 'top' : 'center'}
              />
            </View>
          ))}
        </View>

        {/* Read-only info */}
        {profile && (
          <View style={styles.metaCard}>
            <Text style={styles.formCardTitle}>Account Details</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Vendor ID</Text>
              <Text style={styles.metaValue}>#{profile.vendorId}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Member since</Text>
              <Text style={styles.metaValue}>
                {new Date(profile.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Save footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: DS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: DS.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DS.surface,
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  backBtn:     { width: 36, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: DS.text },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  // Status card
  statusCard: {
    borderRadius: 14, borderWidth: 1,
    padding: 14, marginBottom: 16,
  },
  statusRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot:      { width: 8, height: 8, borderRadius: 4 },
  statusText:     { fontSize: 14, fontWeight: '700' },
  commissionText: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  rejectionText:  { fontSize: 12, color: DS.error, marginTop: 6, lineHeight: 18 },

  // Form card
  formCard: {
    backgroundColor: DS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: DS.border,
    padding: 16, marginBottom: 16,
  },
  formCardTitle: {
    fontSize: 13, fontWeight: '700', color: DS.text3,
    letterSpacing: 0.5, marginBottom: 16, textTransform: 'uppercase',
  },
  fieldWrap:     { marginBottom: 16 },
  fieldWrapLast: { marginBottom: 0 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: DS.text2,
    marginBottom: 6,
  },
  input: {
    backgroundColor: DS.bg,
    borderWidth: 1, borderColor: DS.border,
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: DS.text,
  },
  inputMultiline: { height: 88, paddingTop: 12, textAlignVertical: 'top' },

  // Meta card
  metaCard: {
    backgroundColor: DS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: DS.border,
    padding: 16,
  },
  metaRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  metaDivider: { height: 1, backgroundColor: DS.border },
  metaLabel:   { fontSize: 14, color: DS.text2 },
  metaValue:   { fontSize: 14, fontWeight: '600', color: DS.text },

  // Footer
  footer: {
    padding: 16, paddingBottom: 28,
    backgroundColor: DS.surface,
    borderTopWidth: 1, borderTopColor: DS.border,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary,
    borderRadius: 14, paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { fontSize: 16, fontWeight: '700', color: '#fff' },
});
