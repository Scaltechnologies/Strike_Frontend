import {
  View, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Text from '../../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearAll } from '../../core/storage/secureStorage';

const DS = {
  bg:          '#F6F7FA',
  surface:     '#FFFFFF',
  border:      '#EAECEF',
  primary:     '#CC2200',
  text:        '#1A1A1A',
  text2:       '#5A6272',
  warning:     '#D97706',
  warningSoft: '#FFFBEB',
};

export default function PendingApprovalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await clearAll();
    router.replace('/(auth)/welcome');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={DS.bg} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="time-outline" size={44} color={DS.warning} />
        </View>

        <Text style={styles.title}>Pending Approval</Text>
        <Text style={styles.subtitle}>
          Your store registration is under review. Our team will activate your account shortly.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="notifications-outline" size={18} color={DS.warning} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>You'll be notified</Text>
              <Text style={styles.infoDesc}>
                We'll send you an alert as soon as your store is approved.
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="alarm-outline" size={18} color={DS.warning} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Estimated review time</Text>
              <Text style={styles.infoDesc}>
                Most accounts are reviewed within 1–2 business days.
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={18} color={DS.warning} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Contact support</Text>
              <Text style={styles.infoDesc}>
                If you have questions, reach us at support@strike.in
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color={DS.primary} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: DS.bg },
  content: { alignItems: 'center', paddingHorizontal: 24 },

  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: DS.warningSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1.5, borderColor: '#FDE68A',
  },

  title: {
    fontSize: 24, fontWeight: '800', color: DS.text,
    marginBottom: 10, textAlign: 'center',
  },
  subtitle: {
    fontSize: 15, color: DS.text2, textAlign: 'center',
    lineHeight: 22, marginBottom: 32, maxWidth: 320,
  },

  infoCard: {
    backgroundColor: DS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: DS.border,
    padding: 20, width: '100%', marginBottom: 32,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: DS.warningSoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  infoText:  { flex: 1, paddingTop: 2 },
  infoLabel: { fontSize: 14, fontWeight: '700', color: DS.text, marginBottom: 3 },
  infoDesc:  { fontSize: 13, color: DS.text2, lineHeight: 18 },
  infoDivider: { height: 1, backgroundColor: DS.border, marginVertical: 16 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderColor: '#F2CCBB',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32,
    backgroundColor: DS.surface,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: DS.primary },
});
