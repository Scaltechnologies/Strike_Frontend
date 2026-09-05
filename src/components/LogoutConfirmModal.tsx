import { View, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';

const DS = {
  surface: '#FFFFFF', border: '#EAECEF',
  text: '#1A1A1A', text2: '#5A6272',
  error: '#DC2626', errorSoft: '#FFF1F1',
};

interface LogoutConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmModal({ visible, onCancel, onConfirm }: LogoutConfirmModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onCancel} activeOpacity={1} />
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <Ionicons name="log-out-outline" size={30} color={DS.error} />
          </View>
          <Text style={styles.title}>Logout</Text>
          <Text style={styles.subtitle}>Are you sure you want to logout of your vendor account?</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.75}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={onConfirm} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={16} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: DS.surface,
    borderRadius: 24, paddingTop: 28, paddingHorizontal: 22, paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  iconBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: DS.errorSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title:    { fontSize: 19, fontWeight: '800', color: DS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: DS.text2, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  actions:  { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: DS.border,
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: DS.text },
  logoutBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14, backgroundColor: DS.error,
    shadowColor: DS.error, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  logoutText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
