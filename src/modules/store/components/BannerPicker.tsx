// src/modules/store/components/BannerPicker.tsx
// Tap-to-pick store banner image, reused by the registration form and Store Settings.
// Picking is local only (returns a device file URI via onPick) — callers decide
// whether/when to upload it (registration defers upload until the vendor is
// authenticated; Store Settings uploads immediately).

import { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

// A banner is shown at moderate on-screen size, never full camera resolution —
// downscaling client-side keeps the upload small enough to finish reliably on
// slow connections and stay under the backend's ~1MB request-body limit
// (confirmed against the live API — a request over that can have its
// connection dropped mid-upload, which surfaces as a bare network failure
// rather than a clean error).
const MAX_BANNER_WIDTH = 960;

const DS = {
  bg:      '#F6F7FA',
  border:  '#EAECEF',
  primary: '#CC2200',
  primarySoft: '#FFF0EE',
  text2:   '#5A6272',
  text3:   '#9BA3AF',
};

interface BannerPickerProps {
  uri: string | null;
  onPick: (uri: string) => void;
  onRemove?: () => void;
  uploading?: boolean;
  label?: string;
}

export default function BannerPicker({ uri, onPick, onRemove, uploading, label }: BannerPickerProps) {
  const [requesting, setRequesting] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (uri) {
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    }
  }, [uri, fade]);

  const pick = async () => {
    if (uploading || requesting) return;
    try {
      setRequesting(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Allow photo library access to set a store banner.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        // Always resize (not just when already above the cap) — a busy,
        // detailed photo can still produce a large JPEG even at a modest
        // resolution, so re-encoding at a controlled quality every time
        // keeps the upload size predictable.
        const targetWidth = Math.min(asset.width, MAX_BANNER_WIDTH);
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: targetWidth } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
        );
        onPick(manipulated.uri);
      }
    } catch {
      Alert.alert('Error', 'Could not open photo library.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.banner}
        onPress={pick}
        activeOpacity={0.85}
        disabled={uploading || requesting}
      >
        {uri ? (
          <>
            <Animated.Image source={{ uri }} style={[styles.image, { opacity: fade }]} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.45)']}
              style={styles.imageShade}
              pointerEvents="none"
            />
          </>
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIconWrap}>
              <Ionicons name="image-outline" size={22} color={DS.primary} />
            </View>
            <Text style={styles.placeholderTitle}>Add Store Banner</Text>
            <Text style={styles.placeholderSub}>The first thing customers see</Text>
          </View>
        )}

        {(uploading || requesting) && (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.overlayText}>{uploading ? 'Uploading…' : 'Opening gallery…'}</Text>
          </View>
        )}

        {!uploading && !requesting && (
          <View style={styles.editBadge}>
            <Ionicons name={uri ? 'camera' : 'add'} size={16} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      {!!uri && !!onRemove && !uploading && (
        <TouchableOpacity onPress={onRemove} style={styles.removeRow} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={13} color={DS.primary} />
          <Text style={styles.removeText}>Remove banner</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', color: DS.text2, marginBottom: 7 },
  banner: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: DS.bg,
    borderWidth: 1.5,
    borderColor: DS.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  image: { width: '100%', height: '100%' },
  imageShade: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%',
  },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 5 },
  placeholderIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: DS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  placeholderTitle: { fontSize: 14, fontWeight: '700', color: DS.text2 },
  placeholderSub:   { fontSize: 12, color: DS.text3 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  overlayText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  editBadge: {
    position: 'absolute', right: 10, bottom: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: DS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  removeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 8 },
  removeText: { fontSize: 12, fontWeight: '600', color: DS.primary },
});
