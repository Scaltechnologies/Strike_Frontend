// src/modules/store/components/BannerPicker.tsx
// Tap-to-pick store banner image, reused by the registration form and Store Settings.
// Picking is local only (returns a device file URI via onPick) — callers decide
// whether/when to upload it (registration defers upload until the vendor is
// authenticated; Store Settings uploads immediately).

import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

// Modern phone cameras produce multi-MB, multi-thousand-pixel-wide photos —
// far more than a banner needs. Downscaling client-side keeps the upload
// small enough to finish reliably on slow connections and stay under the
// backend's request-size limit.
const MAX_BANNER_WIDTH = 1280;

const DS = {
  bg:      '#F6F7FA',
  border:  '#EAECEF',
  primary: '#CC2200',
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
        // ImagePicker's `quality` only controls JPEG compression — a photo straight
        // off a modern camera can still be several thousand pixels wide. Downscale
        // it here so the upload stays small and finishes reliably.
        const actions = asset.width > MAX_BANNER_WIDTH
          ? [{ resize: { width: MAX_BANNER_WIDTH } }]
          : [];
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          actions,
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
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
          <Image source={{ uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={28} color={DS.text3} />
            <Text style={styles.placeholderText}>Add Store Banner</Text>
          </View>
        )}

        {(uploading || requesting) && (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" />
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
    borderRadius: 14,
    backgroundColor: DS.bg,
    borderWidth: 1.5,
    borderColor: DS.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  placeholderText: { fontSize: 13, fontWeight: '600', color: DS.text3 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute', right: 10, bottom: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: DS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  removeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 8 },
  removeText: { fontSize: 12, fontWeight: '600', color: DS.primary },
});
