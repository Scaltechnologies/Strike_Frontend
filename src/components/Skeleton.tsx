// src/components/Skeleton.tsx
// Shared shimmering placeholder block, used by every tab's loading state so
// "loading" reads as one alive, modern pattern instead of each screen having
// its own static gray rectangle.

import { useEffect, useRef } from 'react';
import { Animated, DimensionValue, ViewStyle } from 'react-native';

interface SkeletonBlockProps {
  w: DimensionValue;
  h: number;
  radius?: number;
  color?: string;
  style?: ViewStyle;
}

export function SkeletonBlock({ w, h, radius = 8, color = '#E4E7EC', style }: SkeletonBlockProps) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width: w, height: h, borderRadius: radius, backgroundColor: color, opacity: pulse },
        style,
      ]}
    />
  );
}

export default SkeletonBlock;
