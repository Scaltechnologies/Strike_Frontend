import { useState, useCallback } from 'react';
import {
  View, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchRedemptionById } from '../../modules/redemption/services/redemptionService';
import type { RedemptionRequest, RedemptionStatus } from '../../modules/redemption/services/redemptionService';
import { useRedemption } from '../../modules/redemption/store/RedemptionContext';

// ─── Design tokens ───────────────────────────────────────────────────
const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  primarySoft: '#FFF0EE',
  success:     '#16A34A',
  successSoft: '#F0FDF4',
  warning:     '#D97706',
  warningSoft: '#FFFBEB',
  error:       '#DC2626',
  errorSoft:   '#FEF2F2',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

// ─── Helpers ─────────────────────────────────────────────────────────
function statusMeta(status: RedemptionStatus) {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending', color: DS.warning, bg: DS.warningSoft,
        icon: 'time-outline' as const, desc: 'Awaiting vendor action',
      };
    case 'completed':
      return {
        label: 'Approved', color: DS.success, bg: DS.successSoft,
        icon: 'checkmark-circle-outline' as const, desc: 'Benefit approved and processed',
      };
    case 'rejected':
      return {
        label: 'Rejected', color: DS.error, bg: DS.errorSoft,
        icon: 'close-circle-outline' as const, desc: 'Request was declined',
      };
    case 'failed':
      return {
        label: 'Failed', color: DS.error, bg: DS.errorSoft,
        icon: 'alert-circle-outline' as const, desc: 'Processing failed',
      };
    case 'reversed':
      return {
        label: 'Reversed', color: DS.text3, bg: DS.bg,
        icon: 'refresh-outline' as const, desc: 'Redemption was reversed',
      };
    default:
      return {
        label: 'Unknown', color: DS.text3, bg: DS.bg,
        icon: 'help-circle-outline' as const, desc: '',
      };
  }
}

// ─── Section & Row components ─────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value, valueColor, last = false }: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor, fontWeight: '700' } : {}]} numberOfLines={3}>
          {value}
        </Text>
      </View>
      {!last && <View style={styles.infoRowDivider} />}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────
export default function RedemptionDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { approveRedemption, rejectRedemption } = useRedemption();

  const [redemption, setRedemption]         = useState<RedemptionRequest | null>(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [errorStatus, setErrorStatus]       = useState<number | null>(null);
  const [processing, setProcessing]         = useState(false);
  const [approveVisible, setApproveVisible] = useState(false);
  const [rejectVisible, setRejectVisible]   = useState(false);
  const [rejectReason, setRejectReason]     = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const data = await fetchRedemptionById(id);
      setRedemption(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load redemption');
      setErrorStatus(e?.status ?? null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleApprove = async () => {
    if (!redemption || processing) return;
    setApproveVisible(false);
    setProcessing(true);
    try {
      // Context calls backend then reloads queue + history globally
      await approveRedemption(redemption.id);
      // Reload this detail from backend so status reflects truth
      const updated = await fetchRedemptionById(redemption.id);
      setRedemption(updated);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to approve');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!redemption || processing) return;
    const reason = rejectReason.trim();
    setRejectVisible(false);
    setRejectReason('');
    setProcessing(true);
    try {
      await rejectRedemption(redemption.id, reason || undefined);
      const updated = await fetchRedemptionById(redemption.id);
      setRedemption(updated);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to reject');
    } finally {
      setProcessing(false);
    }
  };

  const meta = redemption ? statusMeta(redemption.status) : null;
  const isPending = redemption?.status === 'pending';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.surface} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={DS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Redemption Details</Text>
            {!!id && <Text style={styles.pageSubtitle}>ID #{id}</Text>}
          </View>
          {meta && (
            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={DS.primary} size="large" />
          <Text style={styles.centerText}>Loading details…</Text>
        </View>
      ) : error ? (
        errorStatus === 404 ? (
          <View style={styles.centerWrap}>
            <Ionicons name="receipt-outline" size={48} color={DS.text3} />
            <Text style={styles.errorTitle}>Redemption Not Found</Text>
            <Text style={styles.errorDesc}>
              This redemption may have already been processed or removed.{'\n'}
              It may still be visible in a list that hasn't refreshed yet.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
              <Text style={styles.retryText}>Back to List</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.centerWrap}>
            <Ionicons name="cloud-offline-outline" size={48} color={DS.text3} />
            <Text style={styles.errorTitle}>Could not load</Text>
            <Text style={styles.errorDesc}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )
      ) : redemption ? (
        <>
          {/* Status banner */}
          {meta && (
            <View style={[styles.statusBanner, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
              <Text style={[styles.statusBannerText, { color: meta.color }]}>
                {meta.desc}
              </Text>
            </View>
          )}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + (isPending ? 100 : 32) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero — the numbers a vendor needs first, at a glance */}
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroCardBadge}>
                  <Ionicons name="card-outline" size={13} color={DS.primary} />
                  <Text style={styles.heroCardBadgeText} numberOfLines={1}>{redemption.cardName}</Text>
                </View>
                <Text style={styles.heroId}>#{redemption.id}</Text>
              </View>

              <Text style={styles.heroValueLabel}>TOTAL VALUE</Text>
              <Text style={styles.heroValue}>₹{redemption.totalValue.toLocaleString('en-IN')}</Text>

              <View style={styles.heroDivider} />

              <View style={styles.heroFootRow}>
                <View style={styles.heroFootItem}>
                  <Ionicons name="person-circle-outline" size={16} color={DS.text2} />
                  <Text style={styles.heroFootText} numberOfLines={1}>{redemption.customer}</Text>
                </View>
                <View style={styles.heroFootItem}>
                  <Ionicons name="bag-outline" size={16} color={DS.text2} />
                  <Text style={styles.heroFootText}>
                    {redemption.totalUnits} item{redemption.totalUnits !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.heroFootItem}>
                  <Ionicons name="time-outline" size={16} color={DS.text2} />
                  <Text style={styles.heroFootText}>{redemption.timeAgo}</Text>
                </View>
              </View>
            </View>

            {/* Items — quantity bubble + computed line total, so the math
                behind the total value is easy to verify at a glance */}
            <Section title="ITEMS">
              {redemption.items.map((item, idx) => {
                const lineTotal = item.unitPrice != null ? item.unitPrice * item.qty : undefined;
                return (
                  <View key={item.id}>
                    <View style={styles.itemRow}>
                      <View style={styles.qtyBubble}>
                        <Text style={styles.qtyBubbleText}>{item.qty}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.unitPrice != null && (
                          <Text style={styles.itemUnitPrice}>₹{item.unitPrice} each</Text>
                        )}
                      </View>
                      {lineTotal != null && (
                        <Text style={styles.itemLineTotal}>₹{lineTotal.toLocaleString('en-IN')}</Text>
                      )}
                    </View>
                    {idx !== redemption.items.length - 1 && <View style={styles.infoRowDivider} />}
                  </View>
                );
              })}
            </Section>

            {/* Details — reference metadata, kept compact since it's not
                what drives the approve/reject decision */}
            <Section title="DETAILS">
              <InfoRow label="Requested On" value={redemption.orderedAt} />
              {redemption.processedAt && (
                <InfoRow label="Processed On" value={redemption.processedAt} />
              )}
              <InfoRow label="Initiated By" value={redemption.customer} last />
            </Section>
          </ScrollView>

          {/* Action bar for pending */}
          {isPending && (
            <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={styles.rejectBar}
                onPress={() => setRejectVisible(true)}
                activeOpacity={0.8}
                disabled={processing}
              >
                <Ionicons name="close-circle-outline" size={18} color={DS.primary} />
                <Text style={styles.rejectBarText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBar, processing && { opacity: 0.7 }]}
                onPress={() => setApproveVisible(true)}
                activeOpacity={0.85}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.approveBarText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : null}

      {/* Approve confirmation modal */}
      <Modal
        visible={approveVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setApproveVisible(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setApproveVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={[styles.modalIconCircle, { backgroundColor: DS.successSoft, borderColor: '#A3D9B4' }]}>
              <Ionicons name="shield-checkmark-outline" size={36} color={DS.success} />
            </View>

            <Text style={styles.modalTitle}>Approve Redemption?</Text>
            <Text style={styles.modalSubtitle}>
              The customer will be allowed to consume this benefit.{'\n'}This action cannot be undone.
            </Text>

            {redemption && (
              <View style={styles.modalSummary}>
                {[
                  { label: 'Customer',    value: redemption.customer },
                  { label: 'Items',       value: `${redemption.totalUnits} item${redemption.totalUnits !== 1 ? 's' : ''}` },
                  { label: 'Total Value', value: `₹${redemption.totalValue.toLocaleString('en-IN')}` },
                ].map((row, i, arr) => (
                  <View key={row.label}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{row.label}</Text>
                      <Text style={[
                        styles.summaryValue,
                        i === arr.length - 1 && { color: DS.success, fontWeight: '800', fontSize: 15 },
                      ]}>
                        {row.value}
                      </Text>
                    </View>
                    {i < arr.length - 1 && <View style={styles.summaryDivider} />}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setApproveVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveModalBtn}
                onPress={handleApprove}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.approveModalText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject confirmation modal */}
      <Modal
        visible={rejectVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRejectVisible(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setRejectVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={[styles.modalIconCircle, { backgroundColor: DS.errorSoft, borderColor: '#FECACA' }]}>
              <Ionicons name="close-circle-outline" size={36} color={DS.error} />
            </View>

            <Text style={styles.modalTitle}>Reject Redemption?</Text>
            <Text style={styles.modalSubtitle}>
              {redemption?.customer
                ? `Decline the request from ${redemption.customer}.`
                : 'The request will be declined.'}
            </Text>

            <View style={styles.reasonWrap}>
              <Text style={styles.reasonLabel}>Reason (optional)</Text>
              <TextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Enter reason for rejection…"
                placeholderTextColor={DS.text3}
                style={styles.reasonInput}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRejectVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectModalBtn}
                onPress={handleReject}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle" size={18} color="#fff" />
                <Text style={styles.rejectModalText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.bg },

  // Header
  header: {
    backgroundColor: DS.surface,
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: DS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 3,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: DS.bg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: DS.border, flexShrink: 0,
  },
  pageTitle:    { fontSize: 18, fontWeight: '800', color: DS.text },
  pageSubtitle: { fontSize: 12, color: DS.text3, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexShrink: 0,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },

  // Status banner (below header)
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  statusBannerText: { fontSize: 13, fontWeight: '600' },

  // Center states
  centerWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32,
  },
  centerText:  { fontSize: 14, color: DS.text2 },
  errorTitle:  { fontSize: 16, fontWeight: '700', color: DS.text2 },
  errorDesc:   { fontSize: 13, color: DS.text3, textAlign: 'center', lineHeight: 20 },
  retryBtn:    { marginTop: 4, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: DS.primary },
  retryText:   { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Hero — total value + at-a-glance context
  heroCard: {
    backgroundColor: DS.primarySoft, borderRadius: 18,
    borderWidth: 1, borderColor: '#F5C6BC',
    padding: 18, marginBottom: 20,
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16, gap: 8,
  },
  heroCardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, flexShrink: 1,
  },
  heroCardBadgeText: { fontSize: 12, fontWeight: '700', color: DS.primary },
  heroId: { fontSize: 12, color: DS.text3, fontWeight: '600', flexShrink: 0 },
  heroValueLabel: { fontSize: 11, fontWeight: '700', color: DS.text3, letterSpacing: 1, marginBottom: 4 },
  heroValue:      { fontSize: 34, fontWeight: '900', color: DS.text, marginBottom: 16 },
  heroDivider:    { height: 1, backgroundColor: '#F5C6BC', marginBottom: 14 },
  heroFootRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  heroFootItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  heroFootText: { fontSize: 13, color: DS.text2, fontWeight: '600' },

  // Item rows — qty bubble + name + computed line total
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  qtyBubble: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: DS.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  qtyBubbleText:  { fontSize: 14, fontWeight: '800', color: DS.text2 },
  itemName:       { fontSize: 14, fontWeight: '700', color: DS.text },
  itemUnitPrice:  { fontSize: 12, color: DS.text3, marginTop: 2 },
  itemLineTotal:  { fontSize: 14, fontWeight: '800', color: DS.text, flexShrink: 0 },

  // Sections
  section:      { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: DS.text3,
    letterSpacing: 1.2, marginBottom: 8, marginLeft: 4,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: DS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: DS.border, overflow: 'hidden',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 16,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  infoLabel:      { fontSize: 13, color: DS.text2, fontWeight: '500', flexShrink: 0, maxWidth: '45%' },
  infoValue:      { fontSize: 14, fontWeight: '600', color: DS.text, flex: 1, textAlign: 'right' },
  infoRowDivider: { height: 1, backgroundColor: DS.border, marginHorizontal: 16 },

  // Action bar
  actionBar: {
    flexDirection: 'row', gap: 12,
    backgroundColor: DS.surface,
    paddingHorizontal: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: DS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 8,
  },
  rejectBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderColor: DS.primary, borderRadius: 14, paddingVertical: 14,
  },
  rejectBarText: { fontSize: 15, fontWeight: '700', color: DS.primary },
  approveBar: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.success, borderRadius: 14, paddingVertical: 14,
    shadowColor: DS.success, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  approveBarText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: DS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: DS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalIconCircle: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: 16,
  },
  modalTitle:    { fontSize: 22, fontWeight: '800', color: DS.text, marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: DS.text2, textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  // Summary in approve modal
  modalSummary: {
    width: '100%', backgroundColor: DS.bg,
    borderRadius: 16, marginBottom: 24,
    borderWidth: 1, borderColor: DS.border, overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 8,
  },
  summaryLabel:   { fontSize: 13, color: DS.text2, fontWeight: '500' },
  summaryValue:   { fontSize: 14, fontWeight: '700', color: DS.text, textAlign: 'right', flex: 1 },
  summaryDivider: { height: 1, backgroundColor: DS.border },

  // Modal actions
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: DS.border,
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: DS.text2 },
  approveModalBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.success, borderRadius: 14, paddingVertical: 14,
    shadowColor: DS.success, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  approveModalText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  rejectModalBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.error, borderRadius: 14, paddingVertical: 14,
    shadowColor: DS.error, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  rejectModalText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Reason input
  reasonWrap:  { width: '100%', marginBottom: 20 },
  reasonLabel: { fontSize: 13, fontWeight: '600', color: DS.text2, marginBottom: 8, alignSelf: 'flex-start' },
  reasonInput: {
    width: '100%',
    backgroundColor: DS.bg, borderRadius: 12,
    borderWidth: 1, borderColor: DS.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: DS.text, minHeight: 80,
  },
});
