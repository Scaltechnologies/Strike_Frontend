import { useState, useEffect } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestCoupon } from '../../modules/coupon/services/couponService';
import type { CreateCouponRequest, DiscountType } from '../../modules/coupon/types/coupon.types';

const DS = {
  bg: '#F6F7FA', surface: '#FFFFFF', border: '#EAECEF',
  primary: '#CC2200', primarySoft: '#FFF0EE',
  success: '#16A34A', successSoft: '#F0FDF4',
  warning: '#D97706', warningSoft: '#FFFBEB',
  text: '#1A1A1A', text2: '#5A6272', text3: '#9BA3AF',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return !isNaN(new Date(s + 'T00:00:00').getTime());
}

function formatDiscount(type: DiscountType, value: number) {
  return type === 'PERCENTAGE' ? `${value}%` : `₹${value}`;
}

function formatDateLabel(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

type SuccessDetails = { title: string; discount: string; validFrom: string; validUntil: string };

function SuccessModal({
  visible, details, onDone,
}: { visible: boolean; details: SuccessDetails | null; onDone: () => void }) {
  const ringScale    = useSharedValue(0.6);
  const ringOpacity  = useSharedValue(0);
  const iconScale    = useSharedValue(0);
  const sheetY       = useSharedValue(24);
  const sheetOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      ringScale.value    = 0.6;
      ringOpacity.value  = 0.5;
      iconScale.value    = 0;
      sheetY.value       = 24;
      sheetOpacity.value = 0;

      sheetOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      sheetY.value        = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      iconScale.value    = withDelay(120, withSpring(1, { damping: 9, stiffness: 140 }));
      ringScale.value    = withDelay(120, withTiming(1.9, { duration: 850, easing: Easing.out(Easing.cubic) }));
      ringOpacity.value  = withDelay(120, withTiming(0, { duration: 850, easing: Easing.out(Easing.cubic) }));
    }
  }, [visible]);

  const iconStyle  = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));
  const ringStyle  = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value }],
  }));

  if (!details) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone} statusBarTranslucent>
      <View style={ms.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onDone} />
        <Animated.View style={[ms.sheet, sheetStyle]}>
          <View style={ms.badgeWrap}>
            <Animated.View style={[ms.ring, ringStyle]} />
            <Animated.View style={[ms.iconCircle, iconStyle]}>
              <Ionicons name="paper-plane" size={30} color="#fff" />
            </Animated.View>
          </View>

          <Text style={ms.title}>Request Sent!</Text>
          <Text style={ms.subtitle}>
            <Text style={ms.couponName}>"{details.title}"</Text> is on its way to the admin for
            review. You'll be notified once it's approved.
          </Text>

          <View style={ms.statsRow}>
            <View style={ms.statBlock}>
              <Text style={ms.statLabel}>DISCOUNT</Text>
              <Text style={[ms.statValue, { color: DS.primary }]}>{details.discount}</Text>
            </View>
            <View style={ms.statDivider} />
            <View style={ms.statBlock}>
              <Text style={ms.statLabel}>VALID</Text>
              <Text style={ms.statValue}>
                {formatDateLabel(details.validFrom)} – {formatDateLabel(details.validUntil)}
              </Text>
            </View>
          </View>

          <View style={ms.statusPill}>
            <Ionicons name="time-outline" size={13} color={DS.warning} />
            <Text style={ms.statusPillText}>Status: Pending Approval</Text>
          </View>

          <TouchableOpacity style={ms.doneBtn} onPress={onDone} activeOpacity={0.88}>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={ms.doneBtnText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function CouponCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [maxDiscount, setMaxDiscount]   = useState('');
  const [minPurchase, setMinPurchase]   = useState('');
  const [maxUses, setMaxUses]           = useState('');
  const [validFrom, setValidFrom]       = useState(todayISO());
  const [validUntil, setValidUntil]     = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [successDetails, setSuccessDetails] = useState<SuccessDetails | null>(null);

  const discountNum = parseFloat(discountValue) || 0;
  const validDiscount = discountNum > 0 && (discountType === 'FLAT' || discountNum <= 100);

  const datesOk =
    isValidDate(validFrom) && isValidDate(validUntil) &&
    new Date(validUntil + 'T00:00:00').getTime() >= new Date(validFrom + 'T00:00:00').getTime();

  const canSubmit = title.trim().length > 0 && validDiscount && datesOk && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const payload: CreateCouponRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      discountType,
      discountValue: discountNum,
      maxDiscountAmount: discountType === 'PERCENTAGE' && maxDiscount.trim() ? parseFloat(maxDiscount) : undefined,
      minPurchaseAmount: minPurchase.trim() ? parseFloat(minPurchase) : undefined,
      maxUses: maxUses.trim() ? parseInt(maxUses, 10) : undefined,
      validFrom,
      validUntil,
    };
    setSubmitting(true);
    try {
      await requestCoupon(payload);
      setSuccessDetails({
        title: title.trim(),
        discount: formatDiscount(discountType, discountNum),
        validFrom,
        validUntil,
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to submit coupon request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={ss.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />

      {/* Header */}
      <View style={[ss.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity
          style={ss.headerBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={DS.text} />
        </TouchableOpacity>
        <Text style={ss.headerTitle}>Request Coupon</Text>
        <View style={ss.headerBtn} />
      </View>

      <ScrollView
        style={ss.scroll}
        contentContainerStyle={ss.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={ss.noticeBanner}>
          <Ionicons name="information-circle-outline" size={16} color={DS.text2} />
          <Text style={ss.noticeText}>
            Coupon requests are reviewed by the admin. Once approved, it becomes active and
            customers can apply it.
          </Text>
        </View>

        <View style={ss.sCard}>
          <Text style={ss.sTitle}>COUPON DETAILS</Text>
          <View style={ss.field}>
            <Text style={ss.label}>Title *</Text>
            <TextInput
              style={ss.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Weekend Special"
              placeholderTextColor={DS.text3}
            />
          </View>
          <View>
            <Text style={ss.label}>Description</Text>
            <TextInput
              style={[ss.input, ss.inputMulti]}
              value={description}
              onChangeText={setDescription}
              placeholder="What is this coupon for?"
              placeholderTextColor={DS.text3}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={ss.sCard}>
          <Text style={ss.sTitle}>DISCOUNT</Text>
          <View style={ss.chipRow}>
            {(['PERCENTAGE', 'FLAT'] as DiscountType[]).map(t => {
              const sel = discountType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[ss.chip, sel && ss.chipSel]}
                  onPress={() => setDiscountType(t)}
                  activeOpacity={0.75}
                >
                  {sel && <Ionicons name="checkmark-circle" size={14} color="#fff" />}
                  <Text style={[ss.chipText, sel && ss.chipTextSel]}>
                    {t === 'PERCENTAGE' ? 'Percentage Off' : 'Flat Amount Off'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={ss.field}>
            <Text style={ss.label}>
              {discountType === 'PERCENTAGE' ? 'Discount (%) *' : 'Discount Amount (₹) *'}
            </Text>
            <TextInput
              style={[ss.input, discountValue.length > 0 && !validDiscount && ss.inputErr]}
              value={discountValue}
              onChangeText={setDiscountValue}
              placeholder={discountType === 'PERCENTAGE' ? '10' : '100'}
              placeholderTextColor={DS.text3}
              keyboardType="numeric"
            />
            {discountValue.length > 0 && !validDiscount && (
              <Text style={ss.fieldErr}>
                {discountType === 'PERCENTAGE' ? 'Enter a value between 1 and 100' : 'Enter a value greater than 0'}
              </Text>
            )}
          </View>

          {discountType === 'PERCENTAGE' && (
            <View style={ss.field}>
              <Text style={ss.label}>Max Discount Amount (₹, optional)</Text>
              <TextInput
                style={ss.input}
                value={maxDiscount}
                onChangeText={setMaxDiscount}
                placeholder="e.g. 150"
                placeholderTextColor={DS.text3}
                keyboardType="numeric"
              />
            </View>
          )}

          <View>
            <Text style={ss.label}>Minimum Purchase Amount (₹, optional)</Text>
            <TextInput
              style={ss.input}
              value={minPurchase}
              onChangeText={setMinPurchase}
              placeholder="e.g. 200"
              placeholderTextColor={DS.text3}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={ss.sCard}>
          <Text style={ss.sTitle}>VALIDITY</Text>
          <View style={ss.row}>
            <View style={{ flex: 1 }}>
              <Text style={ss.label}>Valid From *</Text>
              <TextInput
                style={[ss.input, !isValidDate(validFrom) && ss.inputErr]}
                value={validFrom}
                onChangeText={setValidFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={DS.text3}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ss.label}>Valid Until *</Text>
              <TextInput
                style={[ss.input, validUntil.length > 0 && !isValidDate(validUntil) && ss.inputErr]}
                value={validUntil}
                onChangeText={setValidUntil}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={DS.text3}
              />
            </View>
          </View>
          {isValidDate(validFrom) && isValidDate(validUntil) && !datesOk && (
            <Text style={ss.fieldErr}>Valid Until must be on or after Valid From</Text>
          )}

          <View style={{ marginTop: 14 }}>
            <Text style={ss.label}>Max Uses (optional)</Text>
            <TextInput
              style={ss.input}
              value={maxUses}
              onChangeText={setMaxUses}
              placeholder="Leave blank for unlimited"
              placeholderTextColor={DS.text3}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={ss.footer}>
        <TouchableOpacity
          style={[ss.submitBtn, !canSubmit && ss.submitBtnOff]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="pricetag-outline" size={16} color="#fff" />
              <Text style={ss.submitBtnText}>Send for Approval</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <SuccessModal
        visible={successDetails !== null}
        details={successDetails}
        onDone={() => router.back()}
      />
    </KeyboardAvoidingView>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: DS.surface, paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: DS.border,
  },
  headerBtn:   { width: 36, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: DS.text, flex: 1, textAlign: 'center' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  noticeBanner: {
    flexDirection: 'row', gap: 8, backgroundColor: DS.surface,
    borderRadius: 12, borderWidth: 1, borderColor: DS.border,
    padding: 12, marginBottom: 14,
  },
  noticeText: { flex: 1, fontSize: 12, color: DS.text2, lineHeight: 17 },

  sCard: {
    backgroundColor: DS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: DS.border,
    padding: 16, marginBottom: 14,
  },
  sTitle: {
    fontSize: 11, fontWeight: '700', color: DS.text3,
    letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase',
  },
  row:   { flexDirection: 'row', gap: 12 },
  field: { marginBottom: 14 },

  label: { fontSize: 12, fontWeight: '600', color: DS.text2, marginBottom: 7 },
  input: {
    backgroundColor: DS.bg, borderWidth: 1, borderColor: DS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: DS.text,
  },
  inputErr:   { borderColor: DS.primary },
  inputMulti: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  fieldErr:   { fontSize: 11, color: DS.primary, marginTop: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: DS.border, backgroundColor: DS.bg,
  },
  chipSel:     { backgroundColor: DS.primary, borderColor: DS.primary },
  chipText:    { fontSize: 13, color: DS.text2, fontWeight: '500' },
  chipTextSel: { color: '#fff', fontWeight: '700' },

  footer: {
    padding: 16, paddingBottom: 28,
    backgroundColor: DS.surface, borderTopWidth: 1, borderTopColor: DS.border,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.primary, borderRadius: 14, paddingVertical: 15,
  },
  submitBtnOff:  { opacity: 0.4 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,10,12,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: DS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 28, paddingHorizontal: 24, paddingBottom: 36,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  badgeWrap: {
    width: 88, height: 88, alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  ring: {
    position: 'absolute', width: 76, height: 76, borderRadius: 38,
    backgroundColor: DS.primary,
  },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: DS.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  title: {
    fontSize: 22, fontWeight: '800', color: DS.text, marginBottom: 8, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: DS.text2, textAlign: 'center', lineHeight: 21, marginBottom: 22,
    paddingHorizontal: 4,
  },
  couponName: { color: DS.text, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', width: '100%',
    backgroundColor: DS.bg, borderRadius: 16, borderWidth: 1, borderColor: DS.border,
    paddingVertical: 14, marginBottom: 14,
  },
  statBlock: { flex: 1, alignItems: 'center' },
  statLabel: {
    fontSize: 9, fontWeight: '700', color: DS.text3, letterSpacing: 0.6, marginBottom: 4,
  },
  statValue: { fontSize: 15, fontWeight: '800', color: DS.text },
  statDivider: {
    position: 'absolute', left: '50%', top: '15%', bottom: '15%', width: 1, backgroundColor: DS.border,
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: DS.warningSoft, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7, marginBottom: 24,
  },
  statusPillText: { fontSize: 12, fontWeight: '700', color: DS.warning },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: DS.primary, borderRadius: 14, paddingVertical: 15, width: '100%',
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  doneBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
