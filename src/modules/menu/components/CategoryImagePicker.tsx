// src/modules/menu/components/CategoryImagePicker.tsx
// Tap-to-pick circular category image, used by the vendor's Add/Edit Category
// form. Picking is local only (returns a device file URI via onPick) — the
// caller decides when to upload it (only after the category itself is saved,
// since the upload endpoint needs a categoryId).

import { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

// A category icon is displayed small (circular thumbnail) — no need to keep
// more than this many pixels across, so downscale before upload. Kept well
// under the backend's nginx client_max_body_size (~1MB, confirmed against
// the live API — a request over that limit can get its connection dropped
// mid-upload, which surfaces to the app as a generic network failure rather
// than a clean error).
const MAX_IMAGE_WIDTH = 400;

const DS = {
  bg:      '#F6F7FA',
  border:  '#EAECEF',
  primary: '#CC2200',
  text2:   '#5A6272',
  text3:   '#9BA3AF',
};

interface CategoryImagePickerProps {
  uri: string | null;
  onPick: (uri: string) => void;
  uploading?: boolean;
  size?: number;
}

export default function CategoryImagePicker({ uri, onPick, uploading, size = 88 }: CategoryImagePickerProps) {
  const [requesting, setRequesting] = useState(false);
  const press    = useRef(new Animated.Value(1)).current;
  const badgePop = useRef(new Animated.Value(1)).current;

  // Small celebratory "pop" on the badge whenever a photo is freshly picked,
  // so the pick registers as an obvious success rather than a silent swap.
  useEffect(() => {
    if (uri) {
      badgePop.setValue(0.4);
      Animated.spring(badgePop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 140 }).start();
    }
  }, [uri, badgePop]);

  const handlePressIn = () => {
    if (uploading || requesting) return;
    Animated.spring(press, { toValue: 0.92, useNativeDriver: true, speed: 50, bounciness: 6 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 9 }).start();
  };

  const pick = async () => {
    if (uploading || requesting) return;
    try {
      setRequesting(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Allow photo library access to set a category image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        // Always resize (not just when already above the cap) — a busy/detailed
        // photo can still produce a large JPEG at its native crop resolution
        // even when that resolution itself isn't that high.
        const targetWidth = Math.min(asset.width, MAX_IMAGE_WIDTH);
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

  const dim = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ transform: [{ scale: press }] }}>
        <TouchableOpacity
          style={[styles.circle, dim]}
          onPress={pick}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.85}
          disabled={uploading || requesting}
        >
          {uri ? (
            <Image source={{ uri }} style={[styles.image, dim]} resizeMode="cover" />
          ) : (
            <View style={[styles.placeholder, dim]}>
              <Ionicons name="image-outline" size={size * 0.34} color={DS.text3} />
            </View>
          )}

          {(uploading || requesting) && (
            <View style={[styles.overlay, dim]}>
              <ActivityIndicator color="#fff" />
            </View>
          )}

          {!uploading && !requesting && (
            <Animated.View style={[styles.editBadge, { transform: [{ scale: badgePop }] }]}>
              <Ionicons name={uri ? 'camera' : 'add'} size={13} color="#fff" />
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.hint}>{uri ? 'Change photo' : 'Add category photo'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  circle: {
    backgroundColor: DS.bg,
    borderWidth: 1.5,
    borderColor: DS.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {},
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 0, left: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: DS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  hint: { fontSize: 12, fontWeight: '600', color: DS.text2 },
});
