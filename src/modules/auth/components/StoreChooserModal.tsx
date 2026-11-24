// Shown after a correct PIN when the number can open two stores: its own (as
// owner) and another one it manages. Same PIN for both — the person just picks.

import { View, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import type { RoleOption, SessionActor } from '../types/auth.types';

const DS = {
  surface: '#FFFFFF', bg: '#F6F7FA', border: '#EAECEF',
  primary: '#CC2200', primarySoft: '#FFF0EE',
  info: '#2563EB', infoSoft: '#EEF4FF',
  text: '#1A1A1A', text2: '#5A6272', text3: '#9BA3AF',
};

interface StoreChooserModalProps {
  visible: boolean;
  options: RoleOption[];
  // Role currently being signed into (shows a spinner on that row).
  pending?: SessionActor | null;
  error?: string | null;
  onChoose: (role: SessionActor) => void;
  onCancel: () => void;
}

export default function StoreChooserModal({
  visible, options, pending, error, onChoose, onCancel,
}: StoreChooserModalProps) {
  const busy = !!pending;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => { if (!busy) onCancel(); }}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { if (!busy) onCancel(); }} activeOpacity={1} />
        <View style={styles.card}>
          <Text style={styles.title}>Which store do you want to open?</Text>
          <Text style={styles.subtitle}>
            Your number has access to more than one store. You can switch any time from Profile.
          </Text>

          {options.map(opt => {
            const isOwner = opt.role === 'OWNER';
            return (
              <TouchableOpacity
                key={opt.role}
                style={styles.option}
                onPress={() => onChoose(opt.role)}
                disabled={busy}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${opt.title}, ${opt.subtitle}`}
              >
                <View style={[styles.optionIcon, { backgroundColor: isOwner ? DS.primarySoft : DS.infoSoft }]}>
                  <Ionicons
                    name={isOwner ? 'storefront' : 'people'}
                    size={20}
                    color={isOwner ? DS.primary : DS.info}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle} numberOfLines={1}>{opt.title}</Text>
                  <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                </View>
                {pending === opt.role
                  ? <ActivityIndicator size="small" color={DS.primary} />
                  : <Ionicons name="chevron-forward" size={18} color={DS.text3} />}
              </TouchableOpacity>
            );
          })}

          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color={DS.primary} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={busy} activeOpacity={0.75}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: DS.surface,
    borderRadius: 24, paddingTop: 24, paddingHorizontal: 18, paddingBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  title:    { fontSize: 18, fontWeight: '800', color: DS.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: DS.text2, lineHeight: 19, marginBottom: 16 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: DS.bg, borderWidth: 1, borderColor: DS.border,
    borderRadius: 16, padding: 14, marginBottom: 10, minHeight: 64,
  },
  optionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionTitle:    { fontSize: 15, fontWeight: '700', color: DS.text },
  optionSubtitle: { fontSize: 12, color: DS.text2, marginTop: 2 },
  errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2, marginBottom: 8 },
  errorText: { fontSize: 13, color: DS.primary, flex: 1 },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 2 },
  cancelText: { fontSize: 15, fontWeight: '700', color: DS.text2 },
});
