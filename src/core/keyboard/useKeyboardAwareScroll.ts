// src/core/keyboard/useKeyboardAwareScroll.ts
//
// Keeps the focused TextInput visible above the keyboard inside a ScrollView.
//
// Why: the app runs edge-to-edge on Android (Expo SDK 56), where the window is
// NOT shrunk when the keyboard opens, so `softwareKeyboardLayoutMode: resize`
// and KeyboardAvoidingView(behavior=undefined) leave fields under the keyboard.
// This works whether or not the window resizes:
//   1. `keyboardSpace` — render it as bottom spacer inside the ScrollView
//      content, so there is always room to scroll the last field up.
//   2. On keyboard show, and on every input focus, the focused input is
//      measured and the ScrollView scrolled just enough to clear the keyboard.
//
// Usage:
//   const kb = useKeyboardAwareScroll();
//   <ScrollView ref={kb.scrollRef} onScroll={kb.onScroll} scrollEventThrottle={16}>
//     …<TextInput onFocus={() => kb.ensureVisible()} />…
//     <View style={{ height: kb.keyboardSpace }} />
//   </ScrollView>

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard, Platform, TextInput,
  type ScrollView, type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';

// Gap kept between the bottom of the focused field and the top of the keyboard.
const DEFAULT_GAP = 24;

export function useKeyboardAwareScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const offsetY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const [keyboardSpace, setKeyboardSpace] = useState(0);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = e.nativeEvent.contentOffset.y;
  }, []);

  // `extraBelow` keeps that much more room under the field visible (e.g. the
  // password rules list under "New password").
  const ensureVisible = useCallback((extraBelow = 0) => {
    // Let focus/layout (and the spacer) settle first.
    setTimeout(() => {
      const kbTop = keyboardTop.current;
      const input = TextInput.State.currentlyFocusedInput?.();
      if (kbTop == null || !input || !scrollRef.current) return;
      input.measureInWindow((_x, y, _w, h) => {
        const overlap = y + h + DEFAULT_GAP + extraBelow - kbTop;
        if (overlap > 0) {
          scrollRef.current?.scrollTo({ y: offsetY.current + overlap, animated: true });
        }
      });
    }, Platform.OS === 'android' ? 120 : 60);
  }, []);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, e => {
      keyboardTop.current = e.endCoordinates.screenY;
      setKeyboardSpace(e.endCoordinates.height);
      ensureVisible();
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      keyboardTop.current = null;
      setKeyboardSpace(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, [ensureVisible]);

  return { scrollRef, onScroll, ensureVisible, keyboardSpace, scrollEventThrottle: 16 as const };
}
