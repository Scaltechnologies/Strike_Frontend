// src/modules/menu/components/VegNonVegBadge.tsx
// Standard square-with-dot / square-with-triangle veg/non-veg indicator, the
// convention used across Indian food apps — replaces plain "Veg"/"Non-Veg" text.

import { View, StyleSheet } from 'react-native';
import Text from '../../../components/Text';

const VEG_COLOR     = '#0F8A3C';
const NON_VEG_COLOR = '#B8290A';

export default function VegNonVegBadge({
  type, size = 14, showLabel = false,
}: {
  type: 'VEG' | 'NON_VEG';
  size?: number;
  showLabel?: boolean;
}) {
  const color = type === 'VEG' ? VEG_COLOR : NON_VEG_COLOR;

  return (
    <View style={styles.row}>
      <View style={[styles.square, { width: size, height: size, borderColor: color }]}>
        {type === 'VEG' ? (
          <View
            style={[
              styles.dot,
              { width: size * 0.42, height: size * 0.42, borderRadius: size, backgroundColor: color },
            ]}
          />
        ) : (
          <View
            style={[
              styles.triangle,
              {
                borderLeftWidth: size * 0.26,
                borderRightWidth: size * 0.26,
                borderBottomWidth: size * 0.44,
                borderBottomColor: color,
              },
            ]}
          />
        )}
      </View>
      {showLabel && (
        <Text style={[styles.label, { color }]}>{type === 'VEG' ? 'Veg' : 'Non-Veg'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  square: {
    borderWidth: 1.5, borderRadius: 3,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dot: {},
  triangle: {
    width: 0, height: 0, backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  label: { fontSize: 11, fontWeight: '700' },
});
