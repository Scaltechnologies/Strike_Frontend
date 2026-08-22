// src/components/FadeIn.tsx
// Cross-fades content in on mount instead of the instant pop you get from a
// plain conditional-render swap. Wrap whichever branch of a loading/error/
// loaded ternary is currently showing — each branch mount fades in fresh.

import { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeInProps {
  children: React.ReactNode;
  style?: ViewStyle;
  duration?: number;
}

export default function FadeIn({ children, style, duration = 220 }: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }).start();
  }, [opacity, duration]);

  return (
    <Animated.View style={[{ opacity }, style]}>
      {children}
    </Animated.View>
  );
}
