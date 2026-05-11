import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../../core/constants/colors';

// ─── Types ─────────────────────────────────────────────────────────
interface ProfileRow {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
}

// ─── Main Screen ────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // clearAll() from secureStorage, then navigate
            router.replace('/(auth)/welcome');
          },
        },
      ],
    );
  };

  // ─── Section: ACCOUNT ───────────────────────────────────────────
  const accountRows: ProfileRow[] = [
    {
      id: 'profile',
      icon: 'person-outline',
      iconBg: '#E3F2FD',
      iconColor: '#1565C0',
      label: 'My Profile',
      subtitle: 'Edit your vendor info',
      onPress: () => router.push('/(main)/my-profile'),
    },
    {
      id: 'customer-history',
      icon: 'people-outline',
      iconBg: '#F3E5F5',
      iconColor: '#6A1B9A',
      label: 'Customer History',
      subtitle: 'View customer card & transactions',
     onPress: () => router.push('/(main)/customer_history'),

    },
  ];

  // ─── Section: PREFERENCES ───────────────────────────────────────
  const preferenceRows: ProfileRow[] = [
    {
      id: 'settings',
      icon: 'settings-outline',
      iconBg: '#E8F5E9',
      iconColor: '#2E7D32',
      label: 'Settings',
      subtitle: 'Notifications, language',
      onPress: () => router.push('/(main)/settings'),
    },
  ];

  // ─── Section: SUPPORT ───────────────────────────────────────────
  const supportRows: ProfileRow[] = [
    {
      id: 'help',
      icon: 'help-circle-outline',
      iconBg: '#FFF8E1',
      iconColor: '#F57F17',
      label: 'Help',
      subtitle: 'FAQs and support',
      onPress: () => {},
    },
    {
      id: 'terms',
      icon: 'document-text-outline',
      iconBg: '#FCE4EC',
      iconColor: '#880E4F',
      label: 'Terms and Conditions',
      subtitle: 'Read our terms',
      onPress: () => {},
    },
  ];

  const renderRow = (row: ProfileRow) => (
    <TouchableOpacity
      key={row.id}
      style={styles.row}
      onPress={row.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: row.iconBg }]}>
        <Ionicons name={row.icon} size={20} color={row.iconColor} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowLabel}>{row.label}</Text>
        {row.subtitle && <Text style={styles.rowSubtitle}>{row.subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgWarm} />

      {/* ── Header ── */}
      <SafeAreaView style={styles.header}>
        {/* Wavy decoration circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        {/* Store avatar */}
        <View style={styles.storeAvatarWrap}>
          <View style={styles.storeAvatar}>
            <Ionicons name="storefront-outline" size={32} color="#1565C0" />
          </View>
        </View>
        <Text style={styles.vendorName}>Sri Raghava Curry Point</Text>
      </SafeAreaView>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {/* ── ACCOUNT ── */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          {accountRows.map((row, idx) => (
            <View key={row.id}>
              {renderRow(row)}
              {idx < accountRows.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* ── PREFERENCES ── */}
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.card}>
          {preferenceRows.map((row, idx) => (
            <View key={row.id}>
              {renderRow(row)}
              {idx < preferenceRows.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* ── SUPPORT ── */}
        <Text style={styles.sectionTitle}>SUPPORT</Text>
        <View style={styles.card}>
          {supportRows.map((row, idx) => (
            <View key={row.id}>
              {renderRow(row)}
              {idx < supportRows.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.primary} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgWarm },

  // ── Header ──
  header: {
    backgroundColor: Colors.bgWarm,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute', width: 180, height: 180,
    borderRadius: 90, backgroundColor: Colors.circleLight,
    top: -60, right: -40, opacity: 0.5,
  },
  decorCircle2: {
    position: 'absolute', width: 120, height: 120,
    borderRadius: 60, backgroundColor: Colors.circleMid,
    top: -20, right: 60, opacity: 0.3,
  },
  storeAvatarWrap: { marginBottom: 12 },
  storeAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  vendorName: {
    fontSize: 18, fontWeight: '800', color: Colors.textDark,
    textAlign: 'center',
  },

  // ── Sheet ──
  sheet: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },

  // ── Section ──
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 1.2, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },

  // ── Row ──
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  rowIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTextWrap:  { flex: 1 },
  rowLabel:     { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  rowSubtitle:  { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  rowDivider:   { height: 1, backgroundColor: '#F5F5F5', marginLeft: 70 },

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.bgWarm,
    borderRadius: 20, paddingVertical: 16,
    borderWidth: 1, borderColor: '#F2CCBB',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
});