import { useState, useCallback } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearAll } from '../../../core/storage/secureStorage';
import { deregisterCurrentPushToken } from '../../../modules/notifications/push/pushRegistration';
import { resetNotificationStore } from '../../../modules/notifications/store/notificationStore';
import {
  getVendorProfile,
  getVendorProfileStatus,
} from '../../../modules/vendor/services/vendorProfileService';
import { getMyCards } from '../../../modules/cards/services/cardService';
import { getMyStore } from '../../../modules/store/services/storeService';
import type {
  VendorProfileResponse,
  VendorProfileStatus,
} from '../../../modules/vendor/types/vendor.types';
import type { StoreStatus } from '../../../modules/store/types/store.types';
import { SkeletonBlock } from '../../../components/Skeleton';
import FadeIn from '../../../components/FadeIn';

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
  errorSoft:   '#FFF1F1',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  text3:       '#9BA3AF',
};

function statusStyle(s: string): { bg: string; fg: string } {
  if (s === 'ACTIVE')                       return { bg: DS.successSoft, fg: DS.success };
  if (s === 'SUSPENDED' || s === 'REJECTED') return { bg: DS.errorSoft,   fg: DS.error   };
  return { bg: DS.warningSoft, fg: DS.warning };
}

function storeStatusMeta(s: StoreStatus | null): { label: string; color: string } {
  if (s === 'ACTIVE')             return { label: 'Open',   color: DS.success };
  if (s === 'TEMPORARILY_CLOSED') return { label: 'Closed', color: DS.warning };
  if (s === 'INACTIVE')           return { label: 'Inactive', color: DS.text3 };
  return { label: '—', color: DS.text3 };
}

interface NavRowDef {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
}

function ProfileSkeleton() {
  return (
    <FadeIn>
      <View style={styles.heroZone}>
        <SkeletonBlock w={80} h={80} radius={40} style={{ marginBottom: 14 }} />
        <SkeletonBlock w={160} h={20} radius={6} style={{ marginBottom: 8 }} />
        <SkeletonBlock w={110} h={13} radius={6} />
      </View>
      <View style={styles.statsRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={styles.statCard}>
            <SkeletonBlock w={36} h={18} radius={5} style={{ marginBottom: 6 }} />
            <SkeletonBlock w={48} h={9}  radius={4} />
          </View>
        ))}
      </View>
    </FadeIn>
  );
}

function Section({ title, rows }: { title: string; rows: NavRowDef[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionCard}>
        {rows.map((row, idx) => (
          <View key={row.id}>
            <TouchableOpacity
              style={[styles.navRow, row.disabled && styles.navRowDisabled]}
              onPress={row.onPress}
              activeOpacity={row.disabled ? 1 : 0.7}
              disabled={row.disabled}
            >
              <View style={styles.navRowIcon}>
                <Ionicons name={row.icon} size={19} color={row.disabled ? DS.text3 : DS.text2} />
              </View>
              <View style={styles.navRowBody}>
                <Text style={[styles.navRowLabel, row.disabled && { color: DS.text3 }]}>
                  {row.label}
                </Text>
                {!!row.subtitle && (
                  <Text style={styles.navRowSub}>{row.subtitle}</Text>
                )}
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={row.disabled ? DS.border : DS.text3}
              />
            </TouchableOpacity>
            {idx < rows.length - 1 && <View style={styles.rowDivider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const [profile, setProfile]         = useState<VendorProfileResponse | null>(null);
  const [vstatus, setVstatus]         = useState<VendorProfileStatus | null>(null);
  const [activeCards, setActiveCards] = useState<number | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [p, s, cards, store] = await Promise.all([
        getVendorProfile(),
        getVendorProfileStatus(),
        getMyCards(),
        getMyStore().catch(() => null),
      ]);
      setProfile(p);
      setVstatus(s);
      setActiveCards(cards.filter(c => c.isActive).length);
      setStoreStatus(store?.status ?? null);
    } catch {
      // profile degrades gracefully — logout still works
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try { await deregisterCurrentPushToken(); } catch { /* best-effort, never blocks logout */ }
          resetNotificationStore();
          await clearAll();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const shopName = profile?.shopName ?? '';
  const initials = shopName.split(' ').slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || 'V';
  const sc = statusStyle(vstatus?.status ?? '');

  const businessRows: NavRowDef[] = [
    {
      id: 'wallet',
      icon: 'wallet-outline',
      label: 'Wallet',
      subtitle: 'Balance, payouts, and withdrawal requests',
      onPress: () => router.push('/(main)/wallet'),
    },
    {
      id: 'cards',
      icon: 'card-outline',
      label: 'My Cards',
      subtitle: 'Create and manage loyalty cards',
      onPress: () => router.push('/(main)/cards'),
    },
    {
      id: 'subscriptions',
      icon: 'people-outline',
      label: 'Store Subscriptions',
      subtitle: 'View all active customer subscriptions',
      onPress: () => router.push('/(main)/store-subscriptions'),
    },
    {
      id: 'redemption-history',
      icon: 'receipt-outline',
      label: 'Redemption History',
      subtitle: 'View all processed redemptions',
      onPress: () => router.push('/(main)/redemption-history'),
    },
    {
      id: 'my-coupons',
      icon: 'pricetag-outline',
      label: 'My Coupons',
      subtitle: 'View discount coupons available for your store',
      onPress: () => router.push('/(main)/my-coupons'),
    },
  ];

  const accountRows: NavRowDef[] = [
    {
      id: 'my-profile',
      icon: 'person-circle-outline',
      label: 'My Profile',
      subtitle: 'Edit name, email, and business info',
      onPress: () => router.push('/(main)/my-profile'),
    },
    {
      id: 'store-settings',
      icon: 'storefront-outline',
      label: 'Store Settings',
      subtitle: 'Hours, holidays, and location',
      onPress: () => router.push('/(main)/store-settings'),
    },
  ];

  const supportRows: NavRowDef[] = [
    {
      id: 'help',
      icon: 'help-circle-outline',
      label: 'Help & Support',
      subtitle: 'FAQs and contact us',
      onPress: () => {},
    },
    {
      id: 'terms',
      icon: 'document-text-outline',
      label: 'Terms & Conditions',
      onPress: () => {},
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            colors={[DS.primary]}
            tintColor={DS.primary}
          />
        }
      >
        {loading ? (
          <View style={{ paddingTop: insets.top + 24 }}>
            <ProfileSkeleton />
          </View>
        ) : (
          <FadeIn>
            {/* Avatar / hero section */}
            <View style={[styles.heroZone, { paddingTop: insets.top + 24 }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={styles.shopName} numberOfLines={1}>
                {shopName || 'My Store'}
              </Text>
              {!!profile?.ownerName && (
                <Text style={styles.ownerName} numberOfLines={1}>{profile.ownerName}</Text>
              )}
              {!!vstatus && (
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: sc.fg }]} />
                  <Text style={[styles.statusBadgeText, { color: sc.fg }]}>
                    {vstatus.status}
                  </Text>
                </View>
              )}
            </View>

            {/* Stats strip */}
            {!!vstatus && (
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{vstatus.commissionRate}%</Text>
                  <Text style={styles.statLabel}>COMMISSION</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: DS.success }]}>
                    {activeCards ?? '—'}
                  </Text>
                  <Text style={styles.statLabel}>CARDS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                  {(() => {
                    const sm = storeStatusMeta(storeStatus);
                    return (
                      <>
                        <Text style={[styles.statValue, { color: sm.color }]}>{sm.label}</Text>
                        <Text style={styles.statLabel}>STORE</Text>
                      </>
                    );
                  })()}
                </View>
              </View>
            )}
          </FadeIn>
        )}

        {/* Nav sections */}
        <View style={styles.sectionsWrap}>
          <Section title="BUSINESS"  rows={businessRows} />
          <Section title="ACCOUNT"   rows={accountRows}  />
          <Section title="SUPPORT"   rows={supportRows}  />

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={DS.primary} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: DS.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 0 },

  // Hero
  heroZone: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: DS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  avatarText:  { fontSize: 30, fontWeight: '900', color: '#fff' },
  shopName:    { fontSize: 22, fontWeight: '800', color: DS.text, textAlign: 'center' },
  ownerName:   { fontSize: 14, color: DS.text2, marginTop: 4, textAlign: 'center' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    marginTop: 12,
  },
  statusDot:       { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DS.surface, marginHorizontal: 16,
    borderRadius: 16, borderWidth: 1, borderColor: DS.border,
    marginBottom: 24, overflow: 'hidden',
  },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
  },
  statValue:   { fontSize: 20, fontWeight: '800', color: DS.primary, marginBottom: 3 },
  statLabel:   { fontSize: 10, fontWeight: '700', color: DS.text3, letterSpacing: 0.5 },
  statDivider: { width: 1, height: 44, backgroundColor: DS.border },

  // Sections
  sectionsWrap:  { paddingHorizontal: 16 },
  section:       { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: DS.text3,
    letterSpacing: 1.2, marginBottom: 8, marginLeft: 4,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: DS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: DS.border, overflow: 'hidden',
  },

  // Nav row
  navRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  navRowDisabled: { opacity: 0.45 },
  navRowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: DS.bg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  navRowBody:  { flex: 1 },
  navRowLabel: { fontSize: 15, fontWeight: '600', color: DS.text },
  navRowSub:   { fontSize: 12, color: DS.text3, marginTop: 2 },
  rowDivider:  { height: 1, backgroundColor: DS.border, marginLeft: 64 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: DS.surface,
    borderRadius: 16, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#F2CCBB',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: DS.primary },
});
