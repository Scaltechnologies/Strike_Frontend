// src/modules/menu/components/ItemImagePicker.tsx
// Tap-to-pick square food photo for the Add/Edit Item form — a pick → crop
// → resize → compress pipeline sized and shaped for a food photo (rounded
// square, shown large) rather than a small circular category icon. Picking
// is local-only — the caller uploads once the item itself has an id (see
// useMenu.setItemImage). Category images are master data the vendor never
// uploads, so there is no category equivalent of this component here.

import { useState, useRef } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../../components/Text';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

// Shown large (full-width hero-ish block) unlike the category icon, so it
// can hold more detail — still well under the backend's ~1MB upload cap.
const MAX_IMAGE_WIDTH = 800;

const DS = {
  bg:      '#F6F7FA',
  border:  '#EAECEF',
  primary: '#CC2200',
  text2:   '#5A6272',
  text3:   '#9BA3AF',
};

interface ItemImagePickerProps {
  uri: string | null;
  onPick: (uri: string) => void;
  uploading?: boolean;
}

export default function ItemImagePicker({ uri, onPick, uploading }: ItemImagePickerProps) {
  const [requesting, setRequesting] = useState(false);
  const press = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (uploading || requesting) return;
    Animated.spring(press, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 6 }).start();
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
        Alert.alert('Permission Needed', 'Allow photo library access to add a food photo.');
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
        const targetWidth = Math.min(asset.width, MAX_IMAGE_WIDTH);
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: targetWidth } }],
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
    <Animated.View style={{ transform: [{ scale: press }] }}>
      <TouchableOpacity
        style={styles.box}
        onPress={pick}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        disabled={uploading || requesting}
        accessibilityLabel={uri ? 'Change food photo' : 'Add food photo'}
        accessibilityRole="button"
      >
        {uri ? (
          <Image source={{ uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIconWrap}>
              <Ionicons name="camera-outline" size={26} color={DS.primary} />
            </View>
            <Text style={styles.placeholderText}>Add food photo</Text>
            <Text style={styles.placeholderHint}>Optional, but items with photos get more orders</Text>
          </View>
        )}

        {(uploading || requesting) && (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}

        {!!uri && !uploading && !requesting && (
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={13} color="#fff" />
            <Text style={styles.editBadgeText}>Change</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%', height: 160, borderRadius: 16,
    backgroundColor: DS.bg, borderWidth: 1.5, borderColor: DS.border, borderStyle: 'dashed',
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 20 },
  placeholderIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF0EE', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  placeholderText: { fontSize: 13.5, fontWeight: '700', color: DS.text2 },
  placeholderHint: { fontSize: 11.5, color: DS.text3, textAlign: 'center' },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute', right: 10, bottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(20,20,20,0.65)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  editBadgeText: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
});
